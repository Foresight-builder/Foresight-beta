// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/utils/cryptography/EIP712Upgradeable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";
import "../interfaces/IMarket.sol";
import "../interfaces/IOracle.sol";
import "../tokens/OutcomeToken1155.sol";

interface IOracleRegistrar {
    function registerMarket(bytes32 marketId, uint64 resolutionTime, uint8 outcomeCount) external;
}

/**
 * @notice Off-chain orderbook settlement market (no on-chain order storage / matching).
 * - Orders are EIP-712 signed by makers off-chain.
 * - Taker (msg.sender) submits fills on-chain (batchFill) to settle atomically.
 *
 * Pricing convention (USDC 6 decimals):
 * - amount is `amount18` (1e18 = 1 share)
 * - price is `price6Per1e18` (USDC base units per 1e18 share)
 * - cost6 = amount18 * price6Per1e18 / 1e18
 *
 * Fees: trading fee is not charged (per your requirement). Events include fee=0 for compatibility.
 * Invalid resolution: direct INVALID, no fee, users exit via complete set redemption.
 */
abstract contract OffchainMarketBase is
    IMarket,
    ReentrancyGuard,
    Initializable,
    ERC1155Holder,
    EIP712Upgradeable
{
    using SafeERC20 for IERC20;

    // --- Units (align with frontend & relayer) ---
    uint256 internal constant SHARE_SCALE = 1e18; // shares are 18 decimals
    uint256 internal constant USDC_SCALE = 1e6; // USDC base units
    uint256 internal constant MAX_PRICE_6_PER_1E18 = 1e6; // 1 USDC max per share (binary & multi)
    uint256 internal constant SHARE_GRANULARITY = 1e12; // enforce 6-decimal share steps (so USDC conversions are exact)

    enum State {
        TRADING,
        RESOLVED,
        INVALID
    }

    bytes32 public marketId;
    address public factory;
    address public creator;
    IERC20 public collateral; // USDC
    address public oracle; // UMA adapter (IOracle)
    uint256 public resolutionTime;

    OutcomeToken1155 public outcomeToken;
    uint8 public outcomeCount; // 2..8

    State public state;
    uint8 public resolvedOutcome; // valid iff state==RESOLVED

    // maker => salt => filled amount18
    mapping(address => mapping(uint256 => uint256)) public filledBySalt;
    // maker => salt => canceled
    mapping(address => mapping(uint256 => bool)) public canceledSalt;

    // Matches frontend/relayer ORDER_TYPES ordering: salt, expiry (see apps/web/src/types/market.ts)
    bytes32 public constant ORDER_TYPEHASH =
        keccak256(
            "Order(address maker,uint256 outcomeIndex,bool isBuy,uint256 price,uint256 amount,uint256 salt,uint256 expiry)"
        );
    bytes32 public constant CANCEL_SALT_TYPEHASH =
        keccak256("CancelSaltRequest(address maker,uint256 salt)");

    struct Order {
        address maker;
        uint256 outcomeIndex;
        bool isBuy;
        uint256 price; // USDC base units per 1e18 share
        uint256 amount; // amount18
        uint256 salt;
        uint256 expiry; // 0 means no expiry
    }

    event Initialized(bytes32 indexed marketId, address factory, address creator, address collateral, address oracle, uint256 resolutionTime, address outcome1155, uint8 outcomeCount);
    event OrderFilledSigned(address maker, address taker, uint256 outcomeIndex, bool isBuy, uint256 price, uint256 amount, uint256 fee, uint256 salt);
    event OrderSaltCanceled(address maker, uint256 salt);
    event Resolved(uint256 outcomeIndex);
    event Invalidated();

    error InvalidOutcomeIndex();
    error InvalidState();
    error ResolutionTimeNotReached();
    error AlreadyFinalized();
    error InvalidExpiry();
    error InvalidAmount();
    error InvalidPrice();
    error InvalidSignedRequest();
    error OrderCanceled();
    error NoMinterRole();
    error NotApproved1155();
    error FeeNotSupported();
    error InvalidShareGranularity();

    modifier inState(State s) {
        if (state != s) revert InvalidState();
        _;
    }

    /// @notice Computes the outcome token id for this market/outcome.
    /// @dev Matches OutcomeToken1155.computeTokenId(address,uint256) but avoids an external call.
    function outcomeTokenId(uint256 outcomeIndex) public view returns (uint256) {
        return (uint256(uint160(address(this))) << 32) | outcomeIndex;
    }

    function _initCommon(
        bytes32 _marketId,
        address _factory,
        address _creator,
        address _collateralToken,
        address _oracle,
        uint256 _resolutionTime,
        address outcome1155,
        uint8 oc
    ) internal initializer {
        __EIP712_init("Foresight Market", "1");

        require(_factory != address(0) && _creator != address(0), "bad actors");
        require(_collateralToken != address(0) && _oracle != address(0), "bad addrs");
        require(outcome1155 != address(0), "outcome1155=0");
        require(_resolutionTime > block.timestamp, "resolution in past");
        require(oc >= 2 && oc <= 8, "outcomes range");

        marketId = _marketId;
        factory = _factory;
        creator = _creator;
        collateral = IERC20(_collateralToken);
        oracle = _oracle;
        resolutionTime = _resolutionTime;
        outcomeToken = OutcomeToken1155(outcome1155);
        outcomeCount = oc;

        state = State.TRADING;

        // Optional: register the market with oracle adapter (Polymarket-style gating).
        // If oracle doesn't support registration, ignore.
        try IOracleRegistrar(_oracle).registerMarket(_marketId, uint64(_resolutionTime), oc) {
            // ok
        } catch {
            // ignore
        }

        emit Initialized(_marketId, _factory, _creator, _collateralToken, _oracle, _resolutionTime, outcome1155, oc);
    }

    function domainSeparatorV4() external view returns (bytes32) {
        return _domainSeparatorV4();
    }

    function cancelSaltSigned(address maker, uint256 salt, bytes calldata signature) external nonReentrant inState(State.TRADING) {
        if (canceledSalt[maker][salt]) revert OrderCanceled();
        bytes32 structHash = keccak256(abi.encode(CANCEL_SALT_TYPEHASH, maker, salt));
        bytes32 digest = _hashTypedDataV4(structHash);
        address recovered = ECDSA.recover(digest, signature);
        if (recovered != maker) revert InvalidSignedRequest();
        canceledSalt[maker][salt] = true;
        emit OrderSaltCanceled(maker, salt);
    }

    /**
     * @notice Batch settle signed orders. Taker is msg.sender.
     * @dev orders/sigs/fillAmounts arrays must have same length.
     */
    function batchFill(
        Order[] calldata orders,
        bytes[] calldata signatures,
        uint256[] calldata fillAmounts
    ) external nonReentrant inState(State.TRADING) {
        uint256 n = orders.length;
        require(n == signatures.length && n == fillAmounts.length, "len mismatch");
        for (uint256 i = 0; i < n; i++) {
            _fillOne(orders[i], signatures[i], fillAmounts[i]);
        }
    }

    function fillOrderSigned(Order calldata order, bytes calldata signature, uint256 fillAmount) external nonReentrant inState(State.TRADING) {
        _fillOne(order, signature, fillAmount);
    }

    function _fillOne(Order calldata o, bytes calldata signature, uint256 fillAmount) internal {
        if (o.outcomeIndex >= uint256(outcomeCount)) revert InvalidOutcomeIndex();
        if (o.price == 0 || o.price > MAX_PRICE_6_PER_1E18) revert InvalidPrice();
        if (o.amount == 0 || fillAmount == 0) revert InvalidAmount();
        // Require share amounts be multiples of 1e12 so cost6 is exact in USDC base units.
        if (fillAmount % SHARE_GRANULARITY != 0) revert InvalidShareGranularity();
        if (o.expiry != 0 && o.expiry <= block.timestamp) revert InvalidExpiry();
        if (canceledSalt[o.maker][o.salt]) revert OrderCanceled();

        uint256 alreadyFilled = filledBySalt[o.maker][o.salt];
        if (alreadyFilled + fillAmount > o.amount) revert InvalidAmount();

        bytes32 structHash = keccak256(
            abi.encode(
                ORDER_TYPEHASH,
                o.maker,
                o.outcomeIndex,
                o.isBuy,
                o.price,
                o.amount,
                o.salt,
                o.expiry
            )
        );
        bytes32 digest = _hashTypedDataV4(structHash);
        address recovered = ECDSA.recover(digest, signature);
        if (recovered != o.maker) revert InvalidSignedRequest();

        filledBySalt[o.maker][o.salt] = alreadyFilled + fillAmount;

        // cost6 = amount18 * price6Per1e18 / 1e18
        uint256 cost6 = Math.mulDiv(fillAmount, o.price, SHARE_SCALE);
        uint256 tokenId = outcomeTokenId(o.outcomeIndex);

        if (o.isBuy) {
            // maker buys outcome tokens; taker sells tokens and receives USDC
            if (!outcomeToken.isApprovedForAll(msg.sender, address(this))) revert NotApproved1155();
            collateral.safeTransferFrom(o.maker, msg.sender, cost6);
            outcomeToken.safeTransferFrom(msg.sender, o.maker, tokenId, fillAmount, "");
        } else {
            // maker sells outcome tokens; taker buys tokens and pays USDC
            if (!outcomeToken.isApprovedForAll(o.maker, address(this))) revert NotApproved1155();
            collateral.safeTransferFrom(msg.sender, o.maker, cost6);
            outcomeToken.safeTransferFrom(o.maker, msg.sender, tokenId, fillAmount, "");
        }

        emit OrderFilledSigned(o.maker, msg.sender, o.outcomeIndex, o.isBuy, o.price, fillAmount, 0, o.salt);
    }

    // -------------------------
    // Complete set / redemption
    // -------------------------

    function mintCompleteSet(uint256 amount18) external nonReentrant inState(State.TRADING) {
        if (amount18 == 0) revert InvalidAmount();
        if (amount18 % SHARE_GRANULARITY != 0) revert InvalidShareGranularity();
        if (!outcomeToken.hasRole(outcomeToken.MINTER_ROLE(), address(this))) revert NoMinterRole();
        // USDC deposit = amount18 * 1e6 / 1e18
        uint256 deposit6 = Math.mulDiv(amount18, USDC_SCALE, SHARE_SCALE);
        collateral.safeTransferFrom(msg.sender, address(this), deposit6);

        uint256[] memory ids = new uint256[](uint256(outcomeCount));
        uint256[] memory amts = new uint256[](uint256(outcomeCount));
        for (uint256 i = 0; i < uint256(outcomeCount); i++) {
            ids[i] = outcomeTokenId(i);
            amts[i] = amount18;
        }
        outcomeToken.mintBatch(msg.sender, ids, amts);
    }

    function redeem(uint256 amount18) external nonReentrant inState(State.RESOLVED) {
        if (amount18 == 0) revert InvalidAmount();
        if (amount18 % SHARE_GRANULARITY != 0) revert InvalidShareGranularity();
        if (!outcomeToken.hasRole(outcomeToken.MINTER_ROLE(), address(this))) revert NoMinterRole();
        uint256 idWin = outcomeTokenId(resolvedOutcome);
        outcomeToken.burn(msg.sender, idWin, amount18);
        uint256 payout6 = Math.mulDiv(amount18, USDC_SCALE, SHARE_SCALE);
        collateral.safeTransfer(msg.sender, payout6);
    }

    function redeemCompleteSetOnInvalid(uint256 amount18PerOutcome) external nonReentrant inState(State.INVALID) {
        if (amount18PerOutcome == 0) revert InvalidAmount();
        if (amount18PerOutcome % SHARE_GRANULARITY != 0) revert InvalidShareGranularity();
        if (!outcomeToken.hasRole(outcomeToken.MINTER_ROLE(), address(this))) revert NoMinterRole();

        uint256[] memory ids = new uint256[](uint256(outcomeCount));
        uint256[] memory amts = new uint256[](uint256(outcomeCount));
        for (uint256 i = 0; i < uint256(outcomeCount); i++) {
            ids[i] = outcomeTokenId(i);
            amts[i] = amount18PerOutcome;
        }
        outcomeToken.burnBatch(msg.sender, ids, amts);

        uint256 payout6 = Math.mulDiv(amount18PerOutcome, USDC_SCALE, SHARE_SCALE);
        collateral.safeTransfer(msg.sender, payout6);
    }

    // -------------------------
    // Resolution
    // -------------------------

    /**
     * @notice Permissionless resolution. After `resolutionTime`, anyone can finalize to RESOLVED or INVALID.
     * @dev Oracle adapter should revert if not finalized; return type(uint256).max on invalid.
     */
    function resolve() external inState(State.TRADING) {
        if (block.timestamp < resolutionTime) revert ResolutionTimeNotReached();
        if (state != State.TRADING) revert AlreadyFinalized();

        uint256 outcome = IOracle(oracle).getOutcome(marketId);
        if (outcome == type(uint256).max) {
            state = State.INVALID;
            emit Invalidated();
            return;
        }
        if (outcome >= uint256(outcomeCount)) {
            // Defensive: if oracle returns an out-of-range index, treat as invalid.
            state = State.INVALID;
            emit Invalidated();
            return;
        }
        resolvedOutcome = uint8(outcome);
        state = State.RESOLVED;
        emit Resolved(outcome);
    }
}



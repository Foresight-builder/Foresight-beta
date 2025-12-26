// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/utils/cryptography/EIP712Upgradeable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/interfaces/IERC1271.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";
import "../interfaces/IMarket.sol";
import "../interfaces/IOracle.sol";
import "../interfaces/IOracleRegistrar.sol";
import "../tokens/OutcomeToken1155.sol";

/// @title OffchainMarketBase
/// @author Foresight
/// @notice Off-chain orderbook settlement market (no on-chain order storage / matching).
/// @dev Orders are EIP-712 signed by makers off-chain. Taker (msg.sender) submits fills
///      on-chain (batchFill) to settle atomically.
///
///      Pricing convention (USDC 6 decimals):
///      - amount is `amount18` (1e18 = 1 share)
///      - price is `price6Per1e18` (USDC base units per 1e18 share)
///      - cost6 = amount18 * price6Per1e18 / 1e18
///
///      Fees: trading fee is not charged. Events include fee=0 for compatibility.
///      Invalid resolution: direct INVALID, no fee, users exit via complete set redemption.
/// @custom:security-contact security@foresight.io
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

    // --- Outcome constraints ---
    uint8 internal constant MIN_OUTCOMES = 2; // binary market minimum
    uint8 internal constant MAX_OUTCOMES = 8; // multi-outcome market maximum

    // --- ERC-1271 magic value ---
    bytes4 internal constant ERC1271_MAGIC_VALUE = 0x1626ba7e;

    enum State {
        TRADING,
        RESOLVED,
        INVALID
    }

    // --- Packed storage slot 1 ---
    bytes32 public marketId;

    // --- Packed storage slot 2 (addresses) ---
    address public factory;

    // --- Packed storage slot 3 ---
    address public creator;

    // --- Packed storage slot 4 ---
    IERC20 public collateral; // USDC

    // --- Packed storage slot 5 ---
    address public oracle; // UMA adapter (IOracle)

    // --- Packed storage slot 6 ---
    uint256 public resolutionTime;

    // --- Packed storage slot 7 ---
    OutcomeToken1155 public outcomeToken;

    // --- Packed storage slot 8 (small values packed together) ---
    uint8 public outcomeCount; // 2..8
    State public state;
    uint8 public resolvedOutcome; // valid iff state==RESOLVED
    bool public paused; // Circuit breaker

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

    // --- Events (indexed for efficient querying) ---
    event Initialized(bytes32 indexed marketId, address factory, address creator, address collateral, address oracle, uint256 resolutionTime, address outcome1155, uint8 outcomeCount);
    event OrderFilledSigned(address indexed maker, address indexed taker, uint256 indexed outcomeIndex, bool isBuy, uint256 price, uint256 amount, uint256 fee, uint256 salt);
    event OrderSaltCanceled(address indexed maker, uint256 salt);
    event Resolved(uint256 indexed outcomeIndex);
    event Invalidated();
    event Paused(address indexed by);
    event Unpaused(address indexed by);
    event CompleteSetMinted(address indexed user, uint256 amount18);
    event Redeemed(address indexed user, uint256 amount18, uint8 outcomeIndex);
    event CompleteSetRedeemedOnInvalid(address indexed user, uint256 amount18PerOutcome);

    // --- Errors ---
    error InvalidOutcomeIndex();
    error InvalidState();
    error ResolutionTimeNotReached();
    error InvalidExpiry();
    error InvalidAmount();
    error InvalidPrice();
    error InvalidSignedRequest();
    error OrderCanceled();
    error NoMinterRole();
    error NotApproved1155();
    error FeeNotSupported();
    error InvalidShareGranularity();
    error MarketPaused();
    error NotAuthorized();
    error ArrayLengthMismatch();

    // --- Modifiers ---
    modifier inState(State s) {
        if (state != s) revert InvalidState();
        _;
    }

    modifier whenNotPaused() {
        if (paused) revert MarketPaused();
        _;
    }

    modifier onlyFactoryOrCreator() {
        if (msg.sender != factory && msg.sender != creator) revert NotAuthorized();
        _;
    }

    // -------------------------
    // Circuit Breaker (Pause)
    // -------------------------

    /// @notice Pauses the market. Only callable by factory or creator.
    /// @dev When paused, batchFill, fillOrderSigned, and mintCompleteSet are disabled.
    function pause() external onlyFactoryOrCreator {
        paused = true;
        emit Paused(msg.sender);
    }

    /// @notice Unpauses the market. Only callable by factory or creator.
    function unpause() external onlyFactoryOrCreator {
        paused = false;
        emit Unpaused(msg.sender);
    }

    // -------------------------
    // Token ID computation
    // -------------------------

    /// @notice Computes the outcome token id for this market/outcome (with bounds check).
    /// @dev Matches OutcomeToken1155.computeTokenId(address,uint256) but avoids an external call.
    /// @param outcomeIndex The outcome index (0 to outcomeCount-1).
    /// @return The unique token ID for this market/outcome combination.
    function outcomeTokenId(uint256 outcomeIndex) public view returns (uint256) {
        if (outcomeIndex >= uint256(outcomeCount)) revert InvalidOutcomeIndex();
        return _outcomeTokenIdUnchecked(outcomeIndex);
    }

    /// @dev Internal unchecked version for loops where bounds are already verified.
    function _outcomeTokenIdUnchecked(uint256 outcomeIndex) internal view returns (uint256) {
        return (uint256(uint160(address(this))) << 32) | outcomeIndex;
    }

    // -------------------------
    // Initialization
    // -------------------------

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
        require(oc >= MIN_OUTCOMES && oc <= MAX_OUTCOMES, "outcomes range");

        marketId = _marketId;
        factory = _factory;
        creator = _creator;
        collateral = IERC20(_collateralToken);
        oracle = _oracle;
        resolutionTime = _resolutionTime;
        outcomeToken = OutcomeToken1155(outcome1155);
        outcomeCount = oc;

        state = State.TRADING;
        paused = false;

        // Optional: register the market with oracle adapter (Polymarket-style gating).
        // If oracle doesn't support registration, ignore.
        try IOracleRegistrar(_oracle).registerMarket(_marketId, uint64(_resolutionTime), oc) {
            // ok
        } catch {
            // ignore
        }

        emit Initialized(_marketId, _factory, _creator, _collateralToken, _oracle, _resolutionTime, outcome1155, oc);
    }

    // -------------------------
    // EIP-712 / Signature helpers
    // -------------------------

    /// @notice Returns the EIP-712 domain separator for signature verification.
    /// @return The domain separator bytes32.
    function domainSeparatorV4() external view returns (bytes32) {
        return _domainSeparatorV4();
    }

    /// @dev Validates signature for both EOA (ECDSA) and smart contract wallets (ERC-1271).
    /// @param signer The expected signer address.
    /// @param digest The EIP-712 typed data hash.
    /// @param signature The signature bytes.
    /// @return True if the signature is valid.
    function _isValidSignature(address signer, bytes32 digest, bytes calldata signature) internal view returns (bool) {
        if (signer.code.length > 0) {
            // Smart contract wallet (ERC-1271)
            try IERC1271(signer).isValidSignature(digest, signature) returns (bytes4 magicValue) {
                return magicValue == ERC1271_MAGIC_VALUE;
            } catch {
                return false;
            }
        } else {
            // EOA wallet
            return ECDSA.recover(digest, signature) == signer;
        }
    }

    // -------------------------
    // Order cancellation
    // -------------------------

    /// @notice Cancels all orders with a specific salt for a maker.
    /// @dev Requires EIP-712 signature from the maker. Supports EOA and ERC-1271.
    /// @param maker The address of the order maker.
    /// @param salt The salt value to cancel.
    /// @param signature EIP-712 signature from the maker.
    function cancelSaltSigned(address maker, uint256 salt, bytes calldata signature) external nonReentrant inState(State.TRADING) {
        if (canceledSalt[maker][salt]) revert OrderCanceled();
        bytes32 structHash = keccak256(abi.encode(CANCEL_SALT_TYPEHASH, maker, salt));
        bytes32 digest = _hashTypedDataV4(structHash);
        if (!_isValidSignature(maker, digest, signature)) revert InvalidSignedRequest();
        canceledSalt[maker][salt] = true;
        emit OrderSaltCanceled(maker, salt);
    }

    /// @notice Batch cancel multiple salts for multiple makers.
    /// @dev Each entry requires a valid signature. Supports EOA and ERC-1271.
    /// @param makers Array of maker addresses.
    /// @param salts Array of salt values to cancel.
    /// @param signatures Array of EIP-712 signatures.
    function cancelSaltsBatch(
        address[] calldata makers,
        uint256[] calldata salts,
        bytes[] calldata signatures
    ) external nonReentrant inState(State.TRADING) {
        uint256 n = makers.length;
        if (n != salts.length || n != signatures.length) revert ArrayLengthMismatch();
        
        for (uint256 i = 0; i < n; i++) {
            address maker = makers[i];
            uint256 salt = salts[i];
            if (canceledSalt[maker][salt]) continue; // Skip already canceled
            
            bytes32 structHash = keccak256(abi.encode(CANCEL_SALT_TYPEHASH, maker, salt));
            bytes32 digest = _hashTypedDataV4(structHash);
            if (!_isValidSignature(maker, digest, signatures[i])) continue; // Skip invalid
            
            canceledSalt[maker][salt] = true;
            emit OrderSaltCanceled(maker, salt);
        }
    }

    // -------------------------
    // Order filling
    // -------------------------

    /// @notice Batch settle signed orders. Taker is msg.sender.
    /// @dev All arrays must have the same length. Each order is settled independently.
    /// @param orders Array of Order structs containing maker, outcomeIndex, isBuy, price, amount, salt, expiry.
    /// @param signatures Array of EIP-712 signatures from each order's maker.
    /// @param fillAmounts Array of amounts to fill for each order (in 1e18 share units).
    function batchFill(
        Order[] calldata orders,
        bytes[] calldata signatures,
        uint256[] calldata fillAmounts
    ) external nonReentrant inState(State.TRADING) whenNotPaused {
        uint256 n = orders.length;
        if (n != signatures.length || n != fillAmounts.length) revert ArrayLengthMismatch();
        for (uint256 i = 0; i < n; i++) {
            _fillOne(orders[i], signatures[i], fillAmounts[i]);
        }
    }

    /// @notice Settle a single signed order. Taker is msg.sender.
    /// @param order The Order struct containing maker, outcomeIndex, isBuy, price, amount, salt, expiry.
    /// @param signature EIP-712 signature from the order's maker.
    /// @param fillAmount Amount to fill (in 1e18 share units, must be multiple of SHARE_GRANULARITY).
    function fillOrderSigned(Order calldata order, bytes calldata signature, uint256 fillAmount) external nonReentrant inState(State.TRADING) whenNotPaused {
        _fillOne(order, signature, fillAmount);
    }

    function _fillOne(Order calldata o, bytes calldata signature, uint256 fillAmount) internal {
        if (o.outcomeIndex >= uint256(outcomeCount)) revert InvalidOutcomeIndex();
        if (o.price == 0 || o.price > MAX_PRICE_6_PER_1E18) revert InvalidPrice();
        if (o.amount == 0 || fillAmount == 0) revert InvalidAmount();
        // Validate order amount precision
        if (o.amount % SHARE_GRANULARITY != 0) revert InvalidShareGranularity();
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
        if (!_isValidSignature(o.maker, digest, signature)) revert InvalidSignedRequest();

        filledBySalt[o.maker][o.salt] = alreadyFilled + fillAmount;

        // cost6 = amount18 * price6Per1e18 / 1e18
        uint256 cost6 = Math.mulDiv(fillAmount, o.price, SHARE_SCALE);
        // outcomeIndex already validated above, use unchecked
        uint256 tokenId = _outcomeTokenIdUnchecked(o.outcomeIndex);

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

    /// @notice Mint a complete set of outcome tokens by depositing collateral.
    /// @dev User deposits USDC and receives equal amounts of all outcome tokens.
    ///      amount18 must be a multiple of SHARE_GRANULARITY (1e12).
    /// @param amount18 Amount of each outcome token to mint (1e18 = 1 share).
    function mintCompleteSet(uint256 amount18) external nonReentrant inState(State.TRADING) whenNotPaused {
        if (amount18 == 0) revert InvalidAmount();
        if (amount18 % SHARE_GRANULARITY != 0) revert InvalidShareGranularity();
        if (!outcomeToken.hasRole(outcomeToken.MINTER_ROLE(), address(this))) revert NoMinterRole();
        // USDC deposit = amount18 * 1e6 / 1e18
        uint256 deposit6 = Math.mulDiv(amount18, USDC_SCALE, SHARE_SCALE);
        collateral.safeTransferFrom(msg.sender, address(this), deposit6);

        uint256[] memory ids = new uint256[](uint256(outcomeCount));
        uint256[] memory amts = new uint256[](uint256(outcomeCount));
        for (uint256 i = 0; i < uint256(outcomeCount); i++) {
            ids[i] = _outcomeTokenIdUnchecked(i);
            amts[i] = amount18;
        }
        outcomeToken.mintBatch(msg.sender, ids, amts);
        
        emit CompleteSetMinted(msg.sender, amount18);
    }

    /// @notice Redeem winning outcome tokens for collateral after market resolution.
    /// @dev Only callable when state == RESOLVED. Burns winning tokens and pays out USDC.
    /// @param amount18 Amount of winning outcome tokens to redeem (1e18 = 1 share).
    function redeem(uint256 amount18) external nonReentrant inState(State.RESOLVED) {
        if (amount18 == 0) revert InvalidAmount();
        if (amount18 % SHARE_GRANULARITY != 0) revert InvalidShareGranularity();
        if (!outcomeToken.hasRole(outcomeToken.MINTER_ROLE(), address(this))) revert NoMinterRole();
        // resolvedOutcome is always < outcomeCount, use unchecked
        uint256 idWin = _outcomeTokenIdUnchecked(resolvedOutcome);
        outcomeToken.burn(msg.sender, idWin, amount18);
        uint256 payout6 = Math.mulDiv(amount18, USDC_SCALE, SHARE_SCALE);
        collateral.safeTransfer(msg.sender, payout6);
        
        emit Redeemed(msg.sender, amount18, resolvedOutcome);
    }

    /// @notice Redeem a complete set of outcome tokens when market is INVALID.
    /// @dev Only callable when state == INVALID. Burns equal amounts of all outcome tokens
    ///      and returns the original collateral (no fees charged on invalid markets).
    /// @param amount18PerOutcome Amount of each outcome token to burn (1e18 = 1 share).
    function redeemCompleteSetOnInvalid(uint256 amount18PerOutcome) external nonReentrant inState(State.INVALID) {
        if (amount18PerOutcome == 0) revert InvalidAmount();
        if (amount18PerOutcome % SHARE_GRANULARITY != 0) revert InvalidShareGranularity();
        if (!outcomeToken.hasRole(outcomeToken.MINTER_ROLE(), address(this))) revert NoMinterRole();

        uint256[] memory ids = new uint256[](uint256(outcomeCount));
        uint256[] memory amts = new uint256[](uint256(outcomeCount));
        for (uint256 i = 0; i < uint256(outcomeCount); i++) {
            ids[i] = _outcomeTokenIdUnchecked(i);
            amts[i] = amount18PerOutcome;
        }
        outcomeToken.burnBatch(msg.sender, ids, amts);

        uint256 payout6 = Math.mulDiv(amount18PerOutcome, USDC_SCALE, SHARE_SCALE);
        collateral.safeTransfer(msg.sender, payout6);
        
        emit CompleteSetRedeemedOnInvalid(msg.sender, amount18PerOutcome);
    }

    // -------------------------
    // Resolution
    // -------------------------

    /// @notice Permissionless resolution. After `resolutionTime`, anyone can finalize to RESOLVED or INVALID.
    /// @dev Oracle adapter should revert if not finalized; return type(uint256).max on invalid.
    ///      The inState modifier already ensures state == TRADING, so no redundant check needed.
    function resolve() external inState(State.TRADING) {
        if (block.timestamp < resolutionTime) revert ResolutionTimeNotReached();

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

    // -------------------------
    // View helpers
    // -------------------------

    /// @notice Get complete market information in a single call.
    /// @return id Market ID
    /// @return currentState Current market state (TRADING, RESOLVED, INVALID)
    /// @return winningOutcome Resolved outcome index (only valid if state == RESOLVED)
    /// @return numOutcomes Number of possible outcomes
    /// @return resolution Resolution timestamp
    /// @return collateralToken Collateral token address (USDC)
    /// @return isPaused Whether the market is paused
    function getMarketInfo() external view returns (
        bytes32 id,
        State currentState,
        uint8 winningOutcome,
        uint8 numOutcomes,
        uint256 resolution,
        address collateralToken,
        bool isPaused
    ) {
        return (marketId, state, resolvedOutcome, outcomeCount, resolutionTime, address(collateral), paused);
    }

    /// @notice Query remaining fillable amount for an order.
    /// @param maker The order maker address.
    /// @param salt The order salt.
    /// @param orderAmount The original order amount.
    /// @return remaining The remaining fillable amount (0 if canceled).
    function getRemainingFillable(address maker, uint256 salt, uint256 orderAmount) external view returns (uint256 remaining) {
        if (canceledSalt[maker][salt]) return 0;
        uint256 filled = filledBySalt[maker][salt];
        return orderAmount > filled ? orderAmount - filled : 0;
    }

    /// @notice Get user's outcome token balances for this market.
    /// @param user The user address.
    /// @return balances Array of balances for each outcome.
    function getUserBalances(address user) external view returns (uint256[] memory balances) {
        balances = new uint256[](uint256(outcomeCount));
        for (uint256 i = 0; i < uint256(outcomeCount); i++) {
            balances[i] = outcomeToken.balanceOf(user, _outcomeTokenIdUnchecked(i));
        }
    }

    /// @notice Get all token IDs for this market's outcomes.
    /// @return ids Array of token IDs.
    function getOutcomeTokenIds() external view returns (uint256[] memory ids) {
        ids = new uint256[](uint256(outcomeCount));
        for (uint256 i = 0; i < uint256(outcomeCount); i++) {
            ids[i] = _outcomeTokenIdUnchecked(i);
        }
    }
}

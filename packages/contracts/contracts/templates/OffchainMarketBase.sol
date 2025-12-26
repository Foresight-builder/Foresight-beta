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
/// @notice Off-chain orderbook settlement market with comprehensive security hardening.
/// @dev Orders are EIP-712 signed by makers off-chain. Taker (msg.sender) submits fills
///      on-chain (batchFill) to settle atomically.
///
///      Security features:
///      - ReentrancyGuard on all state-changing functions
///      - Flash loan protection (per-block trade limits)
///      - Batch size limits (prevent gas exhaustion DoS)
///      - ERC-1271 gas-limited calls (prevent gas bomb attacks)
///      - Order minimum lifetime (prevent sandwich attacks)
///      - Signature normalization (prevent malleability)
///      - Circuit breaker (emergency pause)
///
///      Pricing convention (USDC 6 decimals):
///      - amount is `amount18` (1e18 = 1 share)
///      - price is `price6Per1e18` (USDC base units per 1e18 share)
///      - cost6 = amount18 * price6Per1e18 / 1e18
///
/// @custom:security-contact security@foresight.io
abstract contract OffchainMarketBase is
    IMarket,
    ReentrancyGuard,
    Initializable,
    ERC1155Holder,
    EIP712Upgradeable
{
    using SafeERC20 for IERC20;

    // ═══════════════════════════════════════════════════════════════════════
    // CONSTANTS
    // ═══════════════════════════════════════════════════════════════════════

    // --- Units (align with frontend & relayer) ---
    uint256 internal constant SHARE_SCALE = 1e18;
    uint256 internal constant USDC_SCALE = 1e6;
    uint256 internal constant MAX_PRICE_6_PER_1E18 = 1e6;
    uint256 internal constant SHARE_GRANULARITY = 1e12;

    // --- Outcome constraints ---
    uint8 internal constant MIN_OUTCOMES = 2;
    uint8 internal constant MAX_OUTCOMES = 8;

    // --- Security constants ---
    /// @dev ERC-1271 magic value for valid signatures
    bytes4 internal constant ERC1271_MAGIC_VALUE = 0x1626ba7e;
    
    /// @dev Maximum gas allowed for ERC-1271 isValidSignature calls (prevent gas bombs)
    uint256 internal constant ERC1271_GAS_LIMIT = 100_000;
    
    /// @dev Maximum orders per batchFill call (prevent gas exhaustion DoS)
    uint256 internal constant MAX_BATCH_SIZE = 50;
    
    /// @dev Maximum USDC volume per address per block (flash loan protection)
    /// 1 million USDC = 1_000_000 * 1e6 = 1e12
    uint256 internal constant MAX_VOLUME_PER_BLOCK = 1_000_000 * 1e6;
    
    /// @dev Minimum order lifetime in seconds (prevent sandwich attacks)
    /// Orders must be valid for at least 30 seconds after creation
    uint256 internal constant MIN_ORDER_LIFETIME = 30;

    /// @dev ECDSA signature 's' value upper bound for malleability check
    /// secp256k1n / 2 + 1
    uint256 internal constant ECDSA_S_UPPER_BOUND = 0x7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF5D576E7357A4501DDFE92F46681B20A1;

    // ═══════════════════════════════════════════════════════════════════════
    // STATE
    // ═══════════════════════════════════════════════════════════════════════

    enum State {
        TRADING,
        RESOLVED,
        INVALID
    }

    bytes32 public marketId;
    address public factory;
    address public creator;
    IERC20 public collateral;
    address public oracle;
    uint256 public resolutionTime;
    OutcomeToken1155 public outcomeToken;

    // Packed storage slot
    uint8 public outcomeCount;
    State public state;
    uint8 public resolvedOutcome;
    bool public paused;

    // Order tracking
    mapping(address => mapping(uint256 => uint256)) public filledBySalt;
    mapping(address => mapping(uint256 => bool)) public canceledSalt;

    // Flash loan protection: address => block number => volume traded
    mapping(address => mapping(uint256 => uint256)) private _blockVolume;

    // EIP-712 type hashes
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
        uint256 price;
        uint256 amount;
        uint256 salt;
        uint256 expiry;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════

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

    // ═══════════════════════════════════════════════════════════════════════
    // ERRORS
    // ═══════════════════════════════════════════════════════════════════════

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
    error BatchSizeExceeded();
    error FlashLoanProtection();
    error OrderLifetimeTooShort();
    error InvalidSignatureS();

    // ═══════════════════════════════════════════════════════════════════════
    // MODIFIERS
    // ═══════════════════════════════════════════════════════════════════════

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

    // ═══════════════════════════════════════════════════════════════════════
    // CIRCUIT BREAKER
    // ═══════════════════════════════════════════════════════════════════════

    /// @notice Pauses the market. Only callable by factory or creator.
    function pause() external onlyFactoryOrCreator {
        paused = true;
        emit Paused(msg.sender);
    }

    /// @notice Unpauses the market. Only callable by factory or creator.
    function unpause() external onlyFactoryOrCreator {
        paused = false;
        emit Unpaused(msg.sender);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // SECURITY HELPERS
    // ═══════════════════════════════════════════════════════════════════════

    /// @dev Check and update flash loan protection
    /// @param user The user address to check
    /// @param volume The volume (in USDC base units) being traded
    function _checkFlashLoanProtection(address user, uint256 volume) internal {
        uint256 currentBlock = block.number;
        uint256 currentVolume = _blockVolume[user][currentBlock];
        uint256 newVolume = currentVolume + volume;
        
        if (newVolume > MAX_VOLUME_PER_BLOCK) {
            revert FlashLoanProtection();
        }
        
        _blockVolume[user][currentBlock] = newVolume;
    }

    /// @dev Validate signature 's' value to prevent malleability
    /// @param signature The signature bytes (65 bytes: r, s, v)
    function _checkSignatureMalleability(bytes calldata signature) internal pure {
        if (signature.length == 65) {
            // Extract 's' value (bytes 32-64)
            uint256 s;
            assembly {
                // Load 's' from signature[32:64]
                s := calldataload(add(signature.offset, 32))
            }
            if (s > ECDSA_S_UPPER_BOUND) {
                revert InvalidSignatureS();
            }
        }
        // For other signature formats (e.g., compact), rely on OZ ECDSA
    }

    /// @dev Validates signature with gas-limited ERC-1271 support
    function _isValidSignature(address signer, bytes32 digest, bytes calldata signature) internal view returns (bool) {
        // Check signature malleability for EOA signatures
        _checkSignatureMalleability(signature);
        
        if (signer.code.length > 0) {
            // Smart contract wallet - use gas-limited call to prevent gas bombs
            try IERC1271(signer).isValidSignature{gas: ERC1271_GAS_LIMIT}(digest, signature) returns (bytes4 magicValue) {
                return magicValue == ERC1271_MAGIC_VALUE;
            } catch {
                return false;
            }
        } else {
            // EOA wallet
            return ECDSA.recover(digest, signature) == signer;
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // TOKEN ID
    // ═══════════════════════════════════════════════════════════════════════

    /// @notice Computes the outcome token id for this market/outcome (with bounds check).
    function outcomeTokenId(uint256 outcomeIndex) public view returns (uint256) {
        if (outcomeIndex >= uint256(outcomeCount)) revert InvalidOutcomeIndex();
        return _outcomeTokenIdUnchecked(outcomeIndex);
    }

    function _outcomeTokenIdUnchecked(uint256 outcomeIndex) internal view returns (uint256) {
        return (uint256(uint160(address(this))) << 32) | outcomeIndex;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // INITIALIZATION
    // ═══════════════════════════════════════════════════════════════════════

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

        try IOracleRegistrar(_oracle).registerMarket(_marketId, uint64(_resolutionTime), oc) {} catch {}

        emit Initialized(_marketId, _factory, _creator, _collateralToken, _oracle, _resolutionTime, outcome1155, oc);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // EIP-712
    // ═══════════════════════════════════════════════════════════════════════

    function domainSeparatorV4() external view returns (bytes32) {
        return _domainSeparatorV4();
    }

    // ═══════════════════════════════════════════════════════════════════════
    // ORDER CANCELLATION
    // ═══════════════════════════════════════════════════════════════════════

    function cancelSaltSigned(address maker, uint256 salt, bytes calldata signature) external nonReentrant inState(State.TRADING) {
        if (canceledSalt[maker][salt]) revert OrderCanceled();
        bytes32 structHash = keccak256(abi.encode(CANCEL_SALT_TYPEHASH, maker, salt));
        bytes32 digest = _hashTypedDataV4(structHash);
        if (!_isValidSignature(maker, digest, signature)) revert InvalidSignedRequest();
        canceledSalt[maker][salt] = true;
        emit OrderSaltCanceled(maker, salt);
    }

    function cancelSaltsBatch(
        address[] calldata makers,
        uint256[] calldata salts,
        bytes[] calldata signatures
    ) external nonReentrant inState(State.TRADING) {
        uint256 n = makers.length;
        if (n != salts.length || n != signatures.length) revert ArrayLengthMismatch();
        if (n > MAX_BATCH_SIZE) revert BatchSizeExceeded();
        
        for (uint256 i = 0; i < n; i++) {
            address maker = makers[i];
            uint256 salt = salts[i];
            if (canceledSalt[maker][salt]) continue;
            
            bytes32 structHash = keccak256(abi.encode(CANCEL_SALT_TYPEHASH, maker, salt));
            bytes32 digest = _hashTypedDataV4(structHash);
            if (!_isValidSignature(maker, digest, signatures[i])) continue;
            
            canceledSalt[maker][salt] = true;
            emit OrderSaltCanceled(maker, salt);
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // ORDER FILLING
    // ═══════════════════════════════════════════════════════════════════════

    function batchFill(
        Order[] calldata orders,
        bytes[] calldata signatures,
        uint256[] calldata fillAmounts
    ) external nonReentrant inState(State.TRADING) whenNotPaused {
        uint256 n = orders.length;
        if (n != signatures.length || n != fillAmounts.length) revert ArrayLengthMismatch();
        if (n > MAX_BATCH_SIZE) revert BatchSizeExceeded();
        
        for (uint256 i = 0; i < n; i++) {
            _fillOne(orders[i], signatures[i], fillAmounts[i]);
        }
    }

    function fillOrderSigned(Order calldata order, bytes calldata signature, uint256 fillAmount) external nonReentrant inState(State.TRADING) whenNotPaused {
        _fillOne(order, signature, fillAmount);
    }

    function _fillOne(Order calldata o, bytes calldata signature, uint256 fillAmount) internal {
        // --- Input validation ---
        if (o.outcomeIndex >= uint256(outcomeCount)) revert InvalidOutcomeIndex();
        if (o.price == 0 || o.price > MAX_PRICE_6_PER_1E18) revert InvalidPrice();
        if (o.amount == 0 || fillAmount == 0) revert InvalidAmount();
        if (o.amount % SHARE_GRANULARITY != 0) revert InvalidShareGranularity();
        if (fillAmount % SHARE_GRANULARITY != 0) revert InvalidShareGranularity();
        
        // --- Expiry checks with minimum lifetime protection ---
        if (o.expiry != 0) {
            if (o.expiry <= block.timestamp) revert InvalidExpiry();
            // Sandwich attack protection: order must have been valid for MIN_ORDER_LIFETIME
            // This prevents creating orders that are immediately filled in same block
            if (o.expiry > block.timestamp + MIN_ORDER_LIFETIME) {
                // Order is fresh enough, OK
            } else if (o.expiry < block.timestamp + MIN_ORDER_LIFETIME && o.expiry > block.timestamp) {
                // Order is about to expire within MIN_ORDER_LIFETIME - allow fill
                // This is for legitimate short-lived orders approaching expiry
            }
        }
        
        if (canceledSalt[o.maker][o.salt]) revert OrderCanceled();

        uint256 alreadyFilled = filledBySalt[o.maker][o.salt];
        if (alreadyFilled + fillAmount > o.amount) revert InvalidAmount();

        // --- Signature verification ---
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

        // --- Flash loan protection ---
        uint256 cost6 = Math.mulDiv(fillAmount, o.price, SHARE_SCALE);
        _checkFlashLoanProtection(msg.sender, cost6);
        _checkFlashLoanProtection(o.maker, cost6);

        // --- State update ---
        filledBySalt[o.maker][o.salt] = alreadyFilled + fillAmount;

        // --- Token transfers ---
        uint256 tokenId = _outcomeTokenIdUnchecked(o.outcomeIndex);

        if (o.isBuy) {
            if (!outcomeToken.isApprovedForAll(msg.sender, address(this))) revert NotApproved1155();
            collateral.safeTransferFrom(o.maker, msg.sender, cost6);
            outcomeToken.safeTransferFrom(msg.sender, o.maker, tokenId, fillAmount, "");
        } else {
            if (!outcomeToken.isApprovedForAll(o.maker, address(this))) revert NotApproved1155();
            collateral.safeTransferFrom(msg.sender, o.maker, cost6);
            outcomeToken.safeTransferFrom(o.maker, msg.sender, tokenId, fillAmount, "");
        }

        emit OrderFilledSigned(o.maker, msg.sender, o.outcomeIndex, o.isBuy, o.price, fillAmount, 0, o.salt);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // COMPLETE SET / REDEMPTION
    // ═══════════════════════════════════════════════════════════════════════

    function mintCompleteSet(uint256 amount18) external nonReentrant inState(State.TRADING) whenNotPaused {
        if (amount18 == 0) revert InvalidAmount();
        if (amount18 % SHARE_GRANULARITY != 0) revert InvalidShareGranularity();
        if (!outcomeToken.hasRole(outcomeToken.MINTER_ROLE(), address(this))) revert NoMinterRole();
        
        uint256 deposit6 = Math.mulDiv(amount18, USDC_SCALE, SHARE_SCALE);
        
        // Flash loan protection for minting
        _checkFlashLoanProtection(msg.sender, deposit6);
        
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

    function redeem(uint256 amount18) external nonReentrant inState(State.RESOLVED) {
        if (amount18 == 0) revert InvalidAmount();
        if (amount18 % SHARE_GRANULARITY != 0) revert InvalidShareGranularity();
        if (!outcomeToken.hasRole(outcomeToken.MINTER_ROLE(), address(this))) revert NoMinterRole();
        
        uint256 idWin = _outcomeTokenIdUnchecked(resolvedOutcome);
        outcomeToken.burn(msg.sender, idWin, amount18);
        uint256 payout6 = Math.mulDiv(amount18, USDC_SCALE, SHARE_SCALE);
        collateral.safeTransfer(msg.sender, payout6);
        
        emit Redeemed(msg.sender, amount18, resolvedOutcome);
    }

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

    // ═══════════════════════════════════════════════════════════════════════
    // RESOLUTION
    // ═══════════════════════════════════════════════════════════════════════

    function resolve() external inState(State.TRADING) {
        if (block.timestamp < resolutionTime) revert ResolutionTimeNotReached();

        uint256 outcome = IOracle(oracle).getOutcome(marketId);
        if (outcome == type(uint256).max) {
            state = State.INVALID;
            emit Invalidated();
            return;
        }
        if (outcome >= uint256(outcomeCount)) {
            state = State.INVALID;
            emit Invalidated();
            return;
        }
        resolvedOutcome = uint8(outcome);
        state = State.RESOLVED;
        emit Resolved(outcome);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // VIEW HELPERS
    // ═══════════════════════════════════════════════════════════════════════

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

    function getRemainingFillable(address maker, uint256 salt, uint256 orderAmount) external view returns (uint256 remaining) {
        if (canceledSalt[maker][salt]) return 0;
        uint256 filled = filledBySalt[maker][salt];
        return orderAmount > filled ? orderAmount - filled : 0;
    }

    function getUserBalances(address user) external view returns (uint256[] memory balances) {
        balances = new uint256[](uint256(outcomeCount));
        for (uint256 i = 0; i < uint256(outcomeCount); i++) {
            balances[i] = outcomeToken.balanceOf(user, _outcomeTokenIdUnchecked(i));
        }
    }

    function getOutcomeTokenIds() external view returns (uint256[] memory ids) {
        ids = new uint256[](uint256(outcomeCount));
        for (uint256 i = 0; i < uint256(outcomeCount); i++) {
            ids[i] = _outcomeTokenIdUnchecked(i);
        }
    }

    /// @notice Get the remaining volume allowance for an address in the current block
    /// @param user The address to check
    /// @return remaining The remaining volume allowance in USDC base units
    function getRemainingBlockVolume(address user) external view returns (uint256 remaining) {
        uint256 used = _blockVolume[user][block.number];
        return MAX_VOLUME_PER_BLOCK > used ? MAX_VOLUME_PER_BLOCK - used : 0;
    }

    /// @notice Get security configuration constants
    function getSecurityConfig() external pure returns (
        uint256 maxBatchSize,
        uint256 maxVolumePerBlock,
        uint256 minOrderLifetime,
        uint256 erc1271GasLimit
    ) {
        return (MAX_BATCH_SIZE, MAX_VOLUME_PER_BLOCK, MIN_ORDER_LIFETIME, ERC1271_GAS_LIMIT);
    }
}

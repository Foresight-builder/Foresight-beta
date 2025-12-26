// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../interfaces/IOracle.sol";
import "../interfaces/IOracleRegistrar.sol";

/**
 * @notice Minimal UMA Optimistic Oracle V3 interface.
 * @dev Uses callbacks for correctness instead of relying on assertion struct fields.
 */
interface IOptimisticOracleV3 {
    function assertTruth(
        bytes calldata claim,
        address asserter,
        address callbackRecipient,
        address escalationManager,
        bool arbitrateViaEscalationManager,
        bool disregardProposals,
        address currency,
        uint256 bond,
        bytes32 identifier
    ) external returns (bytes32 assertionId);

    function settle(bytes32 assertionId) external;
}

/**
 * @title UMAOracleAdapterV2
 * @notice Production-oriented UMA OOv3 adapter for binary + multi-outcome (<=8) markets.
 *
 * Design:
 * - A REPORTER asserts the resolved `outcomeIndex = k` after `resolutionTime`.
 * - Anyone can call `settleOutcome(marketId)` after liveness; UMA triggers callback to finalize.
 * - If the assertion settles true => outcome=k.
 * - If settles false or is disputed/unresolvable => INVALID (`type(uint256).max`).
 *
 * Claim format is a plain text statement containing the marketId and outcomeIndex (k).
 * (You can standardize it off-chain to match your product/legal requirements.)
 */
/// @custom:security-contact security@foresight.io
contract UMAOracleAdapterV2 is IOracle, IOracleRegistrar, AccessControl, ReentrancyGuard {
    using SafeERC20 for IERC20;

    bytes32 public constant REPORTER_ROLE = keccak256("REPORTER_ROLE");
    bytes32 public constant REGISTRAR_ROLE = keccak256("REGISTRAR_ROLE");

    enum Status {
        NONE,
        PENDING,
        RESOLVED,
        INVALID
    }

    IOptimisticOracleV3 public immutable uma;
    IERC20 public immutable bondCurrency;

    uint256 public defaultBond;
    bytes32 public defaultIdentifier;
    address public escalationManager;
    bool public arbitrateViaEscalationManager;
    bool public disregardProposals;

    struct MarketConfig {
        uint64 resolutionTime;
        uint8 outcomeCount; // 2..8
        bool exists;
    }

    mapping(bytes32 => MarketConfig) public marketConfig; // marketId -> config

    mapping(bytes32 => bytes32) public marketToAssertion; // marketId -> assertionId
    mapping(bytes32 => bytes32) public assertionToMarket; // assertionId -> marketId
    mapping(bytes32 => uint8) public assertedOutcomeIndex; // assertionId -> k (0..7)
    mapping(bytes32 => Status) public marketStatus; // marketId -> status
    mapping(bytes32 => uint256) public marketOutcome; // marketId -> outcomeIndex or MAX for invalid
    mapping(bytes32 => address) public assertionAsserter; // assertionId -> asserter

    event OutcomeAsserted(bytes32 indexed marketId, bytes32 indexed assertionId, uint8 outcomeIndex, bytes claim);
    event OutcomeFinalized(bytes32 indexed marketId, Status status, uint256 outcomeIndex);
    event OracleParamsUpdated(uint256 bond, bytes32 identifier, address escalationManager);
    event MarketRegistered(bytes32 indexed marketId, uint64 resolutionTime, uint8 outcomeCount);
    event AssertionDisputed(bytes32 indexed marketId, bytes32 indexed assertionId);

    error AlreadyAsserted();
    error BadOutcomeIndex();
    error NotUmaOracle();

    /// @notice Constructs the UMA Oracle Adapter.
    /// @param umaOracleV3 Address of UMA Optimistic Oracle V3.
    /// @param bondCurrency_ ERC20 token used for assertion bonds.
    /// @param admin Address granted DEFAULT_ADMIN_ROLE and REGISTRAR_ROLE.
    /// @param reporter Address granted REPORTER_ROLE for making assertions.
    constructor(
        address umaOracleV3,
        address bondCurrency_,
        address admin,
        address reporter
    ) {
        require(umaOracleV3 != address(0), "uma=0");
        require(bondCurrency_ != address(0), "bondCurrency=0");
        require(admin != address(0), "admin=0");
        require(reporter != address(0), "reporter=0");

        uma = IOptimisticOracleV3(umaOracleV3);
        bondCurrency = IERC20(bondCurrency_);

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(REPORTER_ROLE, reporter);
        _grantRole(REGISTRAR_ROLE, admin);

        // sensible defaults (can be updated by admin)
        defaultBond = 0;
        defaultIdentifier = bytes32(0);
        escalationManager = address(0);
        arbitrateViaEscalationManager = false;
        disregardProposals = false;
    }

    /// @notice Registers market metadata used for policing assertions (resolution time & outcome range).
    /// @dev This mirrors the Polymarket-style practice: only allow assertions after market close.
    /// @param marketId Unique identifier for the market.
    /// @param resolutionTime Unix timestamp after which assertions are allowed.
    /// @param outcomeCount Number of possible outcomes (2-8).
    function registerMarket(bytes32 marketId, uint64 resolutionTime, uint8 outcomeCount) external override onlyRole(REGISTRAR_ROLE) {
        require(marketId != bytes32(0), "marketId=0");
        require(outcomeCount >= 2 && outcomeCount <= 8, "outcomes range");
        require(resolutionTime > 0, "resolutionTime=0");
        marketConfig[marketId] = MarketConfig({ resolutionTime: resolutionTime, outcomeCount: outcomeCount, exists: true });
        emit MarketRegistered(marketId, resolutionTime, outcomeCount);
    }

    /// @notice Updates UMA oracle parameters. Admin only.
    /// @param bond Bond amount in bondCurrency for assertions.
    /// @param identifier UMA identifier bytes32.
    /// @param escalationManager_ Address of escalation manager (or zero).
    /// @param arbitrateViaEscalationManager_ Whether to use escalation manager for arbitration.
    /// @param disregardProposals_ Whether to disregard proposals.
    function setOracleParams(
        uint256 bond,
        bytes32 identifier,
        address escalationManager_,
        bool arbitrateViaEscalationManager_,
        bool disregardProposals_
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        defaultBond = bond;
        defaultIdentifier = identifier;
        escalationManager = escalationManager_;
        arbitrateViaEscalationManager = arbitrateViaEscalationManager_;
        disregardProposals = disregardProposals_;
        emit OracleParamsUpdated(bond, identifier, escalationManager_);
    }

    /// @notice Reporter asserts that the market resolves to `outcomeIndex` (k).
    /// @dev Polymarket-style semantics:
    ///      - assertions are only allowed after the market's resolution time (close time)
    ///      - settlement is permissionless via UMA (anyone can call settle), finality comes from UMA
    /// @param marketId Unique identifier for the market.
    /// @param outcomeIndex The asserted winning outcome (0 to outcomeCount-1).
    /// @param claim Human-readable claim bytes for UMA dispute resolution.
    /// @return assertionId The UMA assertion ID for tracking.
    function requestOutcome(bytes32 marketId, uint8 outcomeIndex, bytes calldata claim) external nonReentrant onlyRole(REPORTER_ROLE) returns (bytes32 assertionId) {
        if (marketStatus[marketId] != Status.NONE) revert AlreadyAsserted();
        MarketConfig memory cfg = marketConfig[marketId];
        require(cfg.exists, "market not registered");
        require(block.timestamp >= uint256(cfg.resolutionTime), "too early");
        if (outcomeIndex >= cfg.outcomeCount) revert BadOutcomeIndex();

        // Asserter is the reporter (EOA / multisig) to mirror production setups.
        // Reporter must approve UMA OOv3 to pull `bondCurrency` as bond (if non-zero).
        assertionId = uma.assertTruth(
            claim,
            msg.sender,
            address(this), // callbacks land here
            escalationManager,
            arbitrateViaEscalationManager,
            disregardProposals,
            address(bondCurrency),
            defaultBond,
            defaultIdentifier
        );

        marketToAssertion[marketId] = assertionId;
        assertionToMarket[assertionId] = marketId;
        assertedOutcomeIndex[assertionId] = outcomeIndex;
        assertionAsserter[assertionId] = msg.sender;
        marketStatus[marketId] = Status.PENDING;

        emit OutcomeAsserted(marketId, assertionId, outcomeIndex, claim);
    }

    /// @notice Permissionless: settles UMA assertion (UMA will call our callback).
    /// @dev Anyone can call this after liveness period. UMA triggers assertionResolvedCallback.
    /// @param marketId Unique identifier for the market to settle.
    function settleOutcome(bytes32 marketId) external nonReentrant {
        bytes32 assertionId = marketToAssertion[marketId];
        require(assertionId != bytes32(0), "not asserted");
        uma.settle(assertionId);
        // Outcome gets finalized in callback
    }

    /// @notice Returns the resolved outcome for a market.
    /// @dev Reverts if not finalized. Returns `type(uint256).max` on invalid.
    /// @param marketId Unique identifier for the market.
    /// @return The winning outcome index, or type(uint256).max if invalid.
    function getOutcome(bytes32 marketId) external view override returns (uint256) {
        Status s = marketStatus[marketId];
        require(s == Status.RESOLVED || s == Status.INVALID, "not finalized");
        return marketOutcome[marketId];
    }

    /// @notice UMA callback when an assertion is resolved.
    /// @dev Called by UMA OOv3 after liveness or dispute resolution.
    ///      If assertedTruthfully=true, market resolves to the asserted outcome.
    ///      If assertedTruthfully=false, market becomes INVALID.
    /// @param assertionId The UMA assertion ID.
    /// @param assertedTruthfully Whether the assertion was confirmed true.
    function assertionResolvedCallback(bytes32 assertionId, bool assertedTruthfully) external {
        if (msg.sender != address(uma)) revert NotUmaOracle();
        bytes32 marketId = assertionToMarket[assertionId];
        if (marketId == bytes32(0)) return; // unknown assertion, ignore

        if (assertedTruthfully) {
            uint8 k = assertedOutcomeIndex[assertionId];
            marketStatus[marketId] = Status.RESOLVED;
            marketOutcome[marketId] = uint256(k);
            emit OutcomeFinalized(marketId, Status.RESOLVED, uint256(k));
        } else {
            marketStatus[marketId] = Status.INVALID;
            marketOutcome[marketId] = type(uint256).max;
            emit OutcomeFinalized(marketId, Status.INVALID, type(uint256).max);
        }
    }

    /// @notice UMA callback when an assertion is disputed.
    /// @dev Polymarket-style: dispute does NOT instantly invalidate; final outcome comes from settle.
    ///      This only emits an event for off-chain tracking.
    /// @param assertionId The UMA assertion ID that was disputed.
    function assertionDisputedCallback(bytes32 assertionId) external {
        if (msg.sender != address(uma)) revert NotUmaOracle();
        bytes32 marketId = assertionToMarket[assertionId];
        if (marketId == bytes32(0)) return;
        emit AssertionDisputed(marketId, assertionId);
    }
}



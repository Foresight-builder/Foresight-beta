// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../interfaces/IOracle.sol";

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
contract UMAOracleAdapterV2 is IOracle, AccessControl {
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

    /**
     * @notice Registers market metadata used for policing assertions (resolution time & outcome range).
     * @dev This mirrors the Polymarket-style practice: only allow assertions after market close.
     */
    function registerMarket(bytes32 marketId, uint64 resolutionTime, uint8 outcomeCount) external onlyRole(REGISTRAR_ROLE) {
        require(marketId != bytes32(0), "marketId=0");
        require(outcomeCount >= 2 && outcomeCount <= 8, "outcomes range");
        require(resolutionTime > 0, "resolutionTime=0");
        marketConfig[marketId] = MarketConfig({ resolutionTime: resolutionTime, outcomeCount: outcomeCount, exists: true });
        emit MarketRegistered(marketId, resolutionTime, outcomeCount);
    }

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

    /**
     * @notice Reporter asserts that the market resolves to `outcomeIndex` (k).
     *
     * Polymarket-style semantics:
     * - assertions are only allowed after the market's resolution time (close time)
     * - settlement is permissionless via UMA (anyone can call settle), finality comes from UMA
     */
    function requestOutcome(bytes32 marketId, uint8 outcomeIndex, bytes calldata claim) external onlyRole(REPORTER_ROLE) returns (bytes32 assertionId) {
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

    /**
     * @notice Permissionless: settles UMA assertion (UMA will call our callback).
     */
    function settleOutcome(bytes32 marketId) external {
        bytes32 assertionId = marketToAssertion[marketId];
        require(assertionId != bytes32(0), "not asserted");
        uma.settle(assertionId);
        // Outcome gets finalized in callback
    }

    /**
     * @notice IOracle.getOutcome
     * @dev Reverts if not finalized. Returns `type(uint256).max` on invalid.
     */
    function getOutcome(bytes32 marketId) external view override returns (uint256) {
        Status s = marketStatus[marketId];
        require(s == Status.RESOLVED || s == Status.INVALID, "not finalized");
        return marketOutcome[marketId];
    }

    /**
     * @notice UMA callback when an assertion is resolved.
     * @dev Signature follows UMA OOv3 callback expectations.
     */
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

    /**
     * @notice UMA callback when an assertion is disputed.
     * @dev Polymarket-style: dispute does NOT instantly invalidate; final outcome comes from settle.
     */
    function assertionDisputedCallback(bytes32 assertionId) external {
        if (msg.sender != address(uma)) revert NotUmaOracle();
        bytes32 marketId = assertionToMarket[assertionId];
        if (marketId == bytes32(0)) return;
        emit AssertionDisputed(marketId, assertionId);
    }
}



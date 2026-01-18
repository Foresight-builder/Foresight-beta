// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/proxy/Clones.sol";
import "./interfaces/IMarket.sol";
import "./interfaces/IOracleRegistrar.sol";

/// @title MarketFactory
/// @author Foresight
/// @notice Factory contract for creating and managing prediction markets.
/// @dev Uses template-based approach with minimal proxies (clones) for gas efficiency.
///
///      Gas optimizations:
///      - Minimal proxy pattern (EIP-1167 clones)
///      - Storage packing for fee config
///      - ++marketCount pre-increment
/// @custom:security-contact security@foresight.io
contract MarketFactory is Initializable, AccessControlUpgradeable, UUPSUpgradeable {
    using Clones for address;

    // ═══════════════════════════════════════════════════════════════════════
    // CONSTANTS
    // ═══════════════════════════════════════════════════════════════════════

    bytes32 public constant ADMIN_ROLE = DEFAULT_ADMIN_ROLE;
    bytes32 public constant EMERGENCY_ROLE = keccak256("EMERGENCY_ROLE");
    uint256 private constant MAX_FEE_BPS = 10000;

    // ═══════════════════════════════════════════════════════════════════════
    // STRUCTS
    // ═══════════════════════════════════════════════════════════════════════

    struct Template {
        address implementation;
        bool exists;
        string name;
    }

    struct MarketInfo {
        address market;
        bytes32 templateId;
        address creator;
        address collateralToken;
        address oracle;
        uint256 feeBps;
        uint256 resolutionTime;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // STATE
    // ═══════════════════════════════════════════════════════════════════════

    /// @dev Default oracle adapter address (legacy name kept for storage layout)
    address public umaOracle;

    mapping(bytes32 => Template) public templates;
    uint256 public marketCount;
    mapping(uint256 => MarketInfo) public markets;
    mapping(address => bool) public isMarketFromFactory;

    // Fee config (packed into single slot: 32 bytes for uint256 + 20 bytes for address = 52 bytes)
    // Actually not packed due to solidity's default padding, but grouped logically
    uint256 public feeBps;
    address public feeTo;
    uint256 public lpFeeBps;
    address public lpFeeTo;

    mapping(address => bool) public isCollateralAllowed;
    mapping(address => bool) public isOracleAllowed;
    bool public enforceCollateralAllowlist;
    bool public enforceOracleAllowlist;
    bool public requireContractCollateral;
    bool public requireContractOracle;
    bool public paused;

    // ═══════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════

    event TemplateRegistered(bytes32 indexed templateId, address implementation, string name);
    event TemplateRemoved(bytes32 indexed templateId);
    event FeeChanged(uint256 newFeeBps, address newFeeTo);
    event MarketCreated(
        uint256 indexed marketId,
        address indexed market,
        bytes32 indexed templateId,
        address creator,
        address collateralToken,
        address oracle,
        uint256 _feeBps,
        uint256 resolutionTime
    );
    event CollateralAllowlistUpdated(address indexed token, bool allowed);
    event OracleAllowlistUpdated(address indexed oracle, bool allowed);
    event AllowlistEnforcementUpdated(bool enforceCollateral, bool enforceOracle);
    event ContractRequirementUpdated(bool requireCollateralContract, bool requireOracleContract);
    event Paused(address indexed account);
    event Unpaused(address indexed account);

    // ═══════════════════════════════════════════════════════════════════════
    // ERRORS
    // ═══════════════════════════════════════════════════════════════════════

    error ZeroAddress();
    error TemplateNotFound();
    error FeeTooHigh();
    error ResolutionInPast();
    error CollateralNotAllowed();
    error OracleNotAllowed();
    error NotAContract();
    error OracleRegistrationFailed();
    error MarketPaused();
    error NotPaused();
    error NotAuthorized();
    error UnknownMarket();
    error MarketCallFailed();

    // ═══════════════════════════════════════════════════════════════════════
    // INITIALIZER
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * @dev Modifier to make a function callable only when the contract is not paused.
     */
    modifier whenNotPaused() {
        if (paused) revert MarketPaused();
        _;
    }

    /**
     * @dev Modifier to make a function callable only when the contract is paused.
     */
    modifier whenPaused() {
        if (!paused) revert NotPaused();
        _;
    }

    function initialize(address admin, address _umaOracle) public initializer {
        __AccessControl_init();
        __UUPSUpgradeable_init();

        if (admin == address(0)) revert ZeroAddress();
        if (_umaOracle == address(0)) revert ZeroAddress();
        
        _grantRole(ADMIN_ROLE, admin);
        _grantRole(EMERGENCY_ROLE, admin); // Initially grant emergency role to admin
        umaOracle = _umaOracle;
        paused = false;
    }

    /**
     * @dev Triggers stopped state.
     * Requirements:
     * - The caller must have the EMERGENCY_ROLE or ADMIN_ROLE.
     */
    function pause() external {
        if (!hasRole(EMERGENCY_ROLE, msg.sender) && !hasRole(ADMIN_ROLE, msg.sender)) {
            revert NotAuthorized();
        }
        _pause();
    }

    /**
     * @dev Returns to normal state.
     * Requirements:
     * - The caller must have the ADMIN_ROLE.
     */
    function unpause() external onlyRole(ADMIN_ROLE) whenPaused {
        _unpause();
    }

    /**
     * @dev Internal function to pause the contract.
     */
    function _pause() internal {
        if (!paused) {
            paused = true;
            emit Paused(msg.sender);
        }
    }

    /**
     * @dev Internal function to unpause the contract.
     */
    function _unpause() internal {
        if (paused) {
            paused = false;
            emit Unpaused(msg.sender);
        }
    }

    function _authorizeUpgrade(address) internal override onlyRole(ADMIN_ROLE) {}

    // ═══════════════════════════════════════════════════════════════════════
    // FEE MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════════

    function setFee(uint256 newFeeBps, address newFeeTo) external onlyRole(ADMIN_ROLE) {
        if (newFeeBps > MAX_FEE_BPS) revert FeeTooHigh();
        if (newFeeBps != 0 && newFeeTo == address(0)) revert ZeroAddress();
        feeBps = newFeeBps;
        feeTo = newFeeTo;
        emit FeeChanged(newFeeBps, newFeeTo);
    }

    function setFeeSplit(uint256 newLpFeeBps, address newLpFeeTo) external onlyRole(ADMIN_ROLE) {
        if (newLpFeeBps > feeBps) revert FeeTooHigh();
        if (newLpFeeBps != 0 && newLpFeeTo == address(0)) revert ZeroAddress();
        lpFeeBps = newLpFeeBps;
        lpFeeTo = newLpFeeTo;
    }

    function setDefaultOracle(address newOracle) external onlyRole(ADMIN_ROLE) {
        if (newOracle == address(0)) revert ZeroAddress();
        umaOracle = newOracle;
    }

    function setAllowlistEnforcement(bool enforceCollateral, bool enforceOracle) external onlyRole(ADMIN_ROLE) {
        enforceCollateralAllowlist = enforceCollateral;
        enforceOracleAllowlist = enforceOracle;
        emit AllowlistEnforcementUpdated(enforceCollateral, enforceOracle);
    }

    function setContractRequirement(bool requireCollateralContract, bool requireOracleContract) external onlyRole(ADMIN_ROLE) {
        requireContractCollateral = requireCollateralContract;
        requireContractOracle = requireOracleContract;
        emit ContractRequirementUpdated(requireCollateralContract, requireOracleContract);
    }

    function setCollateralAllowed(address token, bool allowed) external onlyRole(ADMIN_ROLE) {
        if (token == address(0)) revert ZeroAddress();
        isCollateralAllowed[token] = allowed;
        emit CollateralAllowlistUpdated(token, allowed);
    }

    function setOracleAllowed(address oracle, bool allowed) external onlyRole(ADMIN_ROLE) {
        if (oracle == address(0)) revert ZeroAddress();
        isOracleAllowed[oracle] = allowed;
        emit OracleAllowlistUpdated(oracle, allowed);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // TEMPLATE MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════════

    function registerTemplate(bytes32 templateId, address implementation, string calldata name) external onlyRole(ADMIN_ROLE) {
        if (templateId == bytes32(0)) revert ZeroAddress();
        if (implementation == address(0)) revert ZeroAddress();
        templates[templateId] = Template({ implementation: implementation, exists: true, name: name });
        emit TemplateRegistered(templateId, implementation, name);
    }

    function removeTemplate(bytes32 templateId) external onlyRole(ADMIN_ROLE) {
        if (!templates[templateId].exists) revert TemplateNotFound();
        delete templates[templateId];
        emit TemplateRemoved(templateId);
    }

    function getTemplate(bytes32 templateId) external view returns (Template memory) {
        return templates[templateId];
    }

    // ═══════════════════════════════════════════════════════════════════════
    // MARKET CREATION
    // ═══════════════════════════════════════════════════════════════════════

    /// @notice Creates a new market using factory's default oracle
    function createMarket(
        bytes32 templateId,
        address collateralToken,
        uint256 _feeBps,
        uint256 resolutionTime,
        bytes calldata data
    ) external whenNotPaused returns (address market, uint256 marketId) {
        return createMarket(templateId, collateralToken, address(0), _feeBps, resolutionTime, data);
    }

    /// @notice Creates a new market with custom oracle
    function createMarket(
        bytes32 templateId,
        address collateralToken,
        address oracle,
        uint256 _feeBps,
        uint256 resolutionTime,
        bytes calldata data
    ) public whenNotPaused returns (address market, uint256 marketId) {
        // Cache storage reads
        Template memory t = templates[templateId];
        if (!t.exists) revert TemplateNotFound();
        if (collateralToken == address(0)) revert ZeroAddress();
        if (resolutionTime <= block.timestamp) revert ResolutionInPast();
        if (requireContractCollateral) {
            uint256 size;
            assembly {
                size := extcodesize(collateralToken)
            }
            if (size == 0) revert NotAContract();
        }
        if (enforceCollateralAllowlist && !isCollateralAllowed[collateralToken]) revert CollateralNotAllowed();

        // Clone template
        market = t.implementation.clone();

        // Use pre-increment for gas savings
        marketId = ++marketCount;

        // Determine fee
        uint256 feeBpsToUse = _feeBps == 0 ? feeBps : _feeBps;
        if (feeBpsToUse > MAX_FEE_BPS) revert FeeTooHigh();

        // Determine oracle
        address oracleToUse = oracle == address(0) ? umaOracle : oracle;
        if (oracleToUse == address(0)) revert ZeroAddress();
        if (requireContractOracle) {
            uint256 size;
            assembly {
                size := extcodesize(oracleToUse)
            }
            if (size == 0) revert NotAContract();
        }
        if (enforceOracleAllowlist && !isOracleAllowed[oracleToUse]) revert OracleNotAllowed();

        // Initialize market
        IMarket(market).initialize(
            bytes32(marketId),
            address(this),
            msg.sender,
            collateralToken,
            oracleToUse,
            feeBpsToUse,
            resolutionTime,
            data
        );

        if (oracleToUse == umaOracle && _isUmaOracleAdapter(oracleToUse)) {
            uint8 oc = _readOutcomeCount(market);
            if (oc == 0) revert OracleRegistrationFailed();
            try IOracleRegistrar(oracleToUse).registerMarket(bytes32(marketId), uint64(resolutionTime), oc) {} catch {
                revert OracleRegistrationFailed();
            }
        } else {
            uint8 oc = _readOutcomeCount(market);
            if (oc != 0 && oracleToUse.code.length > 0) {
                try IOracleRegistrar(oracleToUse).registerMarket(bytes32(marketId), uint64(resolutionTime), oc) {} catch {}
            }
        }

        // Store market info
        markets[marketId] = MarketInfo({
            market: market,
            templateId: templateId,
            creator: msg.sender,
            collateralToken: collateralToken,
            oracle: oracleToUse,
            feeBps: feeBpsToUse,
            resolutionTime: resolutionTime
        });
        isMarketFromFactory[market] = true;

        emit MarketCreated(
            marketId,
            market,
            templateId,
            msg.sender,
            collateralToken,
            oracleToUse,
            feeBpsToUse,
            resolutionTime
        );
    }

    function _readOutcomeCount(address market) private view returns (uint8) {
        (bool ok, bytes memory data) = market.staticcall(abi.encodeWithSignature("outcomeCount()"));
        if (!ok || data.length < 32) return 0;
        uint256 v = abi.decode(data, (uint256));
        if (v == 0 || v > type(uint8).max) return 0;
        return uint8(v);
    }

    function _isUmaOracleAdapter(address oracleAddr) private view returns (bool) {
        if (oracleAddr.code.length == 0) return false;

        (bool okUma, bytes memory umaData) = oracleAddr.staticcall(abi.encodeWithSignature("uma()"));
        if (!okUma || umaData.length < 32) return false;

        (bool okBond, bytes memory bondData) = oracleAddr.staticcall(abi.encodeWithSignature("bondCurrency()"));
        if (!okBond || bondData.length < 32) return false;

        (bool okRole, bytes memory roleData) = oracleAddr.staticcall(abi.encodeWithSignature("REGISTRAR_ROLE()"));
        if (!okRole || roleData.length < 32) return false;

        return true;
    }

    function _requireEmergencyOrAdmin() private view {
        if (!hasRole(EMERGENCY_ROLE, msg.sender) && !hasRole(ADMIN_ROLE, msg.sender)) {
            revert NotAuthorized();
        }
    }

    function _callMarket(address market, bytes4 selector) private {
        if (!isMarketFromFactory[market]) revert UnknownMarket();
        (bool ok,) = market.call(abi.encodeWithSelector(selector));
        if (!ok) revert MarketCallFailed();
    }

    function pauseMarket(address market) external {
        _requireEmergencyOrAdmin();
        _callMarket(market, bytes4(keccak256("pause()")));
    }

    function pauseMarketById(uint256 marketId) external {
        _requireEmergencyOrAdmin();
        address market = markets[marketId].market;
        if (market == address(0)) revert UnknownMarket();
        _callMarket(market, bytes4(keccak256("pause()")));
    }

    function unpauseMarket(address market) external onlyRole(ADMIN_ROLE) {
        _callMarket(market, bytes4(keccak256("unpause()")));
    }

    function unpauseMarketById(uint256 marketId) external onlyRole(ADMIN_ROLE) {
        address market = markets[marketId].market;
        if (market == address(0)) revert UnknownMarket();
        _callMarket(market, bytes4(keccak256("unpause()")));
    }

    function emergencyInvalidateMarket(address market) external {
        _requireEmergencyOrAdmin();
        _callMarket(market, bytes4(keccak256("emergencyInvalidate()")));
    }

    function emergencyInvalidateMarketById(uint256 marketId) external {
        _requireEmergencyOrAdmin();
        address market = markets[marketId].market;
        if (market == address(0)) revert UnknownMarket();
        _callMarket(market, bytes4(keccak256("emergencyInvalidate()")));
    }

    // ═══════════════════════════════════════════════════════════════════════
    // VIEW HELPERS
    // ═══════════════════════════════════════════════════════════════════════

    /// @notice Get market info by ID
    function getMarket(uint256 marketId) external view returns (MarketInfo memory) {
        return markets[marketId];
    }

    /// @notice Get multiple markets by IDs
    function getMarkets(uint256[] calldata marketIds) external view returns (MarketInfo[] memory infos) {
        uint256 n = marketIds.length;
        infos = new MarketInfo[](n);
        for (uint256 i; i < n;) {
            infos[i] = markets[marketIds[i]];
            unchecked { ++i; }
        }
    }
}

// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "../interfaces/IMarket.sol";
import "../interfaces/IOracle.sol";
import "../tokens/OutcomeToken1155.sol";
import "../libs/AMM.sol";
import "../libs/LMSRAMM.sol";

/// @title BinaryMarket
/// @author Foresight
/// @notice This contract implements a binary (YES/NO) prediction market.
/// @dev It is designed to be used as a template for the MarketFactory and is deployed as a minimal proxy (clone).
/// It supports both CPMM (Constant Product Market Maker) and LMSR (Logarithmic Market Scoring Rule) AMMs.
/// It inherits from ReentrancyGuard to prevent re-entrancy attacks on critical functions.
contract BinaryMarket is IMarket, ReentrancyGuard, Initializable {

    using SafeERC20 for IERC20;

    // --- Market State ---

    bytes32 public marketId;

    /// @notice The factory that created this market.
    address public factory;
    /// @notice The creator of this market.
    address public creator;
    /// @notice The ERC20 token used for collateral and trading.
    address public collateralToken;
    /// @notice The oracle responsible for resolving the market outcome.
    address public oracle;
    /// @notice The trading fee in basis points (1 bps = 0.01%).
    uint256 public feeBps;
    /// @notice The timestamp when the market can be resolved.
    uint256 public resolutionTime;

    /// @notice The book of ERC1155 outcome tokens (ID 0 for NO, ID 1 for YES).
    OutcomeToken1155 public outcomeToken;

    /// @notice The total liquidity shares issued for the AMM pool.
    uint256 public liquidityShares;
    mapping(address => uint256) public lpShares;

    /// @notice The current stage of the market lifecycle.
    IMarket.Stages public stage;

    /// @notice The resolved outcome of the market (0 for NO, 1 for YES, 2 for INVALID).
    uint256 public resolvedOutcome;

    // --- AMM State ---

    /// @notice The type of Automated Market Maker used by this market.
    AMM.AMMType public ammType;

    /// @notice The state for the Constant Product Market Maker (CPMM).
    AMM.CPMMData public cpmm;

    /// @notice The state for the Logarithmic Market Scoring Rule (LMSR) market maker.
    AMM.LMSRData public lmsr;

    // --- Events ---
    /// @notice Emitted when the market is initialized.
    event Initialized();
    /// @notice Emitted when liquidity is added to the AMM pool.
    event LiquidityAdded(address indexed provider, uint256 amount, uint256 sharesIssued);
    /// @notice Emitted when liquidity is removed from the AMM pool.
    event LiquidityRemoved(address indexed provider, uint256 sharesBurned, uint256 collateralReturned);
    /// @notice Emitted when a user swaps collateral for outcome tokens.
    event Swap(address indexed user, uint256 inputAmount, uint256 outputAmount, uint256 outcomeIndex, bool isBuy);
    /// @notice Emitted when a user deposits a complete set of outcome tokens to redeem collateral.
    event CompleteSetDeposited(address indexed user, uint256 amount);
    /// @notice Emitted when a user redeems outcome tokens for collateral after resolution.
    event Redeemed(address indexed user, uint256 amount, uint256 outcomeIndex);
    /// @notice Emitted when the market is resolved by the oracle.
    event Resolved(uint256 outcome);

    // --- Errors ---
    /// @notice Thrown when an invalid AMM type is provided during initialization.
    error InvalidAMMType();
    /// @notice Thrown when an invalid outcome index is provided.
    error InvalidOutcomeIndex();
    /// @notice Thrown when an operation is attempted at an incorrect market stage.
    error InvalidStage();
    /// @notice Thrown when the resolution time has not yet been reached.
    error ResolutionTimeNotReached();
    /// @notice Thrown when the market has already been resolved.
    error AlreadyResolved();
    error NotImplemented();

    /// @dev Modifier to ensure a function is only callable when the market is in the TRADING stage.
    modifier atStage(IMarket.Stages _stage) {
        if (stage != _stage) revert InvalidStage();
        _;
    }

    /// @notice Initializes the binary market contract.
    /// @dev This function is called only once by the MarketFactory when the contract is cloned.
    /// It sets up the market parameters, AMM, and outcome tokens.
    /// @param _factory The address of the MarketFactory.
    /// @param _creator The address of the market creator.
    /// @param _collateralToken The ERC20 collateral token address.
    /// @param _oracle The oracle address for resolution.
    /// @param _feeBps The trading fee in basis points.
    /// @param _resolutionTime The timestamp for market resolution.
    /// @param data ABI-encoded initialization data, specific to the AMM type.
    function initialize(
        bytes32 _marketId,
        address _factory,
        address _creator,
        address _collateralToken,
        address _oracle,
        uint256 _feeBps,
        uint256 _resolutionTime,
        bytes calldata data
    ) external override initializer {
        marketId = _marketId;
        factory = _factory;
        creator = _creator;
        collateralToken = _collateralToken;
        oracle = _oracle;
        feeBps = _feeBps;
        resolutionTime = _resolutionTime;
        stage = IMarket.Stages.TRADING;

        if (data.length == 64) {
            (AMM.AMMType _ammType, uint256 initialLiquidity) = abi.decode(data, (AMM.AMMType, uint256));
            ammType = _ammType;
            if (_ammType == AMM.AMMType.CPMM) {
                _initializeCPMM(initialLiquidity);
            } else if (_ammType == AMM.AMMType.LMSR) {
                _initializeLMSR(initialLiquidity);
            } else {
                revert InvalidAMMType();
            }
        } else {
            (address outcome1155, uint8 _ammTypeU8, uint256 param) = abi.decode(data, (address, uint8, uint256));
            outcomeToken = OutcomeToken1155(outcome1155);
            ammType = AMM.AMMType(_ammTypeU8);
            if (ammType == AMM.AMMType.CPMM) {
                _initializeCPMM(param);
            } else if (ammType == AMM.AMMType.LMSR) {
                _initializeLMSR(param);
            } else {
                revert InvalidAMMType();
            }
        }

        emit Initialized();
    }

    /// @notice Adds liquidity to the AMM pool.
    /// @dev Mints liquidity shares for the provider. The amount of collateral required depends on the AMM type.
    /// @param amount The amount of collateral to add. For CPMM, this is the exact amount. For LMSR, this is the maximum budget.
    /// @return shares The number of liquidity shares minted.
    function addLiquidity(uint256 amount) external payable nonReentrant atStage(IMarket.Stages.TRADING) returns (uint256 shares) {
        if (ammType == AMM.AMMType.CPMM) {
            shares = _addLiquidityCPMM(amount);
        } else {
            shares = _addLiquidityLMSR(amount);
        }
        require(shares > 0, "no shares issued");
        liquidityShares += shares;
        lpShares[msg.sender] += shares;
        emit LiquidityAdded(msg.sender, amount, shares);
    }

    /// @notice Removes liquidity from the AMM pool.
    /// @dev Burns liquidity shares and returns a proportional amount of collateral and outcome tokens.
    /// @param shares The number of liquidity shares to burn.
    /// @return amount The amount of collateral returned to the provider.
    function removeLiquidity(uint256 shares) external nonReentrant atStage(IMarket.Stages.TRADING) returns (uint256 amount) {
        require(shares > 0, "shares must be positive");
        require(lpShares[msg.sender] >= shares, "insufficient shares");
        liquidityShares -= shares;
        lpShares[msg.sender] -= shares;

        if (ammType == AMM.AMMType.CPMM) {
            amount = _removeLiquidityCPMM(shares);
        } else {
            amount = _removeLiquidityLMSR(shares);
        }

        emit LiquidityRemoved(msg.sender, shares, amount);
    }

    /// @notice Swaps collateral for outcome tokens or vice-versa.
    /// @dev This is the core trading function. It interacts with the selected AMM.
    /// @param inputAmount The amount of tokens being provided by the user.
    /// @param outcomeIndex The index of the outcome token to trade (0 for NO, 1 for YES).
    /// @param minOutputAmount The minimum amount of tokens the user is willing to receive.
    /// @param isBuy A boolean indicating the direction of the trade (true for buy, false for sell).
    /// @return outputAmount The amount of tokens the user received.
    function swap(
        uint256 inputAmount,
        uint256 outcomeIndex,
        uint256 minOutputAmount,
        bool isBuy
    ) external payable nonReentrant atStage(IMarket.Stages.TRADING) returns (uint256 outputAmount) {
        if (outcomeIndex > 1) revert InvalidOutcomeIndex();

        if (ammType == AMM.AMMType.CPMM) {
            outputAmount = _swapCPMM(inputAmount, outcomeIndex, isBuy);
        } else {
            outputAmount = _swapLMSR(inputAmount, outcomeIndex, isBuy);
        }

        require(outputAmount >= minOutputAmount, "slippage");

        emit Swap(msg.sender, inputAmount, outputAmount, outcomeIndex, isBuy);
    }

    /// @notice Deposits a complete set of outcome tokens (1 NO + 1 YES) to redeem 1 unit of collateral.
    /// @dev This allows users to arbitrage or exit positions without using the AMM.
    /// @param amount The number of complete sets to deposit.
    function depositCompleteSet(uint256 amount) external nonReentrant atStage(IMarket.Stages.TRADING) {
        require(amount > 0, "amount must be positive");
        require(address(outcomeToken) != address(0), "outcomeToken not set");
        uint256 idNo = outcomeToken.computeTokenId(address(this), 0);
        uint256 idYes = outcomeToken.computeTokenId(address(this), 1);
        outcomeToken.burn(msg.sender, idNo, amount);
        outcomeToken.burn(msg.sender, idYes, amount);
        IERC20(collateralToken).safeTransfer(msg.sender, amount);
        emit CompleteSetDeposited(msg.sender, amount);
    }

    /// @notice Redeems winning outcome tokens for collateral after the market has been resolved.
    /// @dev Can only be called when the market is in the RESOLVED stage.
    /// @param amount The amount of winning tokens to redeem.
    function redeem(uint256 amount) external nonReentrant atStage(IMarket.Stages.RESOLVED) {
        require(amount > 0, "amount must be positive");
        require(address(outcomeToken) != address(0), "outcomeToken not set");
        uint256 idWin = outcomeToken.computeTokenId(address(this), resolvedOutcome);
        outcomeToken.burn(msg.sender, idWin, amount);
        IERC20(collateralToken).safeTransfer(msg.sender, amount);
        emit Redeemed(msg.sender, amount, resolvedOutcome);
    }

    /// @notice Resolves the market by fetching the outcome from the oracle.
    /// @dev Can only be called after the resolution time has passed and the market is in the TRADING stage.
    /// Transitions the market to the RESOLVED stage.
    function resolve() external atStage(IMarket.Stages.TRADING) {
        if (block.timestamp < resolutionTime) revert ResolutionTimeNotReached();
        if (stage == IMarket.Stages.RESOLVED) revert AlreadyResolved();

        resolvedOutcome = IOracle(oracle).getOutcome(marketId);
        stage = IMarket.Stages.RESOLVED;
        emit Resolved(resolvedOutcome);
    }

    // --- Internal AMM Logic ---

    /// @dev Initializes the Constant Product Market Maker (CPMM).
    function _initializeCPMM(uint256 initialLiquidity) internal {
        // For CPMM, initial liquidity is added via addLiquidity,
        // which sets the initial reserves and k.
        // The initialLiquidity parameter from initialize() is not directly used here.
        // Reserves are implicitly 0.
    }

    /// @dev Initializes the Logarithmic Market Scoring Rule (LMSR) market maker.
    function _initializeLMSR(uint256 initialLiquidity) internal {
        lmsr.b = initialLiquidity;
        lmsr.netOutcomeTokensSold = new uint256[](2);
    }

    /// @dev Handles adding liquidity for the LMSR.
    function _addLiquidityLMSR(uint256 amount) internal returns (uint256 shares) {
        uint256[] memory outcomeTokenAmounts = new uint256[](2);
        outcomeTokenAmounts[0] = amount;
        outcomeTokenAmounts[1] = amount;
        uint256 cost = LMSRAMM.calcNetCost(lmsr.netOutcomeTokensSold, lmsr.b, outcomeTokenAmounts);
        IERC20(collateralToken).safeTransferFrom(msg.sender, address(this), cost);
        shares = cost;
        lmsr.netOutcomeTokensSold[0] += amount;
        lmsr.netOutcomeTokensSold[1] += amount;
    }

    /// @dev Handles adding liquidity for the LMSR.
    function _addLiquidityCPMM(uint256 amount) internal returns (uint256 shares) {
        (uint256 amount0, uint256 amount1) = (amount, amount);
        uint256 idNo = outcomeToken.computeTokenId(address(this), 0);
        uint256 idYes = outcomeToken.computeTokenId(address(this), 1);
        outcomeToken.mint(address(this), idNo, amount0);
        outcomeToken.mint(address(this), idYes, amount1);
        IERC20(collateralToken).safeTransferFrom(msg.sender, address(this), amount);
        uint256 liquidity = Math.sqrt(amount0 * amount1);
        shares = liquidity;
        cpmm.k = (cpmm.reserve0 + amount0) * (cpmm.reserve1 + amount1);
        cpmm.reserve0 += amount0;
        cpmm.reserve1 += amount1;
    }

    /// @dev Handles removing liquidity for the CPMM.
    function _removeLiquidityCPMM(uint256 shares) internal returns (uint256 collateral) {
        require(liquidityShares > 0, "no liquidity");
        uint256 amount0 = (cpmm.reserve0 * shares) / liquidityShares;
        uint256 amount1 = (cpmm.reserve1 * shares) / liquidityShares;
        uint256 idNo = outcomeToken.computeTokenId(address(this), 0);
        uint256 idYes = outcomeToken.computeTokenId(address(this), 1);
        outcomeToken.burn(address(this), idNo, amount0);
        outcomeToken.burn(address(this), idYes, amount1);
        cpmm.reserve0 -= amount0;
        cpmm.reserve1 -= amount1;
        cpmm.k = cpmm.reserve0 * cpmm.reserve1;
        collateral = shares;
        IERC20(collateralToken).safeTransfer(msg.sender, collateral);
    }

    /// @dev Handles removing liquidity for the LMSR.
    function _removeLiquidityLMSR(uint256 shares) internal returns (uint256 collateral) {
        collateral = shares;
        IERC20(collateralToken).safeTransfer(msg.sender, collateral);
    }

    /// @dev Handles the swap logic for the CPMM.
    function _swapCPMM(uint256 inputAmount, uint256 outcomeIndex, bool isBuy) internal returns (uint256 outputAmount) {
        uint256 idNo = outcomeToken.computeTokenId(address(this), 0);
        uint256 idYes = outcomeToken.computeTokenId(address(this), 1);
        if (isBuy) {
            IERC20(collateralToken).safeTransferFrom(msg.sender, address(this), inputAmount);
            if (outcomeIndex == 0) {
                uint256 amountOut = AMM.cpmmGetAmountOut(cpmm.reserve1, cpmm.reserve0, inputAmount, feeBps);
                require(amountOut > 0, "insufficient output");
                cpmm.reserve1 += inputAmount;
                cpmm.reserve0 -= amountOut;
                cpmm.k = cpmm.reserve0 * cpmm.reserve1;
                outcomeToken.safeTransferFrom(address(this), msg.sender, idNo, amountOut, "");
                outputAmount = amountOut;
            } else {
                uint256 amountOut = AMM.cpmmGetAmountOut(cpmm.reserve0, cpmm.reserve1, inputAmount, feeBps);
                require(amountOut > 0, "insufficient output");
                cpmm.reserve0 += inputAmount;
                cpmm.reserve1 -= amountOut;
                cpmm.k = cpmm.reserve0 * cpmm.reserve1;
                outcomeToken.safeTransferFrom(address(this), msg.sender, idYes, amountOut, "");
                outputAmount = amountOut;
            }
        } else {
            if (outcomeIndex == 0) {
                outcomeToken.safeTransferFrom(msg.sender, address(this), idNo, inputAmount, "");
                uint256 amountOut = AMM.cpmmGetAmountOut(cpmm.reserve0, cpmm.reserve1, inputAmount, feeBps);
                require(amountOut > 0, "insufficient output");
                cpmm.reserve0 += inputAmount;
                cpmm.reserve1 -= amountOut;
                cpmm.k = cpmm.reserve0 * cpmm.reserve1;
                IERC20(collateralToken).safeTransfer(msg.sender, amountOut);
                outputAmount = amountOut;
            } else {
                outcomeToken.safeTransferFrom(msg.sender, address(this), idYes, inputAmount, "");
                uint256 amountOut = AMM.cpmmGetAmountOut(cpmm.reserve1, cpmm.reserve0, inputAmount, feeBps);
                require(amountOut > 0, "insufficient output");
                cpmm.reserve1 += inputAmount;
                cpmm.reserve0 -= amountOut;
                cpmm.k = cpmm.reserve0 * cpmm.reserve1;
                IERC20(collateralToken).safeTransfer(msg.sender, amountOut);
                outputAmount = amountOut;
            }
        }
    }

    /// @dev Handles the swap logic for the LMSR.
    function _swapLMSR(uint256 inputAmount, uint256 outcomeIndex, bool isBuy) internal returns (uint256 outputAmount) {
        uint256 id = outcomeToken.computeTokenId(address(this), outcomeIndex);
        if (isBuy) {
            uint256 amount = _lmsrAmountForBudget(inputAmount, uint8(outcomeIndex));
            uint256 cost = LMSRAMM.calcCostOfBuying(lmsr.netOutcomeTokensSold, lmsr.b, uint8(outcomeIndex), amount);
            require(cost <= inputAmount, "over budget");
            IERC20(collateralToken).safeTransferFrom(msg.sender, address(this), cost);
            lmsr.netOutcomeTokensSold[outcomeIndex] += amount;
            outcomeToken.mint(msg.sender, id, amount);
            outputAmount = amount;
        } else {
            uint256 proceeds = LMSRAMM.calcProceedsOfSelling(lmsr.netOutcomeTokensSold, lmsr.b, uint8(outcomeIndex), inputAmount);
            outcomeToken.burn(msg.sender, id, inputAmount);
            lmsr.netOutcomeTokensSold[outcomeIndex] -= inputAmount;
            IERC20(collateralToken).safeTransfer(msg.sender, proceeds);
            outputAmount = proceeds;
        }
    }

    // --- View Functions ---

    /// @notice Calculates the amount of outcome tokens that can be purchased for a given amount of collateral.
    /// @return The number of outcome tokens that can be bought.
    function calcBuyAmount(uint256 investmentAmount, uint256 outcomeIndex) public view returns (uint256) {
        if (ammType == AMM.AMMType.LMSR) {
            return _lmsrAmountForBudget(investmentAmount, uint8(outcomeIndex));
        }
        if (ammType == AMM.AMMType.CPMM) {
            if (outcomeIndex == 0) {
                return AMM.cpmmGetAmountOut(cpmm.reserve1, cpmm.reserve0, investmentAmount, feeBps);
            } else {
                return AMM.cpmmGetAmountOut(cpmm.reserve0, cpmm.reserve1, investmentAmount, feeBps);
            }
        }
        revert InvalidAMMType();
    }

    /// @notice Calculates the proceeds from selling a given amount of outcome tokens.
    /// @return The amount of collateral that will be received.
    function calcSellAmount(uint256 amount, uint256 outcomeIndex) public view returns (uint256) {
        if (ammType == AMM.AMMType.LMSR) {
            return LMSRAMM.calcProceedsOfSelling(lmsr.netOutcomeTokensSold, lmsr.b, uint8(outcomeIndex), amount);
        }
        if (ammType == AMM.AMMType.CPMM) {
            if (outcomeIndex == 0) {
                return AMM.cpmmGetAmountOut(cpmm.reserve0, cpmm.reserve1, amount, feeBps);
            } else {
                return AMM.cpmmGetAmountOut(cpmm.reserve1, cpmm.reserve0, amount, feeBps);
            }
        }
        revert InvalidAMMType();
    }

    function _lmsrAmountForBudget(uint256 budget, uint8 outcomeIndex) internal view returns (uint256) {
        uint256 lo = 0;
        uint256 hi = budget;
        for (uint256 i = 0; i < 32; i++) {
            uint256 mid = (lo + hi) / 2;
            uint256 cost = LMSRAMM.calcCostOfBuying(lmsr.netOutcomeTokensSold, lmsr.b, outcomeIndex, mid);
            if (cost > budget) {
                hi = mid;
            } else {
                lo = mid + 1;
            }
        }
        return hi;
    }

    /// @notice Returns the balance of a specific outcome token for a given account.
    /// @param account The address of the account.
    /// @param id The ID of the outcome token (0 for NO, 1 for YES).
    /// @return The token balance.
    function balanceOf(address account, uint256 id) public view returns (uint256) {
        return outcomeToken.balanceOf(account, id);
    }

    /// @notice Returns the balances of multiple outcome tokens for multiple accounts.
    /// @param accounts An array of account addresses.
    /// @param ids An array of outcome token IDs.
    /// @return An array of token balances.
    function balanceOfBatch(address[] calldata accounts, uint256[] calldata ids) public view returns (uint256[] memory) {
        return outcomeToken.balanceOfBatch(accounts, ids);
    }
}
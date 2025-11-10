// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import {ABDKMathQuad} from "abdk-libraries-solidity/ABDKMathQuad.sol";

/// @title Logarithmic Market Scoring Rule (LMSR) AMM Library
/// @author Gnosis, with modifications
/// @notice Provides pure functions for an LMSR automated market maker.
/// @dev This implementation is for a binary market (two outcomes).
/// The math is heavily based on Gnosis' implementation and uses fixed-point arithmetic.
library LMSRAMM {
    /// @notice Calculates the cost of purchasing a number of outcome tokens.
    /// @param netOutcomeTokensSold An array containing the number of tokens sold for each outcome.
    /// @param b The liquidity parameter. A larger `b` corresponds to a deeper market.
    /// @param outcomeIndex The index of the outcome token to be purchased.
    /// @param amount The number of outcome tokens to be purchased.
    /// @return cost The cost of the purchase in collateral tokens.
    function calcCostOfBuying(
        uint256[] memory netOutcomeTokensSold,
        uint256 b,
        uint8 outcomeIndex,
        uint256 amount
    ) internal pure returns (uint256 cost) {
        require(netOutcomeTokensSold.length == 2, "LMSRAMM: BINARY_MARKET_ONLY");
        require(outcomeIndex < 2, "LMSRAMM: INVALID_OUTCOME_INDEX");

        bytes16 b_quad = ABDKMathQuad.fromUInt(b);

        bytes16 exp_0 = ABDKMathQuad.exp(ABDKMathQuad.div(ABDKMathQuad.fromUInt(netOutcomeTokensSold[0]), b_quad));
        bytes16 exp_1 = ABDKMathQuad.exp(ABDKMathQuad.div(ABDKMathQuad.fromUInt(netOutcomeTokensSold[1]), b_quad));

        bytes16 initialCost_quad = ABDKMathQuad.mul(b_quad, ABDKMathQuad.ln(ABDKMathQuad.add(exp_0, exp_1)));

        uint256[] memory newNetOutcomeTokensSold = new uint256[](2);
        newNetOutcomeTokensSold[0] = netOutcomeTokensSold[0];
        newNetOutcomeTokensSold[1] = netOutcomeTokensSold[1];
        newNetOutcomeTokensSold[outcomeIndex] += amount;

        bytes16 new_exp_0 = ABDKMathQuad.exp(ABDKMathQuad.div(ABDKMathQuad.fromUInt(newNetOutcomeTokensSold[0]), b_quad));
        bytes16 new_exp_1 = ABDKMathQuad.exp(ABDKMathQuad.div(ABDKMathQuad.fromUInt(newNetOutcomeTokensSold[1]), b_quad));

        bytes16 newCost_quad = ABDKMathQuad.mul(b_quad, ABDKMathQuad.ln(ABDKMathQuad.add(new_exp_0, new_exp_1)));

        cost = ABDKMathQuad.toUInt(ABDKMathQuad.sub(newCost_quad, initialCost_quad));
    }

    /// @notice Calculates the net cost for a set of trades.
    /// @param netOutcomeTokensSold An array containing the number of tokens sold for each outcome.
    /// @param b The liquidity parameter.
    /// @param amounts An array containing the number of tokens to be bought for each outcome.
    /// @return netCost The total cost of all trades.
    function calcNetCost(
        uint256[] memory netOutcomeTokensSold,
        uint256 b,
        uint256[] memory amounts
    ) internal pure returns (uint256 netCost) {
        require(netOutcomeTokensSold.length == 2 && amounts.length == 2, "LMSRAMM: BINARY_MARKET_ONLY");

        bytes16 b_quad = ABDKMathQuad.fromUInt(b);

        bytes16 exp_0 = ABDKMathQuad.exp(ABDKMathQuad.div(ABDKMathQuad.fromUInt(netOutcomeTokensSold[0]), b_quad));
        bytes16 exp_1 = ABDKMathQuad.exp(ABDKMathQuad.div(ABDKMathQuad.fromUInt(netOutcomeTokensSold[1]), b_quad));

        bytes16 initialCost_quad = ABDKMathQuad.mul(b_quad, ABDKMathQuad.ln(ABDKMathQuad.add(exp_0, exp_1)));

        uint256[] memory newNetOutcomeTokensSold = new uint256[](2);
        newNetOutcomeTokensSold[0] = netOutcomeTokensSold[0] + amounts[0];
        newNetOutcomeTokensSold[1] = netOutcomeTokensSold[1] + amounts[1];

        bytes16 new_exp_0 = ABDKMathQuad.exp(ABDKMathQuad.div(ABDKMathQuad.fromUInt(newNetOutcomeTokensSold[0]), b_quad));
        bytes16 new_exp_1 = ABDKMathQuad.exp(ABDKMathQuad.div(ABDKMathQuad.fromUInt(newNetOutcomeTokensSold[1]), b_quad));

        bytes16 newCost_quad = ABDKMathQuad.mul(b_quad, ABDKMathQuad.ln(ABDKMathQuad.add(new_exp_0, new_exp_1)));

        netCost = ABDKMathQuad.toUInt(ABDKMathQuad.sub(newCost_quad, initialCost_quad));
    }

    /// @notice Calculates the price of a single outcome token.
    /// @param netOutcomeTokensSold An array containing the number of tokens sold for each outcome.
    /// @param b The liquidity parameter.
    /// @param outcomeIndex The index of the outcome token.
    /// @return price The price of the outcome token.
    function calcPrice(
        uint256[] memory netOutcomeTokensSold,
        uint256 b,
        uint8 outcomeIndex
    ) internal pure returns (uint256 price) {
        require(netOutcomeTokensSold.length == 2, "LMSRAMM: BINARY_MARKET_ONLY");
        require(outcomeIndex < 2, "LMSRAMM: INVALID_OUTCOME_INDEX");

        bytes16 b_quad = ABDKMathQuad.fromUInt(b);

        bytes16 exp_0 = ABDKMathQuad.exp(ABDKMathQuad.div(ABDKMathQuad.fromUInt(netOutcomeTokensSold[0]), b_quad));
        bytes16 exp_1 = ABDKMathQuad.exp(ABDKMathQuad.div(ABDKMathQuad.fromUInt(netOutcomeTokensSold[1]), b_quad));

        bytes16 price_quad = ABDKMathQuad.div(
            outcomeIndex == 0 ? exp_0 : exp_1,
            ABDKMathQuad.add(exp_0, exp_1)
        );

        price = ABDKMathQuad.toUInt(price_quad);
    }
}
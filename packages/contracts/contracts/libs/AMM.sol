// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

library AMM {
    enum AMMType {
        CPMM,
        LMSR
    }

    struct CPMMData {
        uint256 k;
        uint256 reserve0;
        uint256 reserve1;
    }

    struct LMSRData {
        uint256 b;
        uint256[] netOutcomeTokensSold;
    }
    // returns sorted token addresses, used to handle return values from pairs sorted in this order
    function sortTokens(address tokenA, address tokenB) internal pure returns (address token0, address token1) {
        require(tokenA != tokenB, 'AMM: IDENTICAL_ADDRESSES');
        (token0, token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        require(token0 != address(0), 'AMM: ZERO_ADDRESS');
    }

    /// @notice Calculates the amount of output tokens to be received for a given amount of input tokens.
    /// @param amountIn Amount of input tokens.
    /// @param reserveIn Reserve of input tokens.
    /// @param reserveOut Reserve of output tokens.
    /// @return amountOut Amount of output tokens.
    function getAmountOut(uint256 amountIn, uint256 reserveIn, uint256 reserveOut) internal pure returns (uint256 amountOut) {
        require(amountIn > 0, 'AMM: INSUFFICIENT_INPUT_AMOUNT');
        require(reserveIn > 0 && reserveOut > 0, 'AMM: INSUFFICIENT_LIQUIDITY');
        uint256 amountInWithFee = amountIn * 997;
        uint256 numerator = amountInWithFee * reserveOut;
        uint256 denominator = reserveIn * 1000 + amountInWithFee;
        amountOut = numerator / denominator;
    }

    /// @notice Calculates the amount of input tokens required for a given amount of output tokens.
    /// @param amountOut Amount of output tokens.
    /// @param reserveIn Reserve of input tokens.
    /// @param reserveOut Reserve of output tokens.
    /// @return amountIn Amount of input tokens.
    function getAmountIn(uint256 amountOut, uint256 reserveIn, uint256 reserveOut) internal pure returns (uint256 amountIn) {
        require(amountOut > 0, 'AMM: INSUFFICIENT_OUTPUT_AMOUNT');
        require(reserveIn > 0 && reserveOut > 0, 'AMM: INSUFFICIENT_LIQUIDITY');
        uint256 numerator = reserveIn * amountOut * 1000;
        uint256 denominator = (reserveOut - amountOut) * 997;
        amountIn = (numerator / denominator) + 1;
    }

    /// @notice Calculates the optimal amount of tokenB to deposit for a given amount of tokenA.
    /// @param amountA Amount of tokenA.
    /// @param reserveA Reserve of tokenA.
    /// @param reserveB Reserve of tokenB.
    /// @return amountB Optimal amount of tokenB.
    function quote(uint256 amountA, uint256 reserveA, uint256 reserveB) internal pure returns (uint256 amountB) {
        require(amountA > 0, 'AMM: INSUFFICIENT_AMOUNT');
        require(reserveA > 0 && reserveB > 0, 'AMM: INSUFFICIENT_LIQUIDITY');
        amountB = amountA * reserveB / reserveA;
    }
}
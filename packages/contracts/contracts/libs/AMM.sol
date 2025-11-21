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

    function cpmmGetAmountOut(
        uint256 reserveIn,
        uint256 reserveOut,
        uint256 amountIn,
        uint256 feeBps
    ) internal pure returns (uint256) {
        if (amountIn == 0 || reserveIn == 0 || reserveOut == 0) return 0;
        if (feeBps > 10000) return 0;
        uint256 amountInWithFee = (amountIn * (10000 - feeBps)) / 10000;
        uint256 numerator = amountInWithFee * reserveOut;
        uint256 denominator = reserveIn + amountInWithFee;
        return numerator / denominator;
    }

    function cpmmGetAmountIn(
        uint256 reserveIn,
        uint256 reserveOut,
        uint256 amountOut,
        uint256 feeBps
    ) internal pure returns (uint256) {
        if (amountOut == 0 || reserveIn == 0 || reserveOut == 0) return 0;
        if (amountOut >= reserveOut) return 0;
        if (feeBps > 10000) return 0;
        uint256 numerator = reserveIn * amountOut * 10000;
        uint256 denominator = (reserveOut - amountOut) * (10000 - feeBps);
        return numerator / denominator + 1;
    }
}
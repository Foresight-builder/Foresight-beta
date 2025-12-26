// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

/// @title IOracle Interface
/// @notice Interface for oracle contracts that can resolve markets.
interface IOracle {
    /// @notice Returns the outcome of the market.
    /// @dev Should revert if the outcome is not yet available.
    /// @return outcomeIndex The resolved outcome index.
    ///         Implementations MAY return `type(uint256).max` to signal INVALID/UNRESOLVABLE outcome.
    function getOutcome(bytes32 marketId) external view returns (uint256);
}
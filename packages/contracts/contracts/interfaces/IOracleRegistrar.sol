// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

/// @title IOracleRegistrar Interface
/// @notice Interface for oracles that support market registration.
/// @dev Markets call this during initialization to register metadata (resolution time, outcome count).
///      This enables Polymarket-style time-gated assertions.
interface IOracleRegistrar {
    /// @notice Registers a market with the oracle.
    /// @dev Called by market contracts during initialization.
    /// @param marketId Unique identifier for the market.
    /// @param resolutionTime Unix timestamp after which the market can be resolved.
    /// @param outcomeCount Number of possible outcomes (2 for binary, 2-8 for multi).
    function registerMarket(bytes32 marketId, uint64 resolutionTime, uint8 outcomeCount) external;
}


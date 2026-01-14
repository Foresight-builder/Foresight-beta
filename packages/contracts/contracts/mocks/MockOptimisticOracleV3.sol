// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract MockOptimisticOracleV3 {
    event AssertionCreated(bytes32 assertionId, bytes claim, address asserter);
    event AssertionResolved(bytes32 assertionId, bool assertedTruthfully);
    event AssertionDisputed(bytes32 assertionId);

    struct Assertion {
        bytes claim;
        address asserter;
        address callbackRecipient;
        address escalationManager;
        bool arbitrateViaEscalationManager;
        bool disregardProposals;
        address currency;
        uint256 bond;
        bytes32 identifier;
        bool resolved;
        bool truthful;
    }

    mapping(bytes32 => Assertion) public assertions;
    uint256 public assertionCounter;

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
    ) external returns (bytes32 assertionId) {
        assertionId = keccak256(abi.encodePacked(claim, asserter, block.timestamp, assertionCounter++));
        
        assertions[assertionId] = Assertion({
            claim: claim,
            asserter: asserter,
            callbackRecipient: callbackRecipient,
            escalationManager: escalationManager,
            arbitrateViaEscalationManager: arbitrateViaEscalationManager,
            disregardProposals: disregardProposals,
            currency: currency,
            bond: bond,
            identifier: identifier,
            resolved: false,
            truthful: true
        });
        
        emit AssertionCreated(assertionId, claim, asserter);
        return assertionId;
    }

    function settle(bytes32 assertionId) external {
        Assertion storage assertion = assertions[assertionId];
        require(!assertion.resolved, "Already resolved");
        
        assertion.resolved = true;
        assertion.truthful = true;
        
        emit AssertionResolved(assertionId, true);
        
        // Call back to recipient
        if (assertion.callbackRecipient != address(0)) {
            (bool success,) = assertion.callbackRecipient.call(
                abi.encodeWithSignature("assertionResolvedCallback(bytes32,bool)", assertionId, true)
            );
        }
    }

    function disputeAssertion(bytes32 assertionId) external {
        emit AssertionDisputed(assertionId);
        
        // Call back to recipient
        Assertion storage assertion = assertions[assertionId];
        if (assertion.callbackRecipient != address(0)) {
            (bool success,) = assertion.callbackRecipient.call(
                abi.encodeWithSignature("assertionDisputedCallback(bytes32)", assertionId)
            );
        }
    }
}
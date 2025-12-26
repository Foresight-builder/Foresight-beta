// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/token/ERC1155/ERC1155Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

/// @title OutcomeToken1155
/// @author Foresight
/// @notice Shared ERC1155 token contract for multiple markets and outcomes.
/// @dev Markets must be granted MINTER_ROLE to mint/burn users' outcome tokens.
///      Token IDs are computed as: (uint256(uint160(market)) << 32) | outcomeIndex
///
///      Gas optimizations:
///      - Assembly for computeTokenId
///      - Calldata arrays for batch operations
/// @custom:security-contact security@foresight.io
contract OutcomeToken1155 is Initializable, ERC1155Upgradeable, AccessControlUpgradeable, UUPSUpgradeable {
    /// @notice Role identifier for addresses allowed to mint and burn tokens.
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    /// @notice Initializes the token contract.
    /// @dev Grants DEFAULT_ADMIN_ROLE to the deployer.
    /// @param uri_ The base URI for token metadata.
    function initialize(string memory uri_) public initializer {
        __ERC1155_init(uri_);
        __AccessControl_init();
        __UUPSUpgradeable_init();
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    /// @notice Updates the base URI for token metadata.
    /// @dev Can only be called by admin.
    /// @param newuri The new base URI.
    function setURI(string memory newuri) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _setURI(newuri);
    }

    /// @notice Grants MINTER_ROLE to an address (typically a market contract).
    /// @dev Can only be called by admin.
    /// @param minter The address to grant minting rights to.
    function grantMinter(address minter) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _grantRole(MINTER_ROLE, minter);
    }

    /// @notice Revokes MINTER_ROLE from an address.
    /// @dev Can only be called by admin.
    /// @param minter The address to revoke minting rights from.
    function revokeMinter(address minter) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _revokeRole(MINTER_ROLE, minter);
    }

    /// @notice Mints outcome tokens to a user.
    /// @dev Can only be called by addresses with MINTER_ROLE.
    /// @param to The recipient address.
    /// @param id The token ID (computed from market address and outcome index).
    /// @param amount The amount to mint.
    function mint(address to, uint256 id, uint256 amount) external onlyRole(MINTER_ROLE) {
        _mint(to, id, amount, "");
    }

    /// @notice Mints multiple outcome tokens to a user in a single transaction.
    /// @dev Can only be called by addresses with MINTER_ROLE.
    /// @param to The recipient address.
    /// @param ids Array of token IDs to mint.
    /// @param amounts Array of amounts corresponding to each token ID.
    function mintBatch(address to, uint256[] calldata ids, uint256[] calldata amounts) external onlyRole(MINTER_ROLE) {
        _mintBatch(to, ids, amounts, "");
    }

    /// @notice Burns outcome tokens from a user.
    /// @dev Can only be called by addresses with MINTER_ROLE.
    ///      The caller must have approval or the user must have granted setApprovalForAll.
    /// @param from The address to burn tokens from.
    /// @param id The token ID to burn.
    /// @param amount The amount to burn.
    function burn(address from, uint256 id, uint256 amount) external onlyRole(MINTER_ROLE) {
        _burn(from, id, amount);
    }

    /// @notice Burns multiple outcome tokens from a user in a single transaction.
    /// @dev Can only be called by addresses with MINTER_ROLE.
    ///      The caller must have approval or the user must have granted setApprovalForAll.
    /// @param from The address to burn tokens from.
    /// @param ids Array of token IDs to burn.
    /// @param amounts Array of amounts corresponding to each token ID.
    function burnBatch(address from, uint256[] calldata ids, uint256[] calldata amounts) external onlyRole(MINTER_ROLE) {
        _burnBatch(from, ids, amounts);
    }

    /// @notice Utility to compute a unique token id from market address and outcome index.
    /// @dev Uses assembly for gas efficiency.
    ///      Packs market address (160 bits) left-shifted by 32 and outcome index in lower 32 bits.
    /// @param market The market contract address.
    /// @param outcomeIndex The outcome index (0 to outcomeCount-1).
    /// @return tokenId The unique token ID.
    function computeTokenId(address market, uint256 outcomeIndex) external pure returns (uint256 tokenId) {
        assembly {
            tokenId := or(shl(32, market), outcomeIndex)
        }
    }

    /// @notice Batch query balances for a user across multiple token IDs.
    /// @dev Gas-efficient batch balance query.
    /// @param user The address to query.
    /// @param ids Array of token IDs to query.
    /// @return balances Array of balances corresponding to each token ID.
    function balanceOfBatch(address user, uint256[] calldata ids) external view returns (uint256[] memory balances) {
        uint256 n = ids.length;
        balances = new uint256[](n);
        for (uint256 i; i < n;) {
            balances[i] = balanceOf(user, ids[i]);
            unchecked { ++i; }
        }
    }

    /// @notice Checks if the contract supports a given interface.
    /// @param interfaceId The interface identifier to check.
    /// @return True if the interface is supported.
    function supportsInterface(bytes4 interfaceId) public view virtual override(AccessControlUpgradeable, ERC1155Upgradeable) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    /// @dev Authorizes contract upgrades. Only callable by admin.
    function _authorizeUpgrade(address newImplementation) internal override onlyRole(DEFAULT_ADMIN_ROLE) {}
}

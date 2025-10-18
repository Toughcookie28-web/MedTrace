// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./StakeholderRegistry.sol";

/**
 * @title PartnershipRegistry
 * @notice Manages recursive partnership vouching in the supply chain
 * @dev Allows verified manufacturers to vouch for distributors,
 *      and distributors to vouch for pharmacies (recursive trust chain)
 */
contract PartnershipRegistry {
    StakeholderRegistry public stakeholderRegistry;

    struct Partnership {
        address voucher;        // Who vouched for this address
        uint256 timestamp;      // When the partnership was established
        bool isActive;          // Whether partnership is still active
        StakeholderRegistry.Role voucherRole; // Role of the voucher
    }

    // partner address => Partnership details
    mapping(address => Partnership) public partnerships;

    // voucher address => array of partners they've vouched for
    mapping(address => address[]) public vouchedPartners;

    event PartnershipEstablished(
        address indexed voucher,
        address indexed partner,
        StakeholderRegistry.Role voucherRole,
        StakeholderRegistry.Role partnerRole
    );

    event PartnershipRevoked(address indexed voucher, address indexed partner);

    constructor(address _stakeholderRegistryAddress) {
        stakeholderRegistry = StakeholderRegistry(_stakeholderRegistryAddress);
    }

    /**
     * @notice Establish a partnership by vouching for a downstream stakeholder
     * @dev Any verified stakeholder can vouch for their downstream partners
     * @param partner The address to vouch for
     * @param partnerRole The role to assign to the partner
     *
     * Rules:
     * - Manufacturer (with verified credential) → can vouch for Distributor
     * - Distributor (vouched by Manufacturer) → can vouch for Pharmacy
     * - Creates recursive trust chain back to verified manufacturer
     */
    function establishPartnership(address partner, StakeholderRegistry.Role partnerRole)
        external
    {
        require(partner != address(0), "Invalid partner address");
        require(partner != msg.sender, "Cannot vouch for yourself");

        // Get caller's role
        StakeholderRegistry.Role callerRole = stakeholderRegistry.getRole(msg.sender);
        require(callerRole != StakeholderRegistry.Role.None, "Caller not a stakeholder");

        // Verify partnership hierarchy is valid
        require(
            isValidPartnershipHierarchy(callerRole, partnerRole),
            "Invalid partnership hierarchy"
        );

        // For Manufacturers: Must have verified credential
        if (callerRole == StakeholderRegistry.Role.Manufacturer) {
            require(
                stakeholderRegistry.hasVerifiedCredential(msg.sender),
                "Manufacturer lacks verified credential"
            );
        }

        // For non-Manufacturers: Must themselves be vouched for (recursive check)
        if (callerRole != StakeholderRegistry.Role.Manufacturer) {
            require(
                partnerships[msg.sender].isActive,
                "Voucher must be verified through trust chain"
            );
        }

        // Check if partner is already vouched for
        if (partnerships[partner].voucher != address(0)) {
            require(!partnerships[partner].isActive, "Partner already has active voucher");
        }

        // Establish the partnership
        partnerships[partner] = Partnership({
            voucher: msg.sender,
            timestamp: block.timestamp,
            isActive: true,
            voucherRole: callerRole
        });

        vouchedPartners[msg.sender].push(partner);

        // Automatically register the partner's role in StakeholderRegistry
        stakeholderRegistry.addStakeholder(partner, partnerRole);

        emit PartnershipEstablished(msg.sender, partner, callerRole, partnerRole);
    }

    /**
     * @notice Revoke a partnership (voucher can revoke their vouching)
     * @param partner The partner to revoke vouching for
     */
    function revokePartnership(address partner) external {
        Partnership storage partnership = partnerships[partner];
        require(partnership.voucher == msg.sender, "Not the voucher");
        require(partnership.isActive, "Partnership already inactive");

        partnership.isActive = false;

        emit PartnershipRevoked(msg.sender, partner);
    }

    /**
     * @notice Check if partnership hierarchy is valid
     * @param voucher The role of the voucher
     * @param partner The role of the partner being vouched for
     * @return Whether the hierarchy is valid
     */
    function isValidPartnershipHierarchy(
        StakeholderRegistry.Role voucher,
        StakeholderRegistry.Role partner
    ) public pure returns (bool) {
        // Manufacturer → Distributor
        if (
            voucher == StakeholderRegistry.Role.Manufacturer &&
            partner == StakeholderRegistry.Role.Distributor
        ) {
            return true;
        }

        // Distributor → Pharmacy
        if (
            voucher == StakeholderRegistry.Role.Distributor &&
            partner == StakeholderRegistry.Role.Pharmacist
        ) {
            return true;
        }

        return false;
    }

    /**
     * @notice Verify the complete trust chain back to a licensed manufacturer
     * @dev Recursively walks up the voucher chain
     * @param stakeholder The address to verify
     * @return isValid Whether the trust chain is valid
     * @return rootManufacturer The verified manufacturer at the root
     */
    function verifyTrustChain(address stakeholder)
        public
        view
        returns (bool isValid, address rootManufacturer)
    {
        // Base case: If they're a manufacturer with credential, chain is valid
        StakeholderRegistry.Role role = stakeholderRegistry.getRole(stakeholder);
        if (role == StakeholderRegistry.Role.Manufacturer) {
            bool hasCredential = stakeholderRegistry.hasVerifiedCredential(stakeholder);
            return (hasCredential, hasCredential ? stakeholder : address(0));
        }

        // Recursive case: Check their voucher
        Partnership memory partnership = partnerships[stakeholder];
        if (partnership.voucher == address(0) || !partnership.isActive) {
            return (false, address(0)); // No valid voucher
        }

        // Recursively verify the voucher's trust chain
        return verifyTrustChain(partnership.voucher);
    }

    /**
     * @notice Get the full trust chain for a stakeholder
     * @param stakeholder The address to check
     * @return chain Array of addresses from stakeholder up to root manufacturer
     */
    function getTrustChain(address stakeholder)
        external
        view
        returns (address[] memory chain)
    {
        // Estimate max depth (Manufacturer → Distributor → Pharmacy = 3 levels)
        address[] memory tempChain = new address[](10);
        uint256 length = 0;

        address current = stakeholder;
        while (current != address(0) && length < 10) {
            tempChain[length] = current;
            length++;

            Partnership memory partnership = partnerships[current];
            if (partnership.voucher == address(0)) break;

            current = partnership.voucher;
        }

        // Resize array to actual length
        chain = new address[](length);
        for (uint256 i = 0; i < length; i++) {
            chain[i] = tempChain[i];
        }

        return chain;
    }

    /**
     * @notice Get all partners vouched for by an address
     * @param voucher The voucher address
     * @return Array of partner addresses
     */
    function getVouchedPartners(address voucher)
        external
        view
        returns (address[] memory)
    {
        return vouchedPartners[voucher];
    }

    /**
     * @notice Check if an address has an active partnership
     * @param partner The address to check
     * @return Whether they have an active voucher
     */
    function hasActivePartnership(address partner) external view returns (bool) {
        return partnerships[partner].isActive;
    }
}

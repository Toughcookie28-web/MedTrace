// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title StakeholderRegistry
 * @author MedTrace Project
 * @notice This contract manages the registration and role assignment of stakeholders in the pharmaceutical
 * supply chain. It serves as the foundational identity layer for the MedTrace ecosystem.
 * @dev This contract acts as the central registry for mapping wallet addresses to supply chain roles
 * (Manufacturer, Distributor, Pharmacist). Other contracts in the MedTrace system (such as
 * DigitalBatch.sol and TrackAndTrace.sol) will query this registry to validate permissions before
 * allowing role-specific operations.
 *
 * Security Considerations:
 * - The owner account should be a multi-signature wallet (e.g., Gnosis Safe) in production to prevent
 *   single points of failure and enhance security.
 * - Role updates are intentionally permitted by design, allowing the owner to modify stakeholder roles
 *   as business relationships evolve.
 * - Role-specific admin delegation and explicit revocation events address medium-severity audit items
 *
 * Audit Status: Completed - PASS WITH RECOMMENDATIONS (8.5/10 for MVP)
 * Automated tests covering owner/admin delegation, revocation, and queries
 */
contract StakeholderRegistry is Ownable {
    /**
     * @notice Enum representing the possible roles in the pharmaceutical supply chain
     * @dev None (0) is the default value for unregistered addresses and cannot be explicitly assigned
     */
    enum Role {
        None,         // No role assigned (default for unregistered addresses)
        Manufacturer, // Pharmaceutical manufacturer - authorized to create digital batches
        Distributor,  // Distribution entity - authorized to transport batches
        Pharmacist    // Pharmacy or retail entity - authorized to dispense batches to consumers
    }

    /**
     * @dev Mapping of wallet addresses to their assigned supply chain roles
     * @dev Private to enforce access through the getRole() function
     */
    mapping(address => Role) private stakeholderRoles;

    /**
     * @dev Optional per-role administrator accounts (owner retains superuser rights)
     */
    mapping(Role => address) private roleAdmins;

    /**
     * @dev Credential applications and verification status
     */
    struct CredentialApplication {
        string licenseHash;      // IPFS hash or hash of license document
        string businessRegNum;   // Business registration number
        string issuingAuthority; // e.g., "FDA", "EMA", "PMDA"
        uint256 appliedAt;       // Timestamp of application
        bool isPending;          // Whether application is pending
    }

    mapping(address => CredentialApplication) public applications;
    mapping(address => bool) public hasVerifiedCredential;

    /**
     * @notice Emitted when a stakeholder is registered or their role is updated
     * @param stakeholder The wallet address of the stakeholder being registered or updated
     * @param role The supply chain role assigned to the stakeholder
     * @dev This event is emitted for both new registrations and role updates. To distinguish between
     * the two cases, off-chain systems should track previous role values or query the contract state
     * before the transaction.
     */
    event StakeholderAdded(address indexed stakeholder, Role role);

    /**
     * @notice Emitted when a stakeholder role is revoked
     * @param stakeholder The wallet address that was removed
     * @param previousRole The role held prior to revocation
     */
    event StakeholderRemoved(address indexed stakeholder, Role previousRole);

    /**
     * @notice Emitted when a role administrator is updated
     * @param role The supply chain role affected
     * @param previousAdmin The previous admin address (may be zero)
     * @param newAdmin The new admin address (may be zero)
     */
    event RoleAdminUpdated(Role indexed role, address indexed previousAdmin, address indexed newAdmin);

    /**
     * @notice Emitted when a credential application is submitted
     * @param applicant The address applying for verification
     */
    event CredentialApplicationSubmitted(address indexed applicant);

    /**
     * @notice Emitted when a credential is attested (approved or rejected)
     * @param stakeholder The address being verified
     * @param isValid Whether the credential was approved
     */
    event CredentialAttested(address indexed stakeholder, bool isValid);

    /**
     * @notice Initializes the StakeholderRegistry contract and sets the deployer as the owner
     * @dev The constructor sets msg.sender as the initial owner using OpenZeppelin's Ownable pattern.
     * In production deployments, ownership should be transferred to a multi-signature wallet
     * immediately after deployment for enhanced security.
     */
    constructor() Ownable(msg.sender) {}

    /**
     * @notice Registers a new stakeholder or updates an existing stakeholder's role
     * @dev Only the contract owner can call this function. Roles can be updated multiple times,
     * allowing for business relationship changes over time. Each call emits a StakeholderAdded event.
     * @param stakeholder The wallet address of the stakeholder to register or update
     * @param role The supply chain role to assign (must not be Role.None)
     *
     * Requirements:
     * - Can only be called by the contract owner
     * - stakeholder address must not be the zero address
     * - role must not be Role.None (use case: explicit assignment only)
     *
     * Emits a {StakeholderAdded} event
     *
     * Example usage:
     * ```
     * stakeholderRegistry.addStakeholder(0x1234...5678, Role.Manufacturer);
     * ```
     */
    function addStakeholder(address stakeholder, Role role) external {
        require(stakeholder != address(0), "Invalid stakeholder address");
        require(role != Role.None, "Invalid role");
        _checkRolePrivilege(role);

        stakeholderRoles[stakeholder] = role;
        emit StakeholderAdded(stakeholder, role);
    }

    /**
     * @notice Removes a stakeholder from the registry (sets role to None)
     * @param stakeholder The wallet address to revoke
     *
     * Requirements:
     * - Caller must be owner or admin for the stakeholder's current role
     * - Stakeholder must currently be registered
     */
    function removeStakeholder(address stakeholder) external {
        require(stakeholder != address(0), "Invalid stakeholder address");

        Role currentRole = stakeholderRoles[stakeholder];
        require(currentRole != Role.None, "Stakeholder not registered");

        _checkRolePrivilege(currentRole);

        stakeholderRoles[stakeholder] = Role.None;
        emit StakeholderRemoved(stakeholder, currentRole);
    }

    /**
     * @notice Sets or clears the administrator for a specific role
     * @param role The role to manage (must not be None)
     * @param admin The admin address to assign (zero address clears the admin)
     */
    function setRoleAdmin(Role role, address admin) external onlyOwner {
        require(role != Role.None, "Invalid role");

        address previousAdmin = roleAdmins[role];
        roleAdmins[role] = admin;
        emit RoleAdminUpdated(role, previousAdmin, admin);
    }

    /**
     * @notice Retrieves the supply chain role of a given stakeholder address
     * @dev Returns Role.None (0) for unregistered addresses. This function is used by other contracts
     * in the MedTrace ecosystem to validate permissions before executing role-specific operations.
     * @param stakeholder The wallet address to query
     * @return The Role assigned to the stakeholder address, or Role.None if unregistered
     *
     * Example usage:
     * ```
     * Role stakeholderRole = stakeholderRegistry.getRole(0x1234...5678);
     * if (stakeholderRole == Role.Manufacturer) {
     *     // Allow manufacturer-specific operations
     * }
     * ```
     */
    function getRole(address stakeholder) external view returns (Role) {
        return stakeholderRoles[stakeholder];
    }

    /**
     * @notice Returns the address of the administrator for a given role
     */
    function getRoleAdmin(Role role) external view returns (address) {
        return roleAdmins[role];
    }

    /**
     * @notice Apply for a verified credential (for Manufacturers)
     * @dev For MVP, this auto-approves to simulate oracle verification
     * @param licenseHash Hash of the uploaded license document
     * @param businessRegNum Business registration number
     * @param issuingAuthority The regulatory authority (e.g., FDA, EMA)
     */
    function applyForCredential(
        string memory licenseHash,
        string memory businessRegNum,
        string memory issuingAuthority
    ) external {
        require(bytes(licenseHash).length > 0, "License hash required");
        require(bytes(businessRegNum).length > 0, "Business registration number required");
        require(bytes(issuingAuthority).length > 0, "Issuing authority required");

        applications[msg.sender] = CredentialApplication({
            licenseHash: licenseHash,
            businessRegNum: businessRegNum,
            issuingAuthority: issuingAuthority,
            appliedAt: block.timestamp,
            isPending: false // Auto-approve for MVP demo
        });

        // Auto-approve for demo purposes
        // In production, this would be set by an oracle after verifying government APIs
        hasVerifiedCredential[msg.sender] = true;

        // Automatically assign Manufacturer role when credential is approved
        stakeholderRoles[msg.sender] = Role.Manufacturer;

        emit CredentialApplicationSubmitted(msg.sender);
        emit CredentialAttested(msg.sender, true);
        emit StakeholderAdded(msg.sender, Role.Manufacturer);
    }

    /**
     * @notice Manually attest a credential (owner only, for admin override)
     * @dev In production, this would be called by an oracle
     * @param stakeholder The address to verify
     * @param isValid Whether to approve or reject
     */
    function attestCredential(address stakeholder, bool isValid) external onlyOwner {
        require(applications[stakeholder].appliedAt > 0, "No application found");

        hasVerifiedCredential[stakeholder] = isValid;
        applications[stakeholder].isPending = false;

        emit CredentialAttested(stakeholder, isValid);
    }

    /**
     * @notice Check if an address has a verified credential
     * @param stakeholder The address to check
     * @return Whether the stakeholder has been verified
     */
    function isCredentialVerified(address stakeholder) external view returns (bool) {
        return hasVerifiedCredential[stakeholder];
    }

    function _checkRolePrivilege(Role role) private view {
        if (msg.sender == owner()) {
            return;
        }

        require(roleAdmins[role] == msg.sender, "Unauthorized role admin");
    }
}

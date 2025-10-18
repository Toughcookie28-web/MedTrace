// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./StakeholderRegistry.sol";

/**
 * @title DigitalBatch
 * @author MedTrace Project
 * @notice ERC-721 NFT contract where each token represents a unique logistical batch of medicine
 * in the pharmaceutical supply chain. Only verified Manufacturer addresses can mint new batches.
 * @dev This contract serves as the digital twin layer for physical pharmaceutical batches, enabling
 * blockchain-based tracking throughout the supply chain. Each minted NFT represents one batch of
 * medicine with immutable metadata stored via tokenURI.
 *
 * Key Features:
 * - ERC-721 compliant NFTs representing pharmaceutical batches
 * - Role-based access control via StakeholderRegistry integration
 * - Only addresses with Manufacturer role can mint batches
 * - Sequential token ID generation starting from 1
 * - Immutable metadata storage captured at mint time
 *
 * Supply Chain Integration:
 * - Integrates with StakeholderRegistry.sol for role-based access control
 * - Will be used by TrackAndTrace.sol for custody transfer operations
 * - Batch owners can transfer ownership representing custody changes
 * - Token metadata (URI) contains batch information (expiry, quantity, etc.)
 *
 * Security Audit Status: Completed - PASS WITH CRITICAL RECOMMENDATIONS
 * Rating: 6.5/10 - MVP acceptable, requires production hardening
 * Test Coverage: Hardhat suite (59 tests) covering minting, burns, enumeration, limits, and governance
 *
 * CRITICAL Issues (Must Address Before Production):
 * 1. Token URIs were mutable via ERC721URIStorage (resolved in v1.1.0)
 *    - Resolution: Metadata is now stored immutably at mint time without ERC721URIStorage
 *
 * 2. mintBatch allowed minting to arbitrary addresses (resolved in v1.1.0)
 *    - Resolution: Minting now requires the manufacturer parameter to match msg.sender
 *
 * HIGH Priority Issues (Recommended for Production):
 * 3. No token burning mechanism (resolved in v1.2.0)
 *    - Resolution: burn() added with owner override and approval checks

 * 4. Immutable StakeholderRegistry address (resolved in v1.2.0)
 *    - Resolution: Owner-managed registry updates with emitted governance events

 * 5. No emergency pause mechanism (resolved in v1.2.0)
 *    - Resolution: Pausable controls halt minting/transfers during incidents
 *
 * 6. Custody bypass risk via direct ERC-721 transfers (resolved in v1.3.0)
 *    - Resolution: Owner-governed custody manager enforces TrackAndTrace-orchestrated transfers with break-glass override
 *
 * This is an MVP implementation. The above issues should be addressed before production deployment
 * to ensure proper security, auditability, and regulatory compliance for pharmaceutical tracking.
 */
contract DigitalBatch is ERC721Enumerable, Ownable, Pausable {
    /**
     * @notice Reference to the StakeholderRegistry contract for role-based access control
     * @dev Owner-governed reference used to verify caller roles prior to minting/administrative checks
     */
    StakeholderRegistry public stakeholderRegistry;

    /**
     * @dev Sequential counter for generating unique token IDs
     * @dev Initialized to 1 in constructor. Incremented after each successful mint.
     * Token IDs are assigned sequentially: 1, 2, 3, ...
     */
    uint256 private _nextTokenId;

    /**
     * @dev Stores immutable token metadata URIs for each batch
     * @dev Once set during minting, URIs cannot be modified or cleared
     */
    mapping(uint256 => string) private _tokenURIs;

    /**
     * @dev Tracks active batch counts per manufacturer for mint limit enforcement
     */
    mapping(address => uint256) private manufacturerActiveBatches;

    /**
     * @dev Records the manufacturer (creator) for each token to support limit decrements on burn
     */
    mapping(uint256 => address) private tokenCreators;

    /**
     * @dev Optional global limit for the number of active batches a manufacturer may mint (0 = unlimited)
     */
    uint256 private manufacturerMintLimit;

    /**
     * @notice Authorized TrackAndTrace (or similar) contract that can initiate custody transfers
     * @dev When set to a non-zero address, all non-mint/non-burn transfers must be initiated by the custody
     * manager (or the DigitalBatch contract owner for break-glass scenarios). Defaults to the contract owner
     * until explicitly updated.
     */
    address public custodyManager;

    /**
     * @notice Emitted when a new pharmaceutical batch NFT is minted
     * @dev This event is emitted after successful batch creation and can be used by off-chain
     * systems to track batch creation events and index batch metadata
     * @param tokenId The unique identifier of the newly minted batch NFT (sequential starting from 1)
     * @param manufacturer The address receiving ownership of the batch NFT (always msg.sender)
     * @param tokenURI The metadata URI containing batch information (IPFS hash, API endpoint, etc.)
     */
    event BatchMinted(uint256 indexed tokenId, address indexed manufacturer, string tokenURI);

    /**
     * @notice Emitted when the StakeholderRegistry reference changes
     * @param previousRegistry The previous registry contract address
     * @param newRegistry The new registry contract address
     */
    event StakeholderRegistryUpdated(address indexed previousRegistry, address indexed newRegistry);

    /**
     * @notice Emitted when a batch is burned (destroyed)
     * @param tokenId The token identifier of the burned batch
     * @param manufacturer The manufacturer that originally minted the batch
     */
    event BatchBurned(uint256 indexed tokenId, address indexed manufacturer);

    /**
     * @notice Emitted when the per-manufacturer mint limit is updated
     * @param previousLimit The previous mint limit (0 = unlimited)
     * @param newLimit The new mint limit (0 = unlimited)
     */
    event ManufacturerMintLimitUpdated(uint256 previousLimit, uint256 newLimit);

    /**
     * @notice Emitted when the custody manager address is updated
     * @param previousManager The previously authorized custody manager (may be zero)
     * @param newManager The new custody manager address (may be zero to clear restrictions)
     */
    event CustodyManagerUpdated(address indexed previousManager, address indexed newManager);

    /**
     * @notice Initializes the DigitalBatch contract with ERC-721 metadata and StakeholderRegistry reference
     * @dev Sets the NFT collection name to "MedTrace Batch" with symbol "MTB". Validates that
     * the provided StakeholderRegistry address is not zero. Initializes token ID counter to 1.
     * @param _stakeholderRegistry Address of the deployed StakeholderRegistry contract
     *
     * Requirements:
     * - _stakeholderRegistry must not be the zero address
     * - _stakeholderRegistry should be a valid, deployed StakeholderRegistry contract
     *
     * Security Note:
     * The StakeholderRegistry address is managed by the contract owner. Governance should protect
     * the update function (e.g., multi-sig) to prevent malicious reconfiguration.
     */
    constructor(address _stakeholderRegistry) ERC721("MedTrace Batch", "MTB") Ownable(msg.sender) {
        require(_stakeholderRegistry != address(0), "Invalid StakeholderRegistry address");
        stakeholderRegistry = StakeholderRegistry(_stakeholderRegistry);
        _nextTokenId = 1;
        manufacturerMintLimit = 0;
        custodyManager = msg.sender;
        emit CustodyManagerUpdated(address(0), custodyManager);
    }

    /**
     * @notice Mints a new pharmaceutical batch NFT to the specified manufacturer address
     * @dev Creates a new ERC-721 token representing a pharmaceutical batch. Only callable by
     * addresses with Manufacturer role in the StakeholderRegistry. Token IDs are assigned
     * sequentially starting from 1. Uses _safeMint to ensure recipient can handle ERC-721 tokens.
     *
     * @param manufacturer The address that will receive ownership of the newly minted batch NFT
     * @param tokenURI_ The metadata URI for the batch (typically IPFS hash or API endpoint containing
     * batch details such as drug name, quantity, expiry date, manufacturing date, etc.)
     * @return The token ID of the newly minted batch NFT
     *
     * Requirements:
     * - Caller (msg.sender) must have Manufacturer role in StakeholderRegistry
     * - manufacturer must equal msg.sender
     * - tokenURI_ must not be an empty string
     * - manufacturer address must be able to receive ERC-721 tokens (checked by _safeMint)
     *
     * Emits a {BatchMinted} event
     *
     * Security Considerations:
     * - Metadata is immutable after minting; attempting to alter requires redeployment
     * - Minting restricted to the manufacturer caller only (resolves prior arbitrary recipient risk)
     * - Optional mint caps per manufacturer can be configured by the contract owner
     * - Access control relies entirely on StakeholderRegistry.getRole() query
     * - Only ipfs:// and https:// URIs are accepted to guard against malformed metadata
     *
     * Example usage:
     * ```
     * // msg.sender must be registered as Manufacturer in StakeholderRegistry
     * uint256 batchId = digitalBatch.mintBatch(
     *     msg.sender,     // manufacturer address (must equal caller)
     *     "ipfs://Qm..."   // metadata URI
     * );
     * ```
     */
    function mintBatch(address manufacturer, string memory tokenURI_) external whenNotPaused returns (uint256) {
        require(
            stakeholderRegistry.getRole(msg.sender) == StakeholderRegistry.Role.Manufacturer,
            "Caller is not a manufacturer"
        );
        require(manufacturer == msg.sender, "Manufacturer address must match caller");
        require(bytes(tokenURI_).length > 0, "Token URI cannot be empty");
        require(_isValidTokenURI(tokenURI_), "Invalid token URI format");
        if (manufacturerMintLimit > 0) {
            require(
                manufacturerActiveBatches[manufacturer] < manufacturerMintLimit,
                "Manufacturer mint limit reached"
            );
        }

        uint256 tokenId = _nextTokenId;
        _nextTokenId++;

        _safeMint(manufacturer, tokenId);
        _tokenURIs[tokenId] = tokenURI_;
        manufacturerActiveBatches[manufacturer] += 1;
        tokenCreators[tokenId] = manufacturer;

        emit BatchMinted(tokenId, manufacturer, tokenURI_);

        return tokenId;
    }

    /**
     * @notice Returns the metadata URI for a given batch token ID
     * @dev Ensures the token exists and then returns the immutable URI stored during minting
     * @param tokenId The token ID to query metadata URI for
     * @return The metadata URI string for the specified token
     *
     * Requirements:
     * - tokenId must exist (reverts if token has not been minted)
     */
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);
        return _tokenURIs[tokenId];
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721Enumerable) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    /**
     * @notice Burns a pharmaceutical batch token
     * @dev Token owners/approved operators or the contract owner can trigger burns
     * @param tokenId The token identifier to burn
     *
     * Emits a {BatchBurned} event.
     */
    function burn(uint256 tokenId) external {
        address tokenOwner = ownerOf(tokenId);
        if (msg.sender != owner()) {
            _checkAuthorized(tokenOwner, msg.sender, tokenId);
        }
        _burn(tokenId);
    }

    /**
     * @notice Updates the StakeholderRegistry reference for role validation
     * @dev Governance action restricted to the contract owner
     * @param newRegistry The new StakeholderRegistry contract address
     */
    function updateStakeholderRegistry(address newRegistry) external onlyOwner {
        require(newRegistry != address(0), "Invalid StakeholderRegistry address");
        address previousRegistry = address(stakeholderRegistry);
        require(newRegistry != previousRegistry, "Registry already set");

        stakeholderRegistry = StakeholderRegistry(newRegistry);
        emit StakeholderRegistryUpdated(previousRegistry, newRegistry);
    }

    /**
     * @notice Updates the authorized custody manager that can initiate NFT transfers
     * @dev Governance action restricted to the contract owner. Setting the manager to the zero address
     * removes the restriction and reverts to standard ERC-721 behavior (not recommended for production).
     * @param newManager The address authorized to orchestrate custody transfers
     */
    function updateCustodyManager(address newManager) external onlyOwner {
        address previousManager = custodyManager;
        require(newManager != previousManager, "Custody manager already set");
        custodyManager = newManager;
        emit CustodyManagerUpdated(previousManager, newManager);
    }

    /**
     * @notice Pauses minting and transferring of batch tokens
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Resumes minting and transferring of batch tokens
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @notice Updates the per-manufacturer mint limit (0 disables the limit)
     * @param newLimit The new maximum number of active batches per manufacturer
     */
    /**
     * @notice Updates the global per-manufacturer mint cap (0 = unlimited)
     * @param newLimit The new maximum number of active batches each manufacturer may hold
     */
    function setManufacturerMintLimit(uint256 newLimit) external onlyOwner {
        uint256 previousLimit = manufacturerMintLimit;
        manufacturerMintLimit = newLimit;
        emit ManufacturerMintLimitUpdated(previousLimit, newLimit);
    }

    /**
     * @notice Returns the current per-manufacturer mint limit (0 indicates no limit)
     */
    function getManufacturerMintLimit() external view returns (uint256) {
        return manufacturerMintLimit;
    }

    /**
     * @notice Returns the number of active batches currently attributed to a manufacturer
     */
    function getManufacturerActiveBatches(address manufacturer) external view returns (uint256) {
        return manufacturerActiveBatches[manufacturer];
    }

    /**
     * @dev Treats the contract owner as an always-authorized operator for break-glass scenarios
     */
    function _checkAuthorized(address tokenOwner, address spender, uint256 tokenId) internal view override(ERC721) {
        if (spender == owner()) {
            return;
        }
        super._checkAuthorized(tokenOwner, spender, tokenId);
    }

    /**
     * @dev Applies pause checks to mints/transfers and clears metadata on burn
     */
    function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
        if (to != address(0)) {
            _requireNotPaused();
            address currentOwner = _ownerOf(tokenId);
            if (currentOwner != address(0)) {
                address manager = custodyManager;
                if (manager != address(0)) {
                    address authorizedCaller = auth;
                    require(
                        authorizedCaller == manager || authorizedCaller == owner(),
                        "Transfers restricted to custody manager"
                    );
                }
            }
        }

        address from = super._update(to, tokenId, auth);

        if (to == address(0)) {
            delete _tokenURIs[tokenId];

            address creator = tokenCreators[tokenId];
            if (creator != address(0) && manufacturerActiveBatches[creator] > 0) {
                manufacturerActiveBatches[creator] -= 1;
            }
            delete tokenCreators[tokenId];

            emit BatchBurned(tokenId, creator);
        }

        return from;
    }

    function _isValidTokenURI(string memory tokenURI_) private pure returns (bool) {
        bytes memory uriBytes = bytes(tokenURI_);
        if (uriBytes.length < 8) {
            return false;
        }

        bytes memory ipfsPrefix = bytes("ipfs://");
        bytes memory httpsPrefix = bytes("https://");

        return
            (uriBytes.length >= ipfsPrefix.length && _startsWith(uriBytes, ipfsPrefix)) ||
            (uriBytes.length >= httpsPrefix.length && _startsWith(uriBytes, httpsPrefix));
    }

    function _startsWith(bytes memory value, bytes memory prefix) private pure returns (bool) {
        if (value.length < prefix.length) {
            return false;
        }
        for (uint256 i = 0; i < prefix.length; i++) {
            if (value[i] != prefix[i]) {
                return false;
            }
        }
        return true;
    }
}

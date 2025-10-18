// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./DigitalBatch.sol";

/**
 * @title SupplyChainEvents
 * @notice Records cryptographically signed IoT sensor data for pharmaceutical batches
 * @dev Uses ecrecover to verify that sensor data was signed by the current batch owner
 */
contract SupplyChainEvents {
    DigitalBatch public digitalBatch;

    struct SensorEvent {
        uint256 tokenId;
        address reporter;
        string temperature;
        string location;
        string notes;
        uint256 timestamp;
        bytes signature;
    }

    // tokenId => array of sensor events
    mapping(uint256 => SensorEvent[]) public batchEvents;

    event SensorDataLogged(
        uint256 indexed tokenId,
        address indexed reporter,
        string temperature,
        string location,
        uint256 timestamp
    );

    constructor(address _digitalBatchAddress) {
        digitalBatch = DigitalBatch(_digitalBatchAddress);
    }

    /**
     * @notice Log sensor data with cryptographic proof
     * @dev Verifies that the signature was created by the current NFT owner
     * @param tokenId The batch token ID
     * @param temperature Temperature reading (e.g., "5.1°C")
     * @param location Location string (e.g., "Warehouse B")
     * @param notes Additional notes
     * @param timestamp Unix timestamp when data was recorded
     * @param signature ECDSA signature from the batch owner
     */
    function logEvent(
        uint256 tokenId,
        string memory temperature,
        string memory location,
        string memory notes,
        uint256 timestamp,
        bytes memory signature
    ) external {
        // 1. Reconstruct the message that was signed
        bytes32 messageHash = keccak256(
            abi.encodePacked(tokenId, temperature, location, notes, timestamp)
        );

        // 2. Apply Ethereum signed message prefix
        bytes32 ethSignedHash = getEthSignedMessageHash(messageHash);

        // 3. Recover signer address from signature
        address signer = recoverSigner(ethSignedHash, signature);

        // 4. Verify signer is the current NFT owner
        address currentOwner = digitalBatch.ownerOf(tokenId);
        require(
            signer == currentOwner,
            "Signature must be from current batch owner"
        );

        // 5. Log the event
        batchEvents[tokenId].push(
            SensorEvent({
                tokenId: tokenId,
                reporter: signer,
                temperature: temperature,
                location: location,
                notes: notes,
                timestamp: timestamp,
                signature: signature
            })
        );

        emit SensorDataLogged(tokenId, signer, temperature, location, timestamp);
    }

    /**
     * @notice Get all sensor events for a batch
     * @param tokenId The batch token ID
     * @return Array of sensor events
     */
    function getBatchEvents(uint256 tokenId)
        external
        view
        returns (SensorEvent[] memory)
    {
        return batchEvents[tokenId];
    }

    /**
     * @notice Get the number of events for a batch
     * @param tokenId The batch token ID
     * @return Number of events
     */
    function getEventCount(uint256 tokenId) external view returns (uint256) {
        return batchEvents[tokenId].length;
    }

    /**
     * @notice Apply Ethereum signed message prefix
     * @dev Matches the format used by eth_sign
     */
    function getEthSignedMessageHash(bytes32 messageHash)
        internal
        pure
        returns (bytes32)
    {
        return
            keccak256(
                abi.encodePacked(
                    "\x19Ethereum Signed Message:\n32",
                    messageHash
                )
            );
    }

    /**
     * @notice Recover the signer address from a signature
     * @param ethSignedHash The hash with Ethereum prefix
     * @param signature The ECDSA signature
     * @return The address that created the signature
     */
    function recoverSigner(bytes32 ethSignedHash, bytes memory signature)
        internal
        pure
        returns (address)
    {
        (bytes32 r, bytes32 s, uint8 v) = splitSignature(signature);
        return ecrecover(ethSignedHash, v, r, s);
    }

    /**
     * @notice Split signature into r, s, v components
     * @param sig The signature bytes
     * @return r First 32 bytes
     * @return s Second 32 bytes
     * @return v Recovery identifier
     */
    function splitSignature(bytes memory sig)
        internal
        pure
        returns (
            bytes32 r,
            bytes32 s,
            uint8 v
        )
    {
        require(sig.length == 65, "Invalid signature length");

        assembly {
            r := mload(add(sig, 32))
            s := mload(add(sig, 64))
            v := byte(0, mload(add(sig, 96)))
        }
    }
}

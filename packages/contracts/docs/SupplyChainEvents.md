# SupplyChainEvents.sol

**File:** `packages/contracts/contracts/SupplyChainEvents.sol`  
**Purpose:** Capture signed IoT telemetry for each `DigitalBatch` token, guaranteeing the data originates from the batch’s current owner.

## Core Responsibilities
- Accept sensor payloads (temperature, location, notes, timestamp) signed by the active batch owner.
- Recover the signer with `ecrecover` and reject submissions that do not match the current owner.
- Persist events per token ID and emit `SensorDataLogged` for off-chain indexing.

## Dependencies
- `DigitalBatch` – supplies `ownerOf(tokenId)` so the contract can confirm the signer is the legitimate custodian.

## Storage & Events
- `batchEvents[tokenId]` – array of `SensorEvent { tokenId, reporter, temperature, location, notes, timestamp, signature }`.
- Event `SensorDataLogged(tokenId, reporter, temperature, location, timestamp)` mirrors writes and enables efficient filtering.

## Data Submission Flow
1. Off-chain application builds a message with `(tokenId, temperature, location, notes, timestamp)` and signs it using the stakeholder’s wallet (same address that currently owns the batch).
2. Call `logEvent` with the payload plus `signature`.
3. Contract recomputes the message hash, applies the Ethereum signed message prefix, recovers the signer, and verifies it matches `digitalBatch.ownerOf(tokenId)`.
4. On success, the event is stored and `SensorDataLogged` is emitted.

### Function Signature
```solidity
function logEvent(
    uint256 tokenId,
    string memory temperature,
    string memory location,
    string memory notes,
    uint256 timestamp,
    bytes memory signature
) external
```

## View Helpers
- `getBatchEvents(uint256 tokenId)` – returns the full array of signed telemetry for the batch.
- `getEventCount(uint256 tokenId)` – quick count for UI pagination or monitoring.

## Signature Helpers
- `getEthSignedMessageHash(bytes32 messageHash)` – reproduces the `\x19Ethereum Signed Message:\n32` prefix behavior used by `eth_sign`.
- `recoverSigner(bytes32 ethSignedHash, bytes memory signature)` – wrapper around `ecrecover`.
- `splitSignature(bytes memory sig)` – splits `(r, s, v)` values; reverts unless the payload length is exactly 65 bytes.

## Integration Checklist
1. Ensure the submitting stakeholder currently owns the `DigitalBatch` token; transfers invalidate old credentials.
2. Recommended message format before hashing (string concatenation order must match `abi.encodePacked` call):
   ```
   abi.encodePacked(tokenId, temperature, location, notes, timestamp)
   ```
   Include high-precision timestamps (e.g., seconds since epoch) to avoid replay collisions.
3. To guard against replay attacks, off-chain systems should reject identical `(tokenId, timestamp)` pairs or maintain additional nonce tracking.
4. Subscribe to `SensorDataLogged` when building analytics dashboards; avoid reading unbounded arrays on-chain for large histories.

## Security Considerations
- Anyone can relay data as long as they supply a valid signature; this enables gateway relayers but makes signature validation critical.
- Because data is stored as strings, enforce consistent formatting off-chain (e.g., JSON with units) so analyzers can parse values reliably.
- Timestamps are supplied by the signer; consider cross-checking with block timestamps or requiring monotonic increases to mitigate stale data.
- Stored arrays are unbounded. Use pagination patterns or event indexing for long-running batches.

## Testing & Validation
- Unit tests should cover: correct signature acceptance, rejection when signer is not the owner, replay attempts with switched parameters, and the structure of emitted events.
- Add integration tests that transfer the batch between stakeholders and confirm prior owners can no longer submit sensor data.

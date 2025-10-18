# TrackAndTrace.sol

**File:** `packages/contracts/contracts/TrackAndTrace.sol`  
**Purpose:** Custody and compliance orchestration for every `DigitalBatch` NFT.

## Core Responsibilities
- Enforce regulated custody transfers between registered stakeholders and keep an immutable custody trail.
- Record supply-chain telemetry and receipt acknowledgements directly on-chain for auditable timelines.
- Provide governance hooks (pause, dependency rotation) so operations teams can respond to incidents safely.

## Dependencies
| Dependency | Reason |
|------------|--------|
| `StakeholderRegistry` | Validates that custody recipients and event loggers hold an authorized role. |
| `DigitalBatch` | Source of truth for token ownership; executes `safeTransferFrom` during custody changes. |
| OpenZeppelin `Ownable`, `Pausable` | Governance and emergency controls. |

DigitalBatch must set this contract as its `custodyManager`; otherwise direct ERC-721 transfers could bypass the audit trail.

## Storage & Events
- `batchEvents[tokenId]` – append-only array of `Event { logger, timestamp, eventData }`.
- `custodyHistory[tokenId]` – append-only array of `CustodyRecord { from, to, timestamp }`.
- `receiptAcknowledgements[tokenId][address]` – tracks whether a recipient confirmed delivery.
- Emitted events:
  - `CustodyTransferred` – indexed by token, from, to.
  - `EventLogged` – indexed by token and logger; mirrors `batchEvents`.
  - `ReceiptAcknowledged` – signals incoming → inventory transition.
  - `StakeholderRegistryUpdated`, `DigitalBatchUpdated` – dependency governance.

Because arrays grow without bound, callers should lean on pagination helpers or indexer subscriptions for large histories.

## Primary Workflows
### Custody Transfer
```solidity
function transferCustody(uint256 tokenId, address to) external whenNotPaused
```
Steps:
1. Look up the caller via `digitalBatch.ownerOf`; revert if not the owner.  
2. Ensure `to` is non-zero, different from sender, and registered in `StakeholderRegistry`.  
3. Push a `CustodyRecord`, emit `CustodyTransferred`, then call `digitalBatch.safeTransferFrom(from, to, tokenId)`.  
4. Requires the caller to have granted approval (`setApprovalForAll` or `approve`) beforehand.

### Event Logging
```solidity
function logEvent(uint256 tokenId, string memory eventData) external whenNotPaused
```
- Caller must own the batch and have a registered role.
- `eventData` must be non-empty (recommend structured JSON with off-chain validation).
- Appends to `batchEvents` and emits `EventLogged`.

### Receipt Acknowledgement
```solidity
function acknowledgeReceipt(uint256 tokenId, string memory receiptData) external whenNotPaused
```
- Caller must own the batch, have a valid role, and not have acknowledged previously.
- Marks the acknowledgement flag and logs both `ReceiptAcknowledged` and `EventLogged`.

### Read APIs
- `getBatchEvents`, `getCustodyHistory` – full arrays (best for short histories).
- `getBatchEventCount`, `getCustodyHistoryCount` – O(1) counters for UI pagination.
- `getBatchEventsPaginated`, `getCustodyHistoryPaginated` – windowed reads with bounds checking.
- `isReceiptAcknowledged(tokenId, stakeholder)` – simple boolean helper for UI state.

## Governance & Maintenance
- `updateStakeholderRegistry(address)` – owner-only; rotate registry reference after pausing operations. Emits `StakeholderRegistryUpdated`.
- `updateDigitalBatch(address)` – owner-only; ensure the new DigitalBatch instance has set this contract as custody manager before switching. Emits `DigitalBatchUpdated`.
- `pause()` / `unpause()` – freeze or resume custody and event intake. Recommended before dependency rotations or during incidents.

## Integration Checklist
1. Deployment order: StakeholderRegistry → DigitalBatch → TrackAndTrace.
2. Immediately call `digitalBatch.updateCustodyManager(trackAndTraceAddress)` after deployment.
3. Front ends must require stakeholders to call `digitalBatch.setApprovalForAll(trackAndTrace, true)` (or per-token `approve`) before using custody features.
4. Off-chain services should subscribe to `CustodyTransferred`, `EventLogged`, and `ReceiptAcknowledged` for monitoring and analytics instead of reading arrays repeatedly.
5. When marshalling `eventData`, prefer concise JSON and store large attachments on IPFS; include the hash in the payload.

## Security Considerations
- Arrays are unbounded—heavy batches should rely on pagination or off-chain indexing to avoid gas exhaustion.
- `block.timestamp` is accepted with ±15s drift; document this tolerance in compliance processes.
- Direct ERC-721 transfers from DigitalBatch will revert once custody manager restrictions are active; monitor for unexpected reverts signalling misconfiguration.
- Always pause before swapping dependencies and confirm approvals remain intact afterward.

## Testing & Validation
- Hardhat suite: `npx hardhat test test/TrackAndTrace.ts` (includes 150+ specs covering custody, pagination, and governance).
- Integration smoke test: mint batch → approve TrackAndTrace → transfer custody → acknowledge receipt → inspect histories.
- When extending event schemas, add regression tests ensuring pagination still works and no reentrancy risk is introduced.

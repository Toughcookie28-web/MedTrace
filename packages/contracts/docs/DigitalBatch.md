# DigitalBatch.sol

**File:** `packages/contracts/contracts/DigitalBatch.sol`  
**Token standard:** ERC-721 Enumerable (`name: "MedTrace Batch"`, `symbol: "MTB"`)

## Core Responsibilities
- Mint immutable NFTs that represent physical pharmaceutical batches.
- Enforce that only verified manufacturers (per `StakeholderRegistry`) can mint and must mint to themselves.
- Gate secondary transfers via a custody manager (expected to be `TrackAndTrace`) so the custody audit trail cannot be bypassed.
- Provide governance hooks for pausing operations, rotating dependencies, and optionally capping active batches per manufacturer.

## Dependencies
| Dependency | Purpose |
|------------|---------|
| `StakeholderRegistry` | Role validation for minting and administrative checks. Can be rotated by the owner. |
| `TrackAndTrace` (via `custodyManager`) | Orchestrates transfers; DigitalBatch enforces calls come from the configured manager or owner. |
| OpenZeppelin `ERC721Enumerable`, `Ownable`, `Pausable` | NFT foundation, ownership, and pause control. |

## Storage & Events
- `_nextTokenId` sequentially allocates IDs starting at 1.
- `_tokenURIs[tokenId]` stores immutable metadata (cleared on burn).
- `manufacturerActiveBatches[address]` tracks active batches for optional caps.
- `tokenCreators[tokenId]` records the minting manufacturer to adjust counts on burn.
- `manufacturerMintLimit` (0 = no limit) defines global per-manufacturer cap.
- `custodyManager` holds the authorized transfer orchestrator address.
- Emits:
  - `BatchMinted`, `BatchBurned` – lifecycle.
  - `StakeholderRegistryUpdated`, `CustodyManagerUpdated`, `ManufacturerMintLimitUpdated` – governance changes.

## Primary Workflows
### Minting
```solidity
function mintBatch(address manufacturer, string memory tokenURI_) external whenNotPaused returns (uint256)
```
Requirements: caller registered as `Role.Manufacturer`, `manufacturer == msg.sender`, non-empty URI prefixed with `ipfs://` or `https://`, optional mint limit respected. On success, the token is safely minted, metadata recorded, per-manufacturer counter incremented, and `BatchMinted` emitted.

### Burning
```solidity
function burn(uint256 tokenId) external
```
Accessible by the token owner, an approved operator, or the contract owner (break-glass). The override cleans metadata, decrements counters, deletes creator mapping, and emits `BatchBurned`.

### Transfer Enforcement
`_update` intercepts all transfers. When `custodyManager` is set, only calls routed through the custody manager or the owner proceed; otherwise the transfer reverts with `"Transfers restricted to custody manager"`. This ensures TrackAndTrace remains the single custody path.

## Governance & Maintenance
- `updateStakeholderRegistry(address newRegistry)` – owner-only, rejects zero address and no-op updates; announce change via emitted event.
- `updateCustodyManager(address newManager)` – owner-only. Set immediately after TrackAndTrace deployment; zero address should be used only in controlled tests.
- `setManufacturerMintLimit(uint256 newLimit)` – owner-only; updates the per-manufacturer cap.
- `pause()` / `unpause()` – halt or resume mints and transfers (burns remain callable).

## View & Analytics Helpers
- `tokenURI(uint256 tokenId)` – immutable metadata pointer.
- `getManufacturerMintLimit()` / `getManufacturerActiveBatches(address)` – expose cap configuration and live counts.
- Enumerable inherited helpers: `totalSupply`, `tokenByIndex`, `tokenOfOwnerByIndex`.

## Integration Checklist
1. Deploy StakeholderRegistry → deploy DigitalBatch with registry address.
2. Immediately transfer DigitalBatch ownership to multi-sig governance (production).
3. After TrackAndTrace deployment, call `updateCustodyManager(trackAndTraceAddress)` to lock transfers through the orchestrator.
4. Ensure manufacturers approve TrackAndTrace through `setApprovalForAll` before calling `transferCustody`.
5. Use IPFS/HTTPS metadata containing batch info; metadata cannot be changed after mint.

### Example (ethers.js)
```javascript
const DigitalBatch = await ethers.getContractFactory("DigitalBatch");
const digitalBatch = await DigitalBatch.deploy(stakeholderRegistry.address);

await digitalBatch.connect(manufacturer).mintBatch(
  manufacturer.address,
  "ipfs://QmBatchMetadata"
);

await digitalBatch.updateCustodyManager(trackAndTrace.address);
```

## Security Considerations
- Custody protection only works if `custodyManager` is set correctly; add deployment assertions and monitoring.
- All governance functions should be executed from a multi-signature owner to avoid single-key risk.
- Mint URI validation is minimal—clients should still sanitize input. Consider adding allow-listed CID gateways in future hardening.
- Metadata is immutable; corrections require burn + remint with a fresh URI.
- Pause before rotating dependencies or during incidents to avoid partial state transitions.

## Testing & Validation
- Unit tests: `npx hardhat test test/DigitalBatch.ts`
- TrackAndTrace integration suite validates custody manager enforcement and pause flows.
- When modifying `_update`, re-run Foundry fuzz tests (see `contracts/DigitalBatch` section in test suite) to catch regressions.

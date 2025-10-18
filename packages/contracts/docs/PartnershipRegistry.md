# PartnershipRegistry.sol

**File:** `packages/contracts/contracts/PartnershipRegistry.sol`  
**Purpose:** Models a vouched trust chain from licensed manufacturers → distributors → pharmacists.

## Core Responsibilities
- Allow upstream stakeholders to vouch for downstream partners, forming a recursive trust graph.
- Enforce the hierarchy: verified manufacturers can vouch distributors; vouched distributors can vouch pharmacists.
- Emit events so off-chain systems can display partnership requests, acceptances, and revocations.
- Provide view helpers to inspect partnerships, trust chains, and pending relationships.

## Dependencies
- `StakeholderRegistry` – validates caller roles and checks manufacturer credential status.

## Storage & Events
- `partnerships[address]` → `Partnership { voucher, timestamp, isActive, voucherRole }`
- `vouchedPartners[address]` → dynamic array of partners vouched by a given stakeholder.
- Events:
  - `PartnershipEstablished(voucher, partner, voucherRole, partnerRole)` – emitted on successful vouching.
  - `PartnershipAccepted(partner, voucher)` – emitted when the partner acknowledges the relationship.
  - `PartnershipRevoked(voucher, partner)` – emitted when the voucher deactivates the partnership.

## Primary Workflows
### establishPartnership(partner, partnerRole)
- Caller must:
  - Be registered in `StakeholderRegistry`.
  - Respect the hierarchy (`Manufacturer → Distributor`, `Distributor → Pharmacist`).
  - Possess a verified credential if acting as a manufacturer (`hasVerifiedCredential`).
  - Already be vouched (active partnership) if they are not a manufacturer.
- Partner must be a different, non-zero address and must not already have an active voucher.
- Records the partnership and pushes the partner onto the caller’s `vouchedPartners` list.

### acceptPartnership()
- Callable by the partner. Requires an active partnership entry.
- Emits `PartnershipAccepted`; no additional state changes (handshakes are tracked off-chain).

### revokePartnership(partner)
- Callable only by the recorded voucher.
- Marks `isActive` false and emits `PartnershipRevoked`.

### Trust Chain Queries
- `isValidPartnershipHierarchy(voucherRole, partnerRole)` – pure helper with the two allowed hierarchies.
- `verifyTrustChain(address stakeholder)` – traverses vouchers recursively until it finds a credentialed manufacturer; returns `(isValid, rootManufacturer)`.
- `getTrustChain(address stakeholder)` – returns the path from the stakeholder up to the root voucher (max depth 10 for MVP).
- `getVouchedPartners(address voucher)` – read-only list for UI/analytics.
- `hasActivePartnership(address partner)` – boolean helper to check active state quickly.

## Integration Checklist
1. Ensure manufacturer wallets have applied for credentials in `StakeholderRegistry` before they vouch others.
2. Expose an acceptance step in the UI so downstream parties call `acceptPartnership`; the smart contract emits the acknowledgement event even though state is unchanged.
3. When onboarding distributors/pharmacists programmatically, verify `verifyTrustChain(partner)` returns `(true, manufacturer)` before allowing restricted operations.
4. Subscribe to events to keep off-chain mirrors updated; partnerships can be revoked at any time.

## Security Considerations
- Only a single active voucher is supported per partner; subsequent vouchers must wait until the previous one is revoked.
- The MVP trusts manufacturers after auto-credential approval—tighten credential checks once on-chain attestation is introduced.
- `getTrustChain` uses a fixed-size temporary array (length 10) which is sufficient for the current 3-level hierarchy but should be revisited if deeper chains are introduced.
- Revoked partnerships remain in storage for auditability; analytics should filter on `isActive`.

## Testing & Validation
- Add unit tests that cover hierarchy violations, double vouching, credential checks, and revocation flows (`test/PartnershipRegistry.ts` recommended).
- Integration scenario: manufacturer gets credential → vouches distributor → distributor vouches pharmacist → verify trust chain resolves back to manufacturer.

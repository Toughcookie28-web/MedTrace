# StakeholderRegistry.sol

**File:** `packages/contracts/contracts/StakeholderRegistry.sol`  
**Role in system:** Identity root-of-truth for all supply-chain participants.

## Core Responsibilities
- Maintain the enum-based role directory (`None`, `Manufacturer`, `Distributor`, `Pharmacist`).
- Allow the contract owner to delegate per-role admins who can onboard/offboard participants.
- Track manufacturer credential applications (auto-approved in MVP) and emit lifecycle events for every change.
- Provide read APIs (`getRole`, `getRoleAdmin`, `hasVerifiedCredential`) consumed by the rest of the stack.

## Key Storage & Events
| Item | Description |
|------|-------------|
| `stakeholderRoles[address]` | Wallet → assigned role. Returns `Role.None` when unset. |
| `roleAdmins[Role]` | Optional delegate that can manage stakeholders for a specific role. |
| `applications[address]` | Last credential application payload (hashed license, business ID, authority, timestamp, status). |
| `hasVerifiedCredential[address]` | Lightweight flag used by `PartnershipRegistry` and off-chain checks. |
| `StakeholderAdded`, `StakeholderRemoved`, `RoleAdminUpdated` | Always emitted on lifecycle transitions to keep audit trails in sync. |
| `CredentialApplicationSubmitted`, `CredentialAttested` | Signal credential workflow (auto-approved today, oracle-owned later). |

## Primary Functions
- `addStakeholder(address stakeholder, Role role)` – Owner or delegated admin assigns a role. Rejects zero address and `Role.None`.
- `removeStakeholder(address stakeholder)` – Owner or delegated admin clears a stakeholder’s role, emitting `StakeholderRemoved`.
- `setRoleAdmin(Role role, address admin)` – Owner-only governance hook to appoint/clear per-role delegates.
- `applyForCredential(string licenseHash, string businessRegNum, string issuingAuthority)` – Self-service manufacturer flow; auto-approves for MVP and assigns `Role.Manufacturer`.
- `attestCredential(address stakeholder, bool isValid)` – Owner override for manual approvals/revocations.
- `getRole(address)`, `getRoleAdmin(Role)`, `isCredentialVerified(address)` – View helpers used by DigitalBatch, TrackAndTrace, PartnershipRegistry, and the UI.

`_checkRolePrivilege` enforces that only the owner or the role’s admin can mutate state, preventing cross-role escalation.

## Access Control & Security Notes
- Deploy under EOAs only during development; transfer ownership to a multi-sig immediately in real environments.
- Delegated admins are scoped: an admin for `Role.Distributor` cannot onboard manufacturers.
- Credential flow is optimistic for demonstrations; production should replace the in-contract auto-approval with oracle-driven updates via `attestCredential`.
- Events are the canonical change log—off-chain mirrors should subscribe to all lifecycle events to remain in sync.

## Integration Checklist
1. Deploy StakeholderRegistry first so its address can be injected elsewhere.
2. In downstream contracts/modules, hold a reference and guard privileged paths:  
   ```solidity
   require(stakeholderRegistry.getRole(msg.sender) == StakeholderRegistry.Role.Manufacturer, "Not manufacturer");
   ```
3. Use `hasVerifiedCredential` when needing to ensure a manufacturer completed credential onboarding.
4. For admin delegation rotation, call `setRoleAdmin(role, address(0))` to clear, then set the new address.

## Deployment & Testing
- Hardhat ignition example: `npx hardhat ignition deploy ignition/modules/StakeholderRegistry.ts`
- Unit tests: `npx hardhat test test/StakeholderRegistry.ts`
- Validate governance controls using Foundry/Hardhat scripts that attempt cross-role mutations—they should revert.

## Operational Considerations
- Re-registering a wallet fires `StakeholderAdded` again; consumers should persist prior state if they need diff semantics.
- Because storage is only mappings, gas costs remain stable across registry size—no pagination utilities are required.
- Document operational runbooks for revoking compromised wallets (call `removeStakeholder`) and re-issuing credentials.

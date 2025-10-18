# MedTrace dApp – UX / UI Specification

## 1. Product Overview
- **Purpose**: Provide pharmaceutical stakeholders with a role-aware interface for minting, transferring, auditing, and verifying blockchain-backed medicine batches.
- **Primary personas**: Manufacturer, Distributor, Pharmacist, and public verifiers.
- **Interface stack**: React SPA (Vite, TypeScript), ethers.js, REST backend indexer, Solidity smart contracts.

## 2. Application Skeleton
- `NavBar` across all routes with brand link, wallet pill, disconnect control.
- Footer with tagline + tech stack lives beneath routed views.
- Routes:
  - `/` → Wallet-gated dashboard that renders role-specific workspaces.
  - `/verify` → Public verification view keyed by `tokenId` search param.
- Providers:
  - `Web3Provider` handles wallet connection, network validation (Hardhat 31337, Sepolia 11155111), contract instantiation.
  - `AuthProvider` resolves stakeholder role via `StakeholderRegistry.getRole`.

## 3. Connection & Role Flow
1. Visitor lands on `/`; without wallet connection sees hero copy, blue “Connect Wallet” CTA, MetaMask reminder.
2. `connectWallet` requests accounts, instantiates `BrowserProvider`, records address + chainId.
3. Unsupported networks warn via console and skip contract binding; supported networks assign config from `NETWORKS`.
4. `AuthProvider` fetches on-chain role; UI shows “Loading your role…” while pending.
5. Roles map to dashboards: Manufacturer, Distributor, Pharmacist; Role `None` surfaces registration prompt.
6. Disconnect button (in nav) revokes permissions when supported and clears provider/role state.

## 4. Global UI & Styling
- Palette: blue `#007bff`, success green `#28a745`, error red `#dc3545`, neutrals (`#f8f9fa`, `#dee2e6`).
- Typography: system stack; inline style weights.
- Layout: inline flex/grid; container width `maxWidth: 1400px`.
- Buttons: rounded, color-coded, disabled with gray background and `not-allowed` cursor.
- Address display: truncated `0x1234…abcd`.
- Feedback blocks: success (green background) and error (red background) divs with padding, rounded corners.

## 5. Wallet States
- **Disconnected**: Centered hero, CTA, helper text, `connectWallet` action.
- **Loading role**: Minimal message while contract call resolves.
- **Unregistered**: Informational card showing wallet, instructing user to contact admin.
- **Registered**: Header card shows role badge, network name, truncated wallet; below sits role workspace.

## 6. Manufacturer Dashboard
- Tab navigation: `Mint Batch` (green active) and `Transfer Custody` (blue active); styled buttons with border highlights.
- **Mint Batch**
  - Fields: required `Product Name`, optional `Batch Number` (auto-generated if blank).
  - Action: builds tokenURI as `ipfs://pharmaledger/{productName}/{batchNumber}` before calling `digitalBatch.mintBatch(account, tokenURI)`.
  - Feedback: disables inputs, button text switches to “Minting…”, errors shown in red card, success card displays product name, batch number, and token ID.
  - Success panel: large QR (200 px) annotated with product metadata plus next-step guidance.
  - Inventory refresh now triggered by SSE callbacks (`BatchMinted` / `CustodyTransferred`) targeting the signed-in manufacturer, with the transaction wait as fallback.
  - Inventory tab shows product name, batch number, token ID, and inline QR (100 px) for each owned batch (empty state prompts to mint).
- **Transfer Custody**
  - Dropdown of owned batches, text input for recipient.
  - Flow: `digitalBatch.approve(trackAndTraceAddress, tokenId)` then `trackAndTrace.transferCustody`.
  - Feedback: disabled fields, red/green alerts, success resets form and inventory reload scheduled.
  - Secondary list of owned batches for reference.

## 7. Distributor Dashboard
- Tabs: `Transfer Custody`, `Log Event`, `Scan QR Code`.
- Transfer form mirrors manufacturer with distributor wording.
- Inventory list fetched from API with graceful “no batches” handling.
- **Log Event**
  - Inputs: tokenId (number), event text area (temperature, location, etc.).
  - Transaction: `trackAndTrace.logEvent`.
  - Success resets textarea; alerts mirror other forms.
- **Scan QR Code**
  - Embeds `QRCodeScanner` (html5-qrcode).
  - Buttons: “Start Scanning” (blue), “Stop Scanning” (red); instructions below.
  - Successful scan parses URL, stops camera, navigates to `/verify`.

## 8. Pharmacist Dashboard
- Tabs: `Inventory`, `Log Event`, `Verify Batch`.
- **Inventory**: cards per batch with manufacturer snippet, URI, button linking to verification page (new tab). Empty message encourages awaiting transfers.
- **Log Event**: Dropdown of owned batches, textarea for dispense/storage notes; identical transaction + feedback pattern.
- **Verify Batch**: Reuses QR scanner with focus on authenticity checks for incoming stock.

## 9. Public Verify Page (`/verify`)
- Query parsing: missing `tokenId` → red error notice; invalid fetch → error message.
- Loading indicator: centered “Loading batch data…” text.
- Success layout:
  - Green-outlined card with checkmark copy “✓ Authentic Batch”.
  - Grid columns: left details (tokenId, manufacturer, current owner, minted timestamp), right QR code (150 px).
  - Custody table with headers (From, To, Timestamp); empty state text for no history.
  - Event list: stacked cards with logger, timestamp, event text; blue border accent.
  - Footer text emphasizes blockchain verifiability and brand tagline.

## 10. QR Utilities
- `QRCodeGenerator`: builds `window.location.origin/verify?tokenId=…`, renders `QRCodeSVG`, displays human-readable URL and instruction text.
- `QRCodeScanner`: manages html5-qrcode lifecycle, environment camera, success/error callbacks, route navigation; visual border toggles between dashed (idle) and solid (active).

## 11. Feedback & Validation Patterns
- Form-level validation ensures required fields; deeper checks (URI format, role, ownership) enforced by smart contract reverts surfaced via alert text.
- Async states tracked via booleans (`isMinting`, `isTransferring`, etc.) to disable UI elements and update button copy.
- Errors catch RPC exceptions; success alerts persist until next action.
- Loading states rely on plain text (no global spinner components).

## 12. Backend & Data Dependencies
- API client (`src/utils/api.ts`) communicates with backend REST (`API_BASE_URL`, default `http://localhost:3001`).
- Endpoints used:
  - `/api/batches/:tokenId`, `/events`, `/custody` for verify page.
  - `/api/stakeholders/:address/batches` for role inventories.
  - `/api/indexer/status` optional; health endpoint not surfaced in UI.
- Event indexer seeds in-memory cache from historical blocks, then relies on live ethers.js listeners broadcasting over SSE (`/api/events/stream`); dashboards subscribe via `useRealtimeEvents` for ~100–500 ms refresh latency.
- Frontend `parseTokenURI` helper interprets the `ipfs://pharmaledger/{productName}/{batchNumber}` convention while gracefully handling legacy URIs.
- Empty dataset handling: UI treats “no batches” gracefully without user-facing errors.

## 13. Access Control Mapping
- Only registered roles reach functional dashboards; unregistered state blocks interactions.
- Manufacturer exclusivity for mint enforced by contract; UI simply assumes legitimate user.
- Custody transfers require owner role + per-transfer approval; UI wraps both steps.
- Event logging restricted to token owner (distributor/pharmacist) in contract; UI expects failure otherwise.

## 14. Styling Notes & Responsiveness
- Inline styles dominate; base Vite CSS still present but overshadowed by component styles.
- Manufacturer inventory uses responsive grid (`auto-fill` min 300px).
- Tables within verify view scroll horizontally when narrow.
- No dedicated mobile theme; layouts rely on natural wrapping.

## 15. Enhancement Considerations
- Introduce shared design system or CSS modules for consistency.
- Layer optimistic UI hints on top of the SSE stream (e.g., temporary badges while awaiting confirmation).
- Expand client-side validation for addresses and URI format before sending transactions.
- Introduce skeleton loaders and toast notifications for richer feedback.
- Localize timestamps and text if targeting multiple locales.

---

Document reflects current UX/UI/GUI implementation across frontend, backend, and contracts.

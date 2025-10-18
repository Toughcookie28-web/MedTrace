# DigitalBatch Documentation

> Documentation for `DigitalBatch.sol` now lives in `packages/contracts/docs/DigitalBatch.md`.

The content in this file has been consolidated into the updated docs folder to keep all smart-contract references in one place. Please refer to the new location for the latest information.

### 10.1 Incident Response

1. **Pause contract:** `digitalBatch.pause();`
2. **Review custody manager configuration:** set to owner if emergency manual transfers required.
3. **After remediation:** reset custody manager and `unpause`.

### 10.2 Metadata Corrections

1. Burn incorrect token (`digitalBatch.burn(tokenId)`).
2. Mint replacement with corrected metadata.
3. Record linkage between new tokenId and physical batch in compliance systems.

### 10.3 Custody Manager Rotation

Required when TrackAndTrace is upgraded or replaced.

```
digitalBatch.updateCustodyManager(newTrackAndTrace);
```

Recommendation: pause before rotation, run smoke tests, then unpause.

---

## 11. Appendix – Gas Benchmarks

| Operation                               | Approx. Gas | Notes |
|-----------------------------------------|-------------|-------|
| `mintBatch` (first for manufacturer)    | ~220,000    | Includes cold storage writes and `_safeMint`. |
| `mintBatch` (subsequent)                | ~180,000    | Warm storage. |
| `burn`                                  | ~90,000     | Includes metadata cleanup. |
| Transfer via TrackAndTrace              | ~75,000     | See TrackAndTrace documentation for details. |
| `updateCustodyManager`                  | ~45,000     | Emits event. |
| `setManufacturerMintLimit`              | ~38,000     | Emits event. |

---

## 12. References

- Contract source: `packages/contracts/contracts/DigitalBatch.sol`
- Tests: `packages/contracts/test/DigitalBatch.ts`
- Deployment scripts: `packages/contracts/scripts/deploy.ts`, `setup-local.ts`
- Custody orchestrator: `packages/contracts/contracts/TrackAndTrace.sol`

---

For clarifications, contact the PharmaLedger smart-contract working group or file a request in
the internal tracker.

/**
 * Kernel package version (semver).
 *
 * 0.1.0 — Wave 1a initial extraction (2026-08-12). Establishes the
 *         @we-kernel/kernel package scaffold + the entities-base transition
 *         slice. Wave 1a lands errors-base, events-base, and the 8 GENERIC
 *         leaves in subsequent commits (this version.ts is part of the
 *         scaffold). Wave 1b (we-kernel/program #8) migrates the complete
 *         entities-base.
 *
 * Evolution rules (mirror ADR-0001 contract policy, see ADR-0004 in
 * we-kernel/program):
 *   - new module / new optional field                     → minor
 *   - removal / type change / new required field          → major + ≥1 minor deprecation window
 *   - re-export surface additions within the same wave    → patch/minor (no breakage)
 *
 * This constant is independent of @we-kernel/compute-contract's
 * CONTRACT_VERSION: that one tracks the cross-layer API contract, this one
 * tracks the kernel primitives package itself.
 */
export const KERNEL_VERSION = "0.1.0" as const;

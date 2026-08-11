/**
 * Contract version (semver).
 *
 * 0.1.0 — initial frozen design (2026-08-11). The 5 capability surfaces are
 *         stable at the type level; pre-1.0 minor versions may add optional
 *         fields. 1.0.0 follows once the win-enigma adapter passes the
 *         compatibility suite (E02 acceptance criterion).
 *
 * Evolution rules (see ADR-0001):
 *   - new optional field / new operation        → minor
 *   - type change / new required field / removal → major + ≥1 minor deprecation window
 */
export const CONTRACT_VERSION = "0.1.0" as const;

/** Major version, surfaced via the `X-Kernel-Contract-Version` HTTP header. */
export const CONTRACT_VERSION_MAJOR = 0 as const;

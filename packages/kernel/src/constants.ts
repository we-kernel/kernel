// @we-kernel/kernel — Platform-wide multi-tenant constants (GENERIC leaf).
//
// Extracted from win-enigma/packages/core/src/ontology/constants.ts during
// Wave 1a (ADR-0004 / we-kernel/program issue #7). These are the
// domain-agnostic primitives: the platform tenant sentinel, the
// LicenseEnforcer shared-dispatch tenant sentinel, and the role-mutex
// structural helpers used by the multi-tenant identity system.
//
// SDLC-stays (NOT extracted): REQUIREMENT_BRANCH_PREFIX and
// requirementBranchName() reference the Requirement SDLC concept and
// remain in win-enigma.
//
// Reference: FIP-0020 §2.1 ("Entity 与 Schema 归属矩阵") and §3.1
// ("角色互斥规则"). No dependency on win-enigma; no SDLC dependency.

/**
 * The well-known tenant ID for platform-level resources and users.
 *
 * - Platform users (`platform_admin` / `platform_viewer`) have this as
 *   their `tenantId`.
 * - Platform-scoped queries (e.g. cross-tenant admin operations) use
 *   this as the tenant filter.
 * - Self-hosted single-tenant deployments also use this ID for their
 *   single tenant.
 *
 * Format: nil UUID (all zeros), per FIP-0020 §2.1. The literal is marked
 * `as const` so downstream code can use `typeof PLATFORM_TENANT_ID` for
 * branded type narrowing (e.g. the `PlatformUser.tenantId` field).
 */
export const PLATFORM_TENANT_ID =
  "00000000-0000-0000-0000-000000000000" as const;

/**
 * LicenseEnforcer seam marker for a shared / unscoped worker.
 *
 * Used as `DispatchContext.tenantId` when no real tenant exists yet
 * (shared-pool claim, worker with no bound tenant). Must not be
 * {@link PLATFORM_TENANT_ID} — that UUID is a real tenant. Must be
 * non-empty so it survives `TenantIdSchema` (`z.string().min(1)`).
 */
export const SHARED_DISPATCH_TENANT_ID = "__shared__" as const;

/**
 * Map a claim/config tenant to a DispatchContext tenantId.
 * Missing or blank (including whitespace-only) → {@link SHARED_DISPATCH_TENANT_ID}.
 *
 * Trims before the empty check so a whitespace-only tenant id (e.g. `"  "`)
 * — which is truthy and would pass `TenantIdSchema` (`z.string().min(1)`,
 * no trim) — is treated as blank and mapped to the sentinel, not routed as a
 * garbage tenant by a future per-tenant entitlement layer.
 */
export function resolveDispatchTenantId(
  tenantId: string | null | undefined,
): string {
  const trimmed = tenantId?.trim();
  return trimmed ? trimmed : SHARED_DISPATCH_TENANT_ID;
}

/**
 * Type guard: does the given tenant ID represent the platform tenant?
 *
 * Useful for:
 * - Branching in store queries (platform queries bypass the tenant filter)
 * - Role-mutex validation (platform users must have `platformRole !== null`)
 * - Audit logging (platform operations record `tenantId === PLATFORM_TENANT_ID`)
 */
export function isPlatformTenant(tenantId: string): boolean {
  return tenantId === PLATFORM_TENANT_ID;
}

/**
 * Minimal structural shape required by the role-mutex helpers. Importing
 * code typically passes a richer `User` entity, but the helpers only
 * inspect these three fields, so we keep the contract narrow.
 */
export interface PlatformUserLike {
  tenantId: string;
  platformRole: string | null;
  tenantRole: string | null;
}

/**
 * Type guard: is the given user a platform user?
 *
 * A platform user is defined as:
 *   tenantId === PLATFORM_TENANT_ID && platformRole !== null && tenantRole === null
 *
 * Reference: FIP-0020 §3.1 role-mutex invariant.
 */
export function isPlatformUser(user: PlatformUserLike): boolean {
  return (
    user.tenantId === PLATFORM_TENANT_ID &&
    user.platformRole !== null &&
    user.tenantRole === null
  );
}

/**
 * Type guard: is the given user a tenant-scoped user?
 *
 * A tenant user is defined as:
 *   tenantId !== PLATFORM_TENANT_ID && platformRole === null && tenantRole !== null
 *
 * Reference: FIP-0020 §3.1 role-mutex invariant.
 */
export function isTenantUser(user: PlatformUserLike): boolean {
  return (
    user.tenantId !== PLATFORM_TENANT_ID &&
    user.platformRole === null &&
    user.tenantRole !== null
  );
}

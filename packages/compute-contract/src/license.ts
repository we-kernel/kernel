import type { CapabilityTag, TenantId } from "./types.js";

/**
 * License enforcement SEAM (see ADR-0000 "License clarification").
 *
 * The open kernel ships only the INTERFACE plus a noop default that always
 * allows. Commercial distributions inject the real enforcement (win-enigma
 * #609 Ed25519 JWT claims) — that logic is NOT part of the open kernel.
 *
 * This mirrors the GitLab CE (no subscription check) / EE (subscription check)
 * split: the open kernel has the hook point, the closed distribution fills it.
 */
export interface LicenseEnforcer {
  isDispatchAllowed(ctx: DispatchContext): Promise<DispatchDecision>;
}

export interface DispatchContext {
  tenantId: TenantId;
  capabilityTags: CapabilityTag[];
}

export interface DispatchDecision {
  allowed: boolean;
  reason:
    | "ok"
    | "skipped"
    | "license_required"
    | "license_expired"
    | "quota_exceeded"
    | (string & {}); // open extension point
}

/**
 * Default open-kernel enforcer — always allows, reports `skipped`.
 * Commercial distributions replace this with their own implementation.
 */
export const noopLicenseEnforcer: LicenseEnforcer = {
  async isDispatchAllowed() {
    return { allowed: true, reason: "skipped" };
  },
};

// @we-kernel/kernel — Repo metadata SSOT contract.
//
// Source: win-enigma/packages/core/src/ontology/repo-context.ts (Wave 1a whole-file extract).
// Original header (win-enigma issue #423 Tier 1) preserved below for provenance; the
// runtime references to gateway/worker/scheduler services are win-enigma-specific context,
// but the exported types themselves carry no SDLC type dependencies (the sole type
// dependency, InstallationProvider, is in the entities-base transition slice).
//
// The provider/repo READ layer was fractured three ways across the three
// services, each reading the same WorkspaceRepo catalog / tenant provider
// config through its own resolver:
//   - gateway  TenantProviderResolver    → GitProvider instance (long-lived creds)
//   - worker   HttpTenantGitProviderResolver → ephemeral per-task git token
//   - scheduler RepoResolver             → track→repo catalog entry
//
// Those three return fundamentally different things BY DESIGN (the worker
// must stay on ephemeral tokens to avoid cross-task credential leaks), so
// they cannot collapse into one return type. The ONE axis all three share
// is repo METADATA — identity + the PR base branch + the monorepo hint.
// This module pins that shared axis so the scheduler can stop hardcoding
// `base: "master"` (#423 Part A) and read the catalog's real defaultBranch.
//
// No credentials live here. Provider-instance resolution stays in the
// gateway; ephemeral-token minting stays in the worker.

import type { InstallationProvider } from "./entities-base.js";

/**
 * SSOT record describing one tenant catalogued repo along the dimensions all
 * three packages need. Mirrors the subset of {@link WorkspaceRepo} that
 * crosses the process boundary via the gateway's
 * `/internal/workspace/resolve` `WorkspaceRepoResponse`.
 *
 * - `ownerRepo` + `providerType`: identity (which repo on which provider).
 * - `defaultBranch`: PR target base. Replaces the scheduler's `"master"`
 *   hardcode (#423 Part A); `"master"` survives only as the legacy fallback
 *   when no catalog/worker value is known (Tier 0 #421 catches it gateway-side).
 * - `pathPrefix`: monorepo hint.
 */
export interface RepoMetadata {
  /** "owner/repo". */
  ownerRepo: string;
  /** Hosting provider. */
  providerType: InstallationProvider;
  /** Base branch PRs target (e.g. "main", "master"). */
  defaultBranch: string;
  /** Optional monorepo path hint. */
  pathPrefix?: string;
}

/**
 * Process-agnostic resolver contract for repo metadata. Implemented
 * HTTP-backed by the scheduler (→ gateway `/internal/workspace/resolve`) and
 * trivially in-process by the gateway (which owns the store and already does
 * the equivalent `listActive` lookup in `resolveProviderForEvent`).
 *
 * Returns null when no repo matches and no tenant default exists — callers
 * fall back to legacy `"master"` base, which Tier 0 (#421) resolves
 * gateway-side. Provider-instance and ephemeral-token resolution stay on
 * their own process-specific interfaces.
 */
export interface RepoMetadataResolver {
  resolve(tenantId: string, capability?: string): Promise<RepoMetadata | null>;
}

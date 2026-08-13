// @we-kernel/kernel — Runtime Resource Bundle (GENERIC leaf, Wave 1a)
//
// Source: win-enigma/packages/core/src/ontology/runtime-resource.ts
// Extracted per ADR-0004 / we-kernel/program issue #7.
//
// Models non-code assets a container reads from the filesystem at runtime
// (not via `import`).
//
// Background (failure pattern P-7, from source):
//   A resource directory (e.g. blueprints/) is read by an orchestrator and
//   served via an HTTP route, but it is not a compiled artifact — it must be
//   `COPY`'d into each image that consumes it. Modeling each bundle makes the
//   dependency explicit and gives CI a registry to assert against (every
//   bundle has a Dockerfile COPY rule + a minimum-count startup check).
//
// Wave 1a scope note (SDLC split):
//   Only the domain-neutral interface `RuntimeResourceBundle` and the
//   `bundlesConsumedBy()` filter helper are extracted here. The concrete
//   `RUNTIME_RESOURCE_BUNDLES` registry array stays in win-enigma because its
//   sole entry ("blueprint-templates") and its description are tightly bound
//   to SDLC concepts (blueprints YAML library, scheduler orchestrator,
//   gateway /api/v1/templates route, RFC #86). Downstream re-export wiring
//   will keep the registry in win-enigma and only reuse this interface.

/**
 * A non-code resource directory bundled into container images and read at
 * runtime (not via `import`).
 *
 * Each entry in a consumer's bundle registry is a contract: the named services'
 * Dockerfiles MUST contain `dockerfileCopyRule`, and startup MUST assert at
 * least `expectedMinCount` items loaded.
 */
export interface RuntimeResourceBundle {
  /** Stable id, e.g. `"blueprint-templates"`. */
  id: string;
  /** Path relative to repo root where the bundle lives in source. */
  sourcePath: string; // "blueprints/"
  /** Absolute path inside the container where the runtime reads it. */
  containerPath: string; // "/app/blueprints/"
  /** Services whose Dockerfile must COPY the bundle. */
  consumedBy: string[]; // ["scheduler", "gateway"]
  /** Startup asserts at least this many items load (0 => hard error). */
  expectedMinCount: number; // 8
  /** The exact Dockerfile instruction that must appear in each consumer. */
  dockerfileCopyRule: string; // "COPY blueprints/ /app/blueprints/"
  /** Human-readable purpose. */
  description?: string;
}

/**
 * Find bundles required by a service image. Used by Dockerfile lint / startup
 * self-check to enforce the COPY rule per consumer.
 *
 * Domain-neutral: operates over any caller-supplied registry of
 * {@link RuntimeResourceBundle}. win-enigma supplies its SDLC-scoped registry
 * at the call site (the registry itself is NOT extracted — see file header).
 */
export function bundlesConsumedBy(
  bundles: readonly RuntimeResourceBundle[],
  service: string,
): RuntimeResourceBundle[] {
  return bundles.filter((b) => b.consumedBy.includes(service));
}

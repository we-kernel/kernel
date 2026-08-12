// @we-kernel/kernel — schema-registry (GENERIC leaf).
//
// Global registry for Zod schemas keyed by agent role identifier. Workers
// register output schemas at startup; a block execution engine retrieves
// validators via `SchemaRegistry.get(role)`.
//
// Extracted from win-enigma/packages/core/src/ontology/schema-registry.ts
// during Wave 1a (ADR-0004 / we-kernel/program issue #7).
//
// SDLC-stays (NOT extracted, remain in win-enigma schema-registry):
//   - EVENT_SCHEMA_VERSION re-export          — delegates to events.ts; the
//     event envelope version belongs to events-base, which is a separate
//     Wave 1a work unit. Re-export of a symbol owned elsewhere adds no
//     kernel value; consumers should import EVENT_SCHEMA_VERSION directly
//     from events-base once it lands.
//   - EVENT_TYPES_BY_SCHEMA_VERSION           — enumerates SDLC event types
//     (issue.created, pull_request.created, blueprint.ready, run.created,
//     task.*, planning.completed, deployment.state_changed,
//     requirement.state_changed, test_execution.state_changed, etc.). The
//     catalog is the SDLC event taxonomy, not a domain-agnostic primitive.
//   - isEventTypeKnownAtVersion(type, ver)    — pure helper in shape, but
//     operates exclusively on the SDLC event catalog above; keeping it with
//     its data preserves coherence.
//
// Only `SchemaRegistry` (the role-keyed ZodType registry) is truly
// domain-agnostic: it is a `Map<string, ZodType>` with register/get/clear
// and has zero SDLC coupling. Role identifiers are opaque strings.
//
// No dependency on win-enigma; no SDLC dependency.

import type { ZodType } from "zod";

/**
 * Role-keyed registry of Zod validation schemas.
 *
 * Workers register the schema that validates their output at startup; a
 * block execution engine retrieves the validator for a given agent role
 * before accepting that agent's emitted payload.
 *
 * The registry is intentionally string-keyed: it does not know about any
 * specific role taxonomy (planner / builder / qa / ...). Those identifiers
 * are defined in {@link ./entities-base.js} (`AgentRole`) and supplied by
 * callers; the registry itself treats them as opaque strings.
 *
 * Source: win-enigma/packages/core/src/ontology/schema-registry.ts (Wave 1a
 * transition copy).
 */
export class SchemaRegistry {
  private static schemas = new Map<string, ZodType>();

  /**
   * Register (or overwrite) a Zod validation schema for the given role.
   *
   * @param role   - Agent role identifier (e.g. "planner", "builder").
   * @param schema - Zod schema used to validate that agent's output.
   */
  static register(role: string, schema: ZodType): void {
    SchemaRegistry.schemas.set(role, schema);
  }

  /**
   * Retrieve the registered Zod schema for the given role.
   *
   * @param role - Agent role identifier.
   * @returns The associated Zod schema, or `undefined` if none was registered.
   */
  static get(role: string): ZodType | undefined {
    return SchemaRegistry.schemas.get(role);
  }

  /**
   * Remove all registered schemas. Primarily useful for test teardown.
   */
  static clear(): void {
    SchemaRegistry.schemas.clear();
  }
}

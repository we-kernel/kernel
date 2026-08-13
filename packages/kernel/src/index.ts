// @we-kernel/kernel — barrel (Wave 1a, E04b / ADR-0004 / we-kernel/program #7)
//
// Domain-agnostic execution-kernel primitives (L0-os). This package holds the
// GENERIC slice extracted from win-enigma/packages/core during Wave 1a of the
// L0-os extraction strategy (ADR-0004): types and runtime helpers that carry
// NO dependency on any SDLC concept (Blueprint / Requirement / TestExecution /
// Installation / Project / git repo / Deployment / Release / etc.).
//
// Wave 1a + Wave 1b scope (this package, v0.2.0):
//   - version                 — KERNEL_VERSION
//   - entities-base           — full GENERIC entity primitives (AgentRole /
//                               ArtifactState / VALID_ARTIFACT_TRANSITIONS /
//                               InstallationProvider / TaskState / RunState /
//                               WorkerStatus / ConstraintTier / TaskType /
//                               BlockType / EventSource / FILE_PRODUCING_ROLES /
//                               TASK_CAPABILITY_MAP / VALID_TASK_TRANSITIONS /
//                               VALID_RUN_TRANSITIONS / BlockPort / BlockRetryConfig /
//                               BlueprintBlock / WorkerInfo / Constraint / TaskMetrics);
//                               migrated in Wave 1b (#8)
//   - errors-base             — WinEnigmaError + 5 domain-agnostic subclasses
//   - events-base             — WinEnigmaEvent envelope + createEvent factory +
//                               schema-version constants + 6 GENERIC event types
//   - constants               — PLATFORM_TENANT_ID / SHARED_DISPATCH_TENANT_ID /
//                               platform-user helpers
//   - roles                   — ROLE_LABELS + getRoleLabel (bilingual)
//   - attachments             — Attachment / AttachmentRef types + factory
//   - artifacts               — Artifact lifecycle + transition validators
//   - repo-context            — RepoMetadata / RepoMetadataResolver interfaces
//   - runtime-resource        — RuntimeResourceBundle interface + helper
//   - schema-registry         — role-keyed ZodType registry
//
// Downgraded to SDLC-stays (NOT in this package):
//   - gate.ts (whole file)         — HITL gate model is Blueprint/Run/Task-bound
//   - errors-sdlc                  — BlueprintValidationError / TaskExecutionError / PlanningError
//   - events-sdlc                  — ~60 SDLC event types (issue.* / run.* / task.* / ...)
//   - schema-registry SDLC catalog — EVENT_TYPES_BY_SCHEMA_VERSION / isEventTypeKnownAtVersion
//   - runtime-resource registry    — RUNTIME_RESOURCE_BUNDLES (blueprint-templates entry)
//   - constants SDLC entries       — REQUIREMENT_BRANCH_PREFIX / requirementBranchName
//
// Evolution: this is the Wave 1a seed. Subsequent waves (ADR-0004 wave table)
// migrate the remaining GENERIC ontology (full entities-base, audit, multi-tenant
// base, constraints harness, MCP skill base) into this package. SDLC-bound
// symbols stay in win-enigma (L0-sdlc) and compose `KernelType | SdlcType` at
// the app layer.
//
// Consumption: `pnpm add @we-kernel/kernel` (same we-kernel npm org + publish
// pattern as @we-kernel/compute-contract; see ADR-0002).
export * from "./version.js";
export * from "./entities-base.js";
export * from "./errors-base.js";
export * from "./events-base.js";
export * from "./constants.js";
export * from "./roles.js";
export * from "./attachments.js";
export * from "./artifacts.js";
export * from "./repo-context.js";
export * from "./runtime-resource.js";
export * from "./schema-registry.js";

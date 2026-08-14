// @we-kernel/kernel — entities-base (Wave 1b, E04b / ADR-0004 / we-kernel/program #8)
//
// Domain-agnostic GENERIC entity primitives extracted from
// win-enigma/packages/core/src/ontology/entities.ts.
//
// Scope (this file, v0.2.0): pure types / string-literal unions / constants /
// interfaces and the VALID_*_TRANSITIONS data maps for the GENERIC state
// machines only:
//   AgentRole, ArtifactState, InstallationProvider (Wave 1a carry-over)
//   TaskState, RunState, WorkerStatus, ConstraintTier, TaskType, BlockType,
//   EventSource (moved out of events-base.ts in this wave)
//   FILE_PRODUCING_ROLES, TASK_CAPABILITY_MAP,
//   VALID_TASK_TRANSITIONS, VALID_RUN_TRANSITIONS,
//   BlockPort, BlockRetryConfig, BlueprintBlock,
//   WorkerInfo, Constraint, TaskMetrics
//
// DELIBERATELY NOT migrated (SDLC-stays, see ADR-0004):
//   - validateTransition / validateTaskTransition / validateRunTransition:
//     they throw BlueprintValidationError, which is an SDLC-only error
//     (errors-sdlc in win-enigma). Migrating them would pull the SDLC error
//     contract into the kernel, violating "kernel has NO SDLC dependency".
//     They stay in win-enigma and operate on the transition maps re-exported
//     from here. See we-kernel/program #9 (follow-up) for the evaluation.
//   - All SDLC entity types (Blueprint / Run / Task / TaskMetadata / Planning*
//     / Installation / Project / Memory / Policy / Requirement / TestExecution
//     / CIStatus / ExecutionProgress / AgentBehaviorProfile / blueprint-name
//     validation / installation state machine / timeout constants / etc.).
//
// No reverse dependency: this file MUST NOT import anything from win-enigma.

// --- Generic role + artifact-state + provider (Wave 1a carry-over) ---

/**
 * Agent role taxonomy for AgenticSDLC.
 */
export type AgentRole =
  | "planner"
  | "builder"
  | "qa"
  | "security"
  | "sre"
  | "pm"
  | "doc"
  | "governance";

/**
 * Artifact lifecycle states for REQ-001: 制品生命周期管理
 * Flow: draft → building → built → verified → deployed → archived
 * Terminal state: archived
 */
export type ArtifactState =
  | "draft"
  | "building"
  | "built"
  | "verified"
  | "deployed"
  | "archived"
  | "failed";

export const VALID_ARTIFACT_TRANSITIONS: Record<ArtifactState, ArtifactState[]> = {
  draft: ["building"],
  building: ["built", "failed"],
  built: ["verified"],
  verified: ["deployed"],
  deployed: ["archived"],
  archived: [],
  failed: ["building"],
};

/**
 * Installation (Git Provider Connection) provider type.
 *
 * Kept in kernel because the GENERIC repo-context contract references it
 * (`providerType`). It is a pure string-literal union with no SDLC concept
 * dependency.
 */
export type InstallationProvider = "github" | "gitlab" | "gitee" | "bitbucket";

// --- Generic execution state machines ---

export type TaskState = "blocked" | "ready" | "executing" | "succeeded" | "failed" | "cancelled";
export type RunState = "pending" | "planning" | "classifying" | "executing" | "completed" | "failed" | "cancelled";
export type WorkerStatus = "idle" | "busy" | "offline" | "draining";
export type ConstraintTier = "eager" | "deferred" | "lazy";
export type TaskType = "planning" | "execution";

/**
 * Origin of an event. Pure string-literal union; no SDLC concept dependency.
 * Moved here from events-base.ts in Wave 1b (#8) so the kernel owns a single
 * SSOT for this fundamental symbol (events-base.ts now `import type`s it).
 */
export type EventSource = "github" | "gitlab" | "gitee" | "bitbucket" | "jira" | "manual" | "agent" | "scheduler";

/**
 * Agent roles that write files to the workspace and therefore require a
 * repository checkout to deliver artifacts via PR (#398). When a task's
 * block agentRole is in this set but `task.repository` is absent, the
 * handler should fail-fast rather than silently discard the output.
 */
export const FILE_PRODUCING_ROLES: ReadonlySet<AgentRole> = new Set([
  "builder",
  "doc",
  "qa",
  "sre",
]);

export type BlockType = "plan" | "execute" | "validate" | "review" | "verify";

export interface BlockPort {
  name: string;
  type: string;
  required: boolean;
  description: string;
}

export interface BlockRetryConfig {
  maxRetries: number;
  retryDelayMs: number;
}

export interface BlueprintBlock {
  id: string;
  name: string;
  type: BlockType;
  promptTemplate: string;
  dependencies: string[];
  inputs: BlockPort[];
  outputs: BlockPort[];
  agentRole: AgentRole;
  retryConfig?: BlockRetryConfig;
  gateRequired?: boolean;
  outputSchema?: string;
  metadata?: Record<string, unknown>;
  /**
   * Tool IDs (dotted namespace, e.g. `file.read`, `git.commit`) the block's
   * agent is allowed to call during execution. When non-empty, the worker's
   * ExecutionHandler routes the block through the AgentLoop (multi-turn
   * tool-use) instead of the legacy single-LLM-call pipeline.
   */
  tools?: string[];
  /**
   * Maximum number of LLM round-trips the agent loop may take before giving
   * up. Defaults to 25 (see AgentLoop.DEFAULT_MAX_STEPS). Only consulted when
   * `tools` is non-empty.
   */
  maxSteps?: number;
}

/**
 * Worker registration/heartbeat record. Pure GENERIC shape — no SDLC fields
 * beyond an optional `tenantId` scope (#358 Phase 2 isolation).
 */
export interface WorkerInfo {
  id: string;
  capabilities: AgentRole[];
  status: WorkerStatus;
  currentTaskId: string | null;
  lastHeartbeat: Date;
  load: number;
  /**
   * Tenant this worker is scoped to (#358 Phase 2). When set, the worker only
   * claims tasks for this tenant (isolation). When absent, the worker is part
   * of the shared pool and claims from any tenant.
   */
  tenantId?: string;
  /**
   * Last time this worker made real progress — i.e. claimed a task (#811
   * lesson #1: "worker online ≠ worker working"). Heartbeats alone keep
   * `lastHeartbeat` fresh even while the dispatch loop is stalled, so a
   * long-stale `lastActivityAt` with a fresh heartbeat is the signal of a
   * stalled-but-alive worker. Set on register and bumped on each successful
   * claim. Optional because older builds never set it.
   */
  lastActivityAt?: Date;
}

export interface Constraint {
  id: string;
  tier: ConstraintTier;
  rule: string;
  scope: string[];
}

export interface TaskMetrics {
  tokenUsage: number;
  durationMs: number;
  filesModified: number;
  testsRun: number;
  testsPassed: number;
}

// --- Generic transition data maps ---

export const VALID_TASK_TRANSITIONS: Record<TaskState, TaskState[]> = {
  // win-enigma #835 (HITL pre-execution gate): blocked → succeeded is legal.
  // A gated planning task is held `blocked` (awaiting_approval) after its
  // actual work — producing the plan — is done; gate approval promotes it
  // directly to `succeeded` (re-queueing as `ready` would make a worker
  // re-plan). Synced with win-enigma's core ontology in the same release
  // window; keep the two maps aligned (cross-repo contract, flagged in
  // win-enigma PR #836 review D1).
  blocked: ["ready", "succeeded", "failed", "cancelled"],
  ready: ["executing", "failed", "cancelled"],
  // #393: executing → cancelled is legal. Previously omitted, which made
  // cancelRun's per-task loop (processor/index.ts) throw on executing tasks,
  // and forced #387's cascade to use raw SQL to bypass the validator. An
  // executing task must be cancellable (e.g. when its run is cancelled).
  executing: ["succeeded", "failed", "ready", "blocked", "cancelled"],
  succeeded: [],
  failed: ["ready"],
  cancelled: [],
};

export const VALID_RUN_TRANSITIONS: Record<RunState, RunState[]> = {
  pending: ["classifying", "planning", "cancelled"],
  planning: ["executing", "failed", "cancelled"],
  classifying: ["planning", "failed", "cancelled"],
  executing: ["completed", "failed", "cancelled"],
  completed: [],
  failed: [],
  cancelled: [],
};

// --- Task claiming capability mapping ---

export const TASK_CAPABILITY_MAP: Record<TaskType, AgentRole[]> = {
  planning: ["planner"],
  execution: ["builder", "qa", "security", "sre", "doc"],
};

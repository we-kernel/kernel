/**
 * Core entity types for @we-kernel/compute-contract.
 *
 * Domain-agnostic. Upper layers (L0-sdlc / L1 数智员工引擎 / L2 集团管控)
 * attach domain semantics via opaque `context` / `metadata` fields — the kernel
 * never interprets them.
 *
 * Naming note (ADR-0001): `Task` / `Run` are retained from win-enigma because
 * they are already generic (a task is a unit of work; a run is an execution).
 * `Blueprint` is intentionally excluded — it is an SDLC concern, not a kernel
 * concern.
 */

// ===== Scalars =====

/** Tenant identifier. First-class scope on every entity and every call. */
export type TenantId = string;

/**
 * Free-form capability tag. The kernel does NOT enumerate capabilities; upper
 * layers layer typed unions on top:
 *   - L0-sdlc: "planner" | "builder" | "qa" | "security" | ...
 *   - L1:      "hr-recruit" | "finance-recon" | "scm-order" | ...
 */
export type CapabilityTag = string;

/** Opaque artifact reference (URI / storage key). Kernel does not interpret. */
export type ArtifactRef = string;

// ===== Task (kernel execution unit) =====

export type TaskState =
  | "blocked"
  | "ready"
  | "executing"
  | "succeeded"
  | "failed"
  | "cancelled";

/** Valid Task state transitions (mirrors win-enigma core ontology). */
export const VALID_TASK_TRANSITIONS: Record<TaskState, readonly TaskState[]> = {
  // win-enigma #835 (HITL pre-execution gate): blocked → succeeded is legal
  // (a gated planning task completes its work while held blocked; approval
  // promotes it directly to succeeded). Keep synced with entities-base.ts
  // and win-enigma core.
  blocked: ["ready", "succeeded", "failed", "cancelled"],
  ready: ["executing", "failed", "cancelled"],
  executing: ["succeeded", "failed", "ready", "blocked", "cancelled"],
  succeeded: [],
  failed: ["ready"],
  cancelled: [],
} as const;

export interface TaskSpec {
  tenantId: TenantId;
  /** Natural-language directive for the agent-loop. */
  instruction: string;
  /** Which worker capabilities may execute this task. */
  capabilityTags: CapabilityTag[];
  inputArtifacts?: ArtifactRef[];
  tools?: ToolBinding[];
  constraints?: ConstraintSpec[];
  /** Opaque upper-layer context (employeeId / requirementId / runId / ...). */
  context?: Record<string, unknown>;
  /** Wall-clock budget in milliseconds. */
  deadlineMs?: number;
  priority?: number;
}

export interface Task {
  id: string;
  tenantId: TenantId;
  state: TaskState;
  spec: TaskSpec;
  result: TaskResult | null;
  assignedWorkerId: string | null;
  error: FailureInfo | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
}

export interface TaskResult {
  summary: string;
  outputArtifacts?: ArtifactRef[];
  metrics?: TaskMetrics;
}

export interface TaskMetrics {
  tokenUsage?: number;
  durationMs?: number;
  filesModified?: number;
  testsRun?: number;
  testsPassed?: number;
  [key: string]: unknown;
}

export interface FailureInfo {
  code: string;
  message: string;
  retryable?: boolean;
  details?: Record<string, unknown>;
}

// ===== Run (optional orchestration of multiple tasks) =====

export type RunState =
  | "pending"
  | "planning"
  | "executing"
  | "completed"
  | "failed"
  | "cancelled";

/** Valid Run state transitions (mirrors win-enigma core ontology). */
export const VALID_RUN_TRANSITIONS: Record<RunState, readonly RunState[]> = {
  pending: ["planning", "executing", "cancelled"],
  planning: ["executing", "failed", "cancelled"],
  executing: ["completed", "failed", "cancelled"],
  completed: [],
  failed: [],
  cancelled: [],
} as const;

export interface RunSpec {
  tenantId: TenantId;
  tasks: TaskSpec[];
  /** Run-level wall-clock deadline (ISO 8601). */
  deadlineAt?: string;
}

export interface Run {
  id: string;
  tenantId: TenantId;
  state: RunState;
  taskIds: string[];
  deadlineAt: string | null;
  createdAt: string;
  completedAt: string | null;
}

// ===== Worker (execution runtime) =====

export interface WorkerInfo {
  id: string;
  capabilityTags: CapabilityTag[];
  maxConcurrentTasks: number;
}

// ===== Tooling & guardrails (opaque-shaped, kernel passes through) =====

export interface ToolBinding {
  /** MCP tool name or namespaced identifier. */
  name: string;
  config?: Record<string, unknown>;
}

export interface ConstraintSpec {
  /** Evaluation tier. */
  tier: "eager" | "deferred" | "lazy";
  /** Rule identifier understood by the constraint harness. */
  rule: string;
  params?: Record<string, unknown>;
}

// ===== Audit (immutable event stream) =====

export interface AuditEntry {
  id: string;
  tenantId: TenantId;
  runId?: string;
  taskId?: string;
  timestamp: string;
  stage: "planning" | "execution" | "system";
  /**
   * Namespaced free-form string. Kernel-level: "task.started", "llm.completed".
   * Upper-layer: "issue.created", "employee.onboarded". The kernel contract
   * does NOT enumerate these.
   */
  type: string;
  data: Record<string, unknown>;
  metadata: Record<string, unknown>;
}

export interface AuditCursor {
  timestamp: string;
  id: string;
}

export interface AuditQuery {
  tenantId: TenantId;
  runId?: string;
  taskId?: string;
  type?: string;
  after?: AuditCursor;
  limit?: number;
}

export interface AuditPage {
  records: AuditEntry[];
  nextCursor: AuditCursor | null;
}

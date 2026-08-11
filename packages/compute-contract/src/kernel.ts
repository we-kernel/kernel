import type { LicenseEnforcer } from "./license.js";
import type {
  AuditPage,
  AuditQuery,
  CapabilityTag,
  Run,
  RunSpec,
  Task,
  TaskResult,
  TaskSpec,
  WorkerInfo,
} from "./types.js";

/**
 * The stable surface the L0-os kernel exposes to ALL upper layers
 * (L0-sdlc SDLC product line, L1 数智员工引擎, L2 集团管控).
 *
 * Today this is satisfied (via a thin adapter) by win-enigma's
 * scheduler + gateway HTTP APIs. Eventually it is satisfied by the extracted
 * pure kernel (E04). Either implementation must pass the compatibility suite
 * in @we-kernel/compute-contract-test.
 *
 * The 5 capability surfaces (ADR-0001):
 *   1. submit agent work        — submitTask / submitRun / cancel*
 *   2. query result / status    — getTask / getRun
 *   3. audit event stream       — queryAudit
 *   4. worker capability        — registerWorker / claimTask / completeTask / heartbeat
 *   5. multi-tenant context     — tenantId is a first-class field on every spec/query
 *                                 (no separate method; carried in TaskSpec / AuditQuery)
 */
export interface ComputeKernel {
  // —— Surface 1: submit agent work ——
  submitTask(spec: TaskSpec): Promise<Task>;
  submitRun(spec: RunSpec): Promise<Run>;
  cancelTask(taskId: string): Promise<void>;
  cancelRun(runId: string): Promise<void>;

  // —— Surface 2: query result / status ——
  getTask(taskId: string): Promise<Task>;
  getRun(runId: string): Promise<Run>;

  // —— Surface 3: audit stream ——
  queryAudit(query: AuditQuery): Promise<AuditPage>;

  // —— Surface 4: worker capability (runtime side) ——
  registerWorker(info: WorkerInfo): Promise<void>;
  claimTask(workerId: string, capabilityTags: CapabilityTag[]): Promise<Task | null>;
  completeTask(taskId: string, result: TaskResult): Promise<void>;
  heartbeat(workerId: string, currentTaskId?: string | null): Promise<void>;

  // —— Surface 5: license enforcement hook (optional) ——
  readonly licenseEnforcer?: LicenseEnforcer;
}

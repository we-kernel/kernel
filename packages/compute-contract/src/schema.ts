/**
 * Zod runtime schemas mirroring the types in `./types.js`.
 *
 * Upper layers and kernel implementations use these to validate payloads at
 * trust boundaries (HTTP ingress, worker→scheduler reports, audit ingestion).
 * The TS types remain the SSOT for shape; these schemas are kept in lockstep.
 */
import { z } from "zod";

export const TenantIdSchema = z.string().min(1);
export const CapabilityTagSchema = z.string().min(1);
export const ArtifactRefSchema = z.string();

export const TaskStateSchema = z.enum([
  "blocked",
  "ready",
  "executing",
  "succeeded",
  "failed",
  "cancelled",
]);

export const RunStateSchema = z.enum([
  "pending",
  "planning",
  "executing",
  "completed",
  "failed",
  "cancelled",
]);

export const ToolBindingSchema = z.object({
  name: z.string().min(1),
  config: z.record(z.unknown()).optional(),
});

export const ConstraintSpecSchema = z.object({
  tier: z.enum(["eager", "deferred", "lazy"]),
  rule: z.string().min(1),
  params: z.record(z.unknown()).optional(),
});

export const TaskSpecSchema = z.object({
  tenantId: TenantIdSchema,
  instruction: z.string().min(1),
  capabilityTags: z.array(CapabilityTagSchema).min(1),
  inputArtifacts: z.array(ArtifactRefSchema).optional(),
  tools: z.array(ToolBindingSchema).optional(),
  constraints: z.array(ConstraintSpecSchema).optional(),
  context: z.record(z.unknown()).optional(),
  deadlineMs: z.number().int().positive().optional(),
  priority: z.number().int().optional(),
});

export const FailureInfoSchema = z.object({
  code: z.string().min(1),
  message: z.string(),
  retryable: z.boolean().optional(),
  details: z.record(z.unknown()).optional(),
});

export const TaskMetricsSchema = z.object({
  tokenUsage: z.number().optional(),
  durationMs: z.number().optional(),
  filesModified: z.number().int().optional(),
  testsRun: z.number().int().optional(),
  testsPassed: z.number().int().optional(),
}).passthrough();

export const TaskResultSchema = z.object({
  summary: z.string(),
  outputArtifacts: z.array(ArtifactRefSchema).optional(),
  metrics: TaskMetricsSchema.optional(),
});

export const TaskSchema = z.object({
  id: z.string().min(1),
  tenantId: TenantIdSchema,
  state: TaskStateSchema,
  spec: TaskSpecSchema,
  result: TaskResultSchema.nullable(),
  assignedWorkerId: z.string().nullable(),
  error: FailureInfoSchema.nullable(),
  createdAt: z.string(),
  startedAt: z.string().nullable(),
  completedAt: z.string().nullable(),
});

export const RunSpecSchema = z.object({
  tenantId: TenantIdSchema,
  tasks: z.array(TaskSpecSchema).min(1),
  deadlineAt: z.string().optional(),
});

export const RunSchema = z.object({
  id: z.string().min(1),
  tenantId: TenantIdSchema,
  state: RunStateSchema,
  taskIds: z.array(z.string()),
  deadlineAt: z.string().nullable(),
  createdAt: z.string(),
  completedAt: z.string().nullable(),
});

export const WorkerInfoSchema = z.object({
  id: z.string().min(1),
  capabilityTags: z.array(CapabilityTagSchema),
  maxConcurrentTasks: z.number().int().positive(),
});

export const AuditEntrySchema = z.object({
  id: z.string().min(1),
  tenantId: TenantIdSchema,
  runId: z.string().optional(),
  taskId: z.string().optional(),
  timestamp: z.string(),
  stage: z.enum(["planning", "execution", "system"]),
  type: z.string().min(1),
  data: z.record(z.unknown()),
  metadata: z.record(z.unknown()),
});

export const AuditCursorSchema = z.object({
  timestamp: z.string(),
  id: z.string(),
});

export const AuditQuerySchema = z.object({
  tenantId: TenantIdSchema,
  runId: z.string().optional(),
  taskId: z.string().optional(),
  type: z.string().optional(),
  after: AuditCursorSchema.optional(),
  limit: z.number().int().positive().optional(),
});

export const AuditPageSchema = z.object({
  records: z.array(AuditEntrySchema),
  nextCursor: AuditCursorSchema.nullable(),
});

export const DispatchDecisionSchema = z.object({
  allowed: z.boolean(),
  reason: z.string(),
});

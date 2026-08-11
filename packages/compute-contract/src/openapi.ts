import { CONTRACT_VERSION } from "./version.js";

/**
 * OpenAPI 3.1 document for the kernel HTTP transport.
 *
 * GENERATED-MANUAL: kept in lockstep with the ComputeKernel interface in
 * ./kernel.ts. The TS interface is the SSOT; this document describes the HTTP
 * projection that kernel implementations (win-enigma adapter today, pure
 * kernel tomorrow) must satisfy.
 *
 * Convention:
 *   - All operations carry `X-Tenant-Id` AND a body-level tenantId (defense in
 *     depth, mirrors win-enigma). They MUST match.
 *   - `X-Kernel-Contract-Version: <major>` is required on every request.
 */
export const openApiDocument = {
  openapi: "3.1.0",
  info: {
    title: "we-kernel compute contract",
    version: CONTRACT_VERSION,
    description:
      "Domain-agnostic agent execution kernel. Surfaces: submit work, query status, audit stream, worker capability, multi-tenant scope.",
    license: { name: "Apache-2.0" },
  },
  components: {
    securitySchemes: {
      bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
    },
  },
  security: [{ bearerAuth: [] }],
  headers: {
    TenantId: {
      description: "Tenant scope. Must match body.tenantId where present.",
      schema: { type: "string", minLength: 1 },
      required: true,
    },
    ContractVersion: {
      description: "Contract major version",
      schema: { type: "integer" },
      required: true,
    },
  },
  paths: {
    "/v1/tasks": {
      post: {
        summary: "submitTask (Surface 1)",
        requestBody: { required: true, content: { "application/json": {} } },
        responses: { 200: { description: "Task" }, 400: { description: "validation error" } },
      },
    },
    "/v1/tasks/{taskId}": {
      get: { summary: "getTask (Surface 2)", responses: { 200: { description: "Task" } } },
    },
    "/v1/tasks/{taskId}/cancel": {
      post: { summary: "cancelTask (Surface 1)", responses: { 204: { description: "cancelled" } } },
    },
    "/v1/runs": {
      post: { summary: "submitRun (Surface 1)", responses: { 200: { description: "Run" } } },
    },
    "/v1/runs/{runId}": {
      get: { summary: "getRun (Surface 2)", responses: { 200: { description: "Run" } } },
    },
    "/v1/runs/{runId}/cancel": {
      post: { summary: "cancelRun (Surface 1)", responses: { 204: { description: "cancelled" } } },
    },
    "/v1/audit": {
      get: {
        summary: "queryAudit (Surface 3)",
        parameters: [
          { name: "runId", in: "query", schema: { type: "string" } },
          { name: "taskId", in: "query", schema: { type: "string" } },
          { name: "type", in: "query", schema: { type: "string" } },
          { name: "afterTimestamp", in: "query", schema: { type: "string" } },
          { name: "afterId", in: "query", schema: { type: "string" } },
          { name: "limit", in: "query", schema: { type: "integer" } },
        ],
        responses: { 200: { description: "AuditPage" } },
      },
    },
    "/v1/workers:register": {
      post: { summary: "registerWorker (Surface 4)", responses: { 200: { description: "ack" } } },
    },
    "/v1/tasks:claim": {
      post: { summary: "claimTask (Surface 4)", responses: { 200: { description: "Task | null" } } },
    },
    "/v1/tasks/{taskId}:complete": {
      post: { summary: "completeTask (Surface 4)", responses: { 200: { description: "ack" } } },
    },
    "/v1/workers/{workerId}/heartbeat": {
      post: { summary: "heartbeat (Surface 4)", responses: { 200: { description: "ack" } } },
    },
  },
} as const;

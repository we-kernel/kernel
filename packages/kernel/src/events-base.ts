// @we-kernel/kernel — events-base (Wave 1a, E04b / ADR-0004 / we-kernel/program #7)
//
// Source: win-enigma/packages/core/src/ontology/events.ts
//
// Domain-agnostic GENERIC slice extracted from the Win-Enigma core event
// ontology. Contains ONLY the envelope + factory primitives, the schema-version
// constants, and the auth/repo-access events whose payloads do NOT reference
// any SDLC concept (Blueprint / Requirement / TestExecution / Installation /
// Project / git repo / Deployment / Release / etc.).
//
// SDLC-specific events (issue.created, run.*, task.*, planning.*, gate.*,
// *.state_changed, memory_*, blueprint.*, subtask.*, context.*, tenant.llm_*,
// llm.*, etc.) stay in win-enigma as events-sdlc (Wave 1b consumer will split
// them out, or they remain in win-enigma as SDLC-only).
//
// Notable cross-file dependency resolution:
//   - `PLATFORM_TENANT_ID` is owned by ./constants.js (GENERIC leaf in this
//     same package, the Wave 1a constants extraction). It is imported (single
//     SSOT, FIP-0020 §2.1 nil UUID) rather than re-declared here.
//   - `EventSource` is a pure string-literal union with no SDLC concept
//     dependency. It is now owned by ./entities-base.js (migrated in Wave 1b
//     #8) and imported here as a type-only dependency — single SSOT for this
//     fundamental kernel symbol.
//
// No reverse dependency: this file MUST NOT import anything from win-enigma.

// PLATFORM_TENANT_ID is owned by ./constants.js (GENERIC leaf, same package).
// Imported here rather than re-declared to keep a single SSOT (FIP-0020 §2.1).
import { PLATFORM_TENANT_ID } from "./constants.js";
import type { EventSource } from "./entities-base.js";


/**
 * Current event-schema version.
 *
 * Version history:
 * - 1: original WinEnigmaEvent shape (pre-multi-tenant)
 * - 2: adds `tenantId` top-level field (FIP-0020 Phase 1)
 *
 * Bump this constant whenever the event shape changes so that consumers can
 * branch on `event.schemaVersion` for backward-compatible validation.
 */
export const EVENT_SCHEMA_VERSION = 2 as const;

/**
 * JWT/token audience values for auth events. Mirrors the audience taxonomy
 * defined in FIP-0020 §3.3 ("Token Design") — see `packages/identity-store`
 * for the authoritative list. Re-declared here so core does not need to
 * import from identity-store (dependency direction: identity-store -> core).
 */
export type AuthAudience =
  | "win-enigma-tenant"
  | "win-enigma-platform"
  | "win-enigma-legacy";

/** Reason codes shared by auth-failure events. */
export type AuthLoginFailureReason =
  | "invalid_credentials"
  | "user_not_found"
  | "user_suspended"
  | "mfa_failed"
  | "rate_limited";

/** Severity for tenant-mismatch alerts. */
export type TenantMismatchSeverity = "warning" | "critical";

export interface WinEnigmaEvent<T = unknown> {
  id: string;
  type: string;
  source: EventSource;
  timestamp: Date;
  correlationId: string;
  schemaVersion: number;
  /**
   * Tenant that owns the underlying entity. Platform-level events use
   * `PLATFORM_TENANT_ID`. Optional on the interface so legacy callers
   * continue to typecheck; `createEvent` fills in `PLATFORM_TENANT_ID`
   * whenever omitted.
   */
  tenantId?: string;
  payload: T;
}

/**
 * #317 Task 5.2 (FR-1.6.1/FR-1.6.2): bare payload shape for a single
 * repo-access audit record (clone / push / skip / fail) forwarded
 * worker→scheduler on the task completion body. Carries NO token / file
 * contents — only the metadata needed to attribute which tenant/repo a task
 * touched + the outcome.
 *
 * Centralized here in the core ontology (#550 C1) so the worker executor,
 * the worker reporter, and the scheduler all reference ONE definition
 * instead of three independent inline copies. Previously the scheduler had
 * to re-declare a loose `RepoAccessLike` because it could not import the
 * worker's type.
 *
 * This is the *payload* shape. When published on the EventBus it is wrapped
 * by {@link RepoAccessEvent} (a `WinEnigmaEvent<RepoAccessPayload>` envelope)
 * via {@link createRepoAccessEvent}, so the event carries the standard
 * `id` / `correlationId` / `schemaVersion` / `source` / `timestamp` fields
 * and downstream consumers can `subscribe("repo.accessed", ...)`.
 *
 * `sha` is populated only when `outcome === "pushed"` (#454) so the delivered
 * commit can be surfaced back into the source issue's progress comments.
 */
export interface RepoAccessPayload {
  tenantId: string;
  /** Repository in `owner/repo` form. */
  ownerRepo: string;
  /** Provider used (github / gitlab / gitee / bitbucket). */
  provider: string;
  /** Task branch the clone/push targeted. */
  branch?: string;
  outcome: "cloned" | "pushed" | "skipped" | "failed";
  /** Free-text reason (failure cause / skip reason / etc). Optional. */
  reason?: string;
  /** #454: commit SHA captured after a successful push. */
  sha?: string;
}

/**
 * #550 (C1): `RepoAccessEvent` promoted to a first-class `WinEnigmaEvent`.
 *
 * Previously the repo-access record lived only as a bare inline object
 * duplicated across the scheduler server, the scheduler result API, and the
 * worker reporter — it was treated as a `TaskResult` envelope field rather
 * than an event, so it could not be published to the EventBus, had no
 * dead-letter queue, no `schemaVersion`, and no `correlationId`. Lifting it
 * into the ontology registry means downstream consumers can now
 * `subscribe("repo.accessed", handler)` and the event schema evolves under
 * `EVENT_SCHEMA_VERSION` like every other domain event.
 *
 * The worker still ships an array of bare {@link RepoAccessPayload} records
 * on `TaskResult.repoAccess` (the completion body is a bulk delivery
 * channel, not a per-event publish); the scheduler wraps each payload in a
 * full {@link RepoAccessEvent} via {@link createRepoAccessEvent} and
 * publishes it to the EventBus once received.
 */
export interface RepoAccessEvent extends WinEnigmaEvent<RepoAccessPayload> {
  type: "repo.accessed";
}

// --- Auth & Multi-Tenant Events (FIP-0020 Phase 1) ---
//
// These events flow through the platform-wide event bus to support the
// multi-tenant auth lifecycle: login success/failure telemetry, force-logout
// fan-out (consumed by gateway to invalidate token caches), password reset
// audit, and worker tenant-mismatch detection. Reference: FIP-0020 §2.4
// ("事件 schema 演进") and §3.4 ("Force Logout 流程").

export interface AuthLoginSucceededEvent extends WinEnigmaEvent<{
  userId: string;
  email: string;
  audience: AuthAudience;
  ipAddress: string;
  userAgent: string;
  mfaUsed: boolean;
  /** ISO-8601 timestamp string emitted by the identity store. */
  timestamp: string;
}> {
  type: "auth.login_succeeded";
}

export interface AuthLoginFailedEvent extends WinEnigmaEvent<{
  /**
   * Email of the attempted login, when known. Absent when the supplied
   * identifier is not a registered email (e.g. random probe).
   */
  email?: string;
  reason: AuthLoginFailureReason;
  ipAddress: string;
  userAgent: string;
  /** ISO-8601 timestamp string. */
  timestamp: string;
}> {
  type: "auth.login_failed";
}

export interface AuthForceLogoutEvent extends WinEnigmaEvent<{
  /** User whose sessions are being revoked. */
  targetUserId: string;
  /** Platform admin or tenant admin who triggered the revocation. */
  triggeredByUserId: string;
  reason: string;
  /** New token version; existing tokens with lower versions are invalid. */
  newTokenVersion: number;
  /** Whether the event was published to the cross-process pub/sub bus. */
  publishedToPubSub: boolean;
  /** ISO-8601 timestamp string. */
  timestamp: string;
}> {
  type: "auth.force_logout";
}

export interface AuthPasswordResetEvent extends WinEnigmaEvent<{
  userId: string;
  initiatedBy: "user" | "admin" | "system";
  via: "email_link" | "admin_force" | "self_service";
  /** ISO-8601 timestamp string. */
  timestamp: string;
}> {
  type: "auth.password_reset";
}

export interface WorkerTenantMismatchEvent extends WinEnigmaEvent<{
  workerId: string;
  /**
   * Tenant the worker was expected to serve. Absent when the worker had
   * no assigned tenant context (e.g. legacy single-tenant worker).
   */
  actualTenantId?: string;
  taskType: string;
  severity: TenantMismatchSeverity;
  /** ISO-8601 timestamp string. */
  timestamp: string;
}> {
  type: "worker.tenant_mismatch";
}

/**
 * Event-type registry for the GENERIC kernel surface.
 *
 * NOTE: This is a SUBSET of win-enigma's `WinEnigmaEventType` union. The
 * win-enigma source carries ~60 SDLC-specific event types (issue.*, run.*,
 * task.*, planning.*, gate.*, blueprint.*, *.state_changed, memory_*, etc.)
 * that stay in win-enigma as `events-sdlc`. Only the auth + repo-access +
 * envelope-adjacent types that have payloads in THIS file are listed here.
 *
 * Consumers that need the full union should compose:
 *   `type FullEventType = KernelEventType | SdlcEventType;`
 * at the application layer. This file deliberately does not enumerate
 * SDLC types to keep the kernel dependency-free.
 */
export type WinEnigmaEventType =
  // Repo-access audit events — #550 (C1)
  | "repo.accessed"
  // Auth & multi-tenant events — FIP-0020 Phase 1
  | "auth.login_succeeded"
  | "auth.login_failed"
  | "auth.force_logout"
  | "auth.password_reset"
  | "worker.tenant_mismatch";

/**
 * Payload type mapping for each WinEnigmaEventType declared in this file.
 *
 * This is a GENERIC subset mapping covering only the events whose payload
 * shapes are defined here. SDLC event types from win-enigma (issue.created,
 * run.*, task.*, planning.*, gate.*, *.state_changed, memory_*, etc.) are
 * deliberately omitted — their payload maps live in the SDLC layer.
 *
 * Downstream code that needs the full union should compose this map with the
 * SDLC-specific map at the application layer.
 */
export interface EventPayloadMap {
  // Repo-access audit events — #550 (C1). Payload is the bare
  // `RepoAccessPayload`; the envelope is `RepoAccessEvent`.
  "repo.accessed": RepoAccessPayload;
  // Auth & multi-tenant events — FIP-0020 Phase 1
  "auth.login_succeeded": AuthLoginSucceededEvent["payload"];
  "auth.login_failed": AuthLoginFailedEvent["payload"];
  "auth.force_logout": AuthForceLogoutEvent["payload"];
  "auth.password_reset": AuthPasswordResetEvent["payload"];
  "worker.tenant_mismatch": WorkerTenantMismatchEvent["payload"];
}

/**
 * Generic event factory.
 *
 * Creates a well-formed WinEnigmaEvent with auto-generated `id` (UUID v4),
 * `timestamp` (current Date), and `correlationId` (UUID v4 unless provided).
 *
 * The `schemaVersion` field is set to the current {@link EVENT_SCHEMA_VERSION}
 * so consumers can validate backward compatibility. The `tenantId` field is
 * set to the provided value, or {@link PLATFORM_TENANT_ID} when omitted —
 * this guarantees downstream consumers always observe a defined tenant.
 *
 * @param type - The event type from WinEnigmaEventType
 * @param source - The event source
 * @param payload - The event-specific payload
 * @param correlationId - Optional correlation ID; auto-generated if omitted
 * @param tenantId - Optional tenant ID; defaults to PLATFORM_TENANT_ID
 */
export function createEvent<T extends WinEnigmaEventType>(
  type: T,
  source: EventSource,
  payload: EventPayloadMap[T],
  correlationId?: string,
  tenantId: string = PLATFORM_TENANT_ID,
): WinEnigmaEvent<EventPayloadMap[T]> & { type: T } {
  return {
    id: crypto.randomUUID(),
    type,
    source,
    timestamp: new Date(),
    correlationId: correlationId ?? crypto.randomUUID(),
    schemaVersion: EVENT_SCHEMA_VERSION,
    tenantId,
    payload,
  };
}

/**
 * Convenience constructor for {@link RepoAccessEvent} (#550 C1).
 *
 * Use this when publishing a repo-access audit record (clone / push / skip /
 * fail) to the EventBus — typically from the scheduler after wrapping a
 * bare {@link RepoAccessPayload} received from a worker's task completion
 * body. Repo-access events are always tenant-scoped, so `tenantId` is
 * required.
 *
 * `source` is the **emitter** (`EventSource`), consistent with sibling
 * factories. Callers publishing from the scheduler should pass `"scheduler"`;
 * the default `"agent"` is for direct agent-side publish. `correlationId` is
 * optional (auto-UUID when omitted).
 */
export function createRepoAccessEvent(
  payload: RepoAccessPayload,
  tenantId: string,
  source: EventSource = "agent",
  correlationId?: string,
): RepoAccessEvent {
  return createEvent("repo.accessed", source, payload, correlationId, tenantId);
}

// --- Auth & Multi-Tenant Event Constructors (FIP-0020 Phase 1) ---

/** Convenience constructor for AuthLoginSucceededEvent. */
export function createAuthLoginSucceededEvent(
  payload: AuthLoginSucceededEvent["payload"],
  source: EventSource = "agent",
  correlationId?: string,
  tenantId?: string,
): AuthLoginSucceededEvent {
  return createEvent("auth.login_succeeded", source, payload, correlationId, tenantId);
}

/** Convenience constructor for AuthLoginFailedEvent. */
export function createAuthLoginFailedEvent(
  payload: AuthLoginFailedEvent["payload"],
  source: EventSource = "agent",
  correlationId?: string,
  tenantId?: string,
): AuthLoginFailedEvent {
  return createEvent("auth.login_failed", source, payload, correlationId, tenantId);
}

/** Convenience constructor for AuthForceLogoutEvent. */
export function createAuthForceLogoutEvent(
  payload: AuthForceLogoutEvent["payload"],
  source: EventSource = "scheduler",
  correlationId?: string,
  tenantId?: string,
): AuthForceLogoutEvent {
  return createEvent("auth.force_logout", source, payload, correlationId, tenantId);
}

/** Convenience constructor for AuthPasswordResetEvent. */
export function createAuthPasswordResetEvent(
  payload: AuthPasswordResetEvent["payload"],
  source: EventSource = "agent",
  correlationId?: string,
  tenantId?: string,
): AuthPasswordResetEvent {
  return createEvent("auth.password_reset", source, payload, correlationId, tenantId);
}

/** Convenience constructor for WorkerTenantMismatchEvent. */
export function createWorkerTenantMismatchEvent(
  payload: WorkerTenantMismatchEvent["payload"],
  source: EventSource = "scheduler",
  correlationId?: string,
  tenantId?: string,
): WorkerTenantMismatchEvent {
  return createEvent("worker.tenant_mismatch", source, payload, correlationId, tenantId);
}

// --- EventBus Interface ---

export type EventHandler<T extends WinEnigmaEvent = WinEnigmaEvent> = (event: T) => Promise<void>;

export interface DeadLetterEntry {
  eventId: string;
  eventType: WinEnigmaEventType;
  event: WinEnigmaEvent;
  error: string;
  retryCount: number;
  timestamp: Date;
  lastAttempt: Date;
}

export interface DeadLetterStore {
  add(entry: DeadLetterEntry): void;
  getAll(): DeadLetterEntry[];
  remove(eventId: string): void;
}

export interface EventBus {
  publish<T extends WinEnigmaEvent>(event: T): Promise<void>;
  subscribe(type: WinEnigmaEventType, handler: EventHandler): void;
  unsubscribe(type: WinEnigmaEventType, handler: EventHandler): void;
}

export class InMemoryEventBus implements EventBus {
  private handlers = new Map<WinEnigmaEventType, Set<EventHandler>>();
  private deadLetters: DeadLetterEntry[] = [];
  private maxRetries = 5;

  async publish<T extends WinEnigmaEvent>(event: T): Promise<void> {
    const handlers = this.handlers.get(event.type as WinEnigmaEventType);
    if (!handlers) return;
    const errors: Array<{ handler: EventHandler; error: unknown }> = [];
    for (const handler of handlers) {
      try {
        await handler(event);
      } catch (e) {
        errors.push({ handler, error: e });
        const errorMessage = e instanceof Error ? e.message : String(e);
        const existing = this.deadLetters.find(d => d.eventId === event.id);
        if (existing) {
          existing.retryCount++;
          existing.lastAttempt = new Date();
          existing.error = errorMessage;
        } else {
          this.deadLetters.push({
            eventId: event.id,
            eventType: event.type as WinEnigmaEventType,
            event,
            error: errorMessage,
            retryCount: 1,
            timestamp: new Date(),
            lastAttempt: new Date(),
          });
        }
      }
    }
    if (errors.length > 0) {
      console.error(`[EventBus] ${errors.length} handler(s) failed for event ${event.type}`, errors);
    }
  }

  getDeadLetters(): DeadLetterEntry[] {
    return [...this.deadLetters];
  }

  async replayDeadLetter(eventId: string): Promise<void> {
    const index = this.deadLetters.findIndex(d => d.eventId === eventId);
    if (index === -1) return;

    const entry = this.deadLetters[index]!;
    const retryCountBefore = entry.retryCount;

    // Temporarily remove the entry so publish() won't find an existing one
    // and increment its count — we manage retryCount ourselves below.
    this.deadLetters.splice(index, 1);

    try {
      await this.publish(entry.event);
      // If publish re-added it (handler still failing), the retryCount was
      // set to 1 by publish (new entry). Correct it to reflect actual retries.
      const readded = this.deadLetters.find(d => d.eventId === eventId);
      if (readded) {
        readded.retryCount = retryCountBefore + 1;
        readded.timestamp = entry.timestamp; // preserve original timestamp
      }
      // If publish did NOT re-add, the replay succeeded — entry is already gone.
    } catch {
      // publish itself threw unexpectedly — re-insert with incremented count
      this.deadLetters.push({
        ...entry,
        retryCount: retryCountBefore + 1,
        lastAttempt: new Date(),
      });
    }
  }

  subscribe(type: WinEnigmaEventType, handler: EventHandler): void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set());
    }
    this.handlers.get(type)!.add(handler);
  }

  unsubscribe(type: WinEnigmaEventType, handler: EventHandler): void {
    this.handlers.get(type)?.delete(handler);
  }
}

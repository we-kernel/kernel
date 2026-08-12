// @we-kernel/kernel — Attachment Entity (Wave 1a, whole-file extract)
//
// Source: win-enigma/packages/core/src/ontology/attachments.ts (Epic #610 / P1-B #612).
// Extracted as a GENERIC leaf under ADR-0004 / we-kernel/program #7: zero SDLC
// type imports, no dependencies on entities/errors/events beyond a string union
// kept here in place. The original JSDoc references win-enigma-specific concepts
// (Requirement / Task / Run / Epic numbers) purely as documentation; the
// *structural* type surface is domain-agnostic.
//
// A user-supplied attachment (image / PDF / link) attached to a parent entity
// (a requirement in win-enigma, and, later, task/run). Distinct from an
// {@link Artifact} (a *run deliverable* produced by the system — code/test/doc
// with version + lifecycle). An Attachment is *user input* with no version, no
// lifecycle state machine, and content-addressed dedup.
//
// Persistence shape (Plan B): the `attachments` table is the SSOT — full
// metadata rows, tenant-scoped. The parent entity stores a *read-time-derived*
// lightweight reference ({@link AttachmentRef}) and NOT a full row. The full
// {@link Attachment} entity (including `storageKey`) is only ever held inside
// the repository + upload/download API boundary.
//
// Security note: `AttachmentRef` deliberately omits `storageKey` (and `size`)
// so the lightweight reference handed to consumers cannot leak the
// content-addressed blob key. Consumers that need the bytes must go through
// `attachmentRepo.findById()` → `storageKey` → `storage.presignedGet()` — an
// explicit hop that keeps future access-control / audit hooks viable.

// ============================================================================
// Enums
// ============================================================================

/**
 * Attachment kind.
 *
 * The full enum is defined once here, but P1 persistence is **fail-closed**:
 * only `'image'` and `'pdf'` may be stored (see `attachment-store.ts`
 * `create()` invariant). `'office'` / `'zip'` / `'url'` are reserved as
 * Phase 2 extension points — the repository rejects them at insert time so a
 * half-wired caller cannot silently persist an unsupported kind.
 */
export type AttachmentKind = "image" | "pdf" | "office" | "zip" | "url";

/**
 * How the attachment entered the system.
 *
 * - `'upload'` — direct file upload (multipart gateway API).
 * - `'url'` — a publicly fetchable URL the user pasted (fetched + re-hashed
 *   before persistence).
 * - `'feishu'` — a Feishu doc/sheet link (Phase 3; MCP-extracted).
 */
export type AttachmentSource = "upload" | "url" | "feishu";

// ============================================================================
// Entities
// ============================================================================

/**
 * Full attachment entity — one row in the `attachments` table.
 *
 * This is the **persisted** shape: it carries `storageKey` (the
 * content-addressed blob handle = sha256,「Persist THIS not a URL」)
 * and `size`. It is only ever returned to internal callers (repository,
 * upload/download API). For the lightweight reference attached to a parent
 * entity, see {@link AttachmentRef}.
 */
export interface Attachment {
  /** UUID — `crypto.randomUUID()`. */
  id: string;

  /**
   * Owning tenant UUID. NOT NULL — derived from the parent entity at insert
   * time. Attachments use an explicit `tenant_id` column to stay uniform with
   * sibling entities and unambiguous across requirement/task/run parents.
   * Fail-closed: empty/whitespace tenantId is rejected by the repository.
   */
  tenantId: string;

  /**
   * sha256 of the blob bytes (lowercase hex). Doubles as the storage key —
   * content addressing gives global dedup across tenants/workspaces (safe
   * because extracted understanding is a deterministic function of the bytes).
   */
  contentHash: string;

  /** Original filename (display only — sanitized before persist). */
  fileName: string;

  /** MIME type, e.g. `image/png`, `application/pdf`. */
  mimeType: string;

  /** Blob size in bytes. Recorded for the base64-vs-presigned call. */
  size: number;

  /** Content kind (P1: only `image` / `pdf` persistable). */
  kind: AttachmentKind;

  /** How the attachment entered the system. */
  source: AttachmentSource;

  /**
   * Content-addressed blob key (= {@link contentHash}). Persisted per
   *「Persist THIS, not a URL」. NEVER a presigned URL — those are short-lived
   * responses only.
   */
  storageKey: string;

  /** Original URL the user supplied, when {@link source} !== `'upload'`. */
  sourceUrl?: string;

  /**
   * Parent entity pointers. In win-enigma exactly one of
   * requirementId/taskId/runId is set; the kernel type keeps all three optional
   * and imposes no structural coupling to any parent entity type.
   */
  /** Parent requirement (P1-B). One of requirementId/taskId/runId is set. */
  requirementId?: string;
  /** Parent task (P1-E). */
  taskId?: string;
  /** Parent run (P1-E — mid-flight attachment). */
  runId?: string;

  /** Who/what created the row (user id, service name, etc.). */
  createdBy: string;

  /** Row creation time. */
  createdAt: Date;

  /**
   * Last time the blob was fetched for an LLM (presignedGet path). Stays null
   * until the injection path wires `touchAccessed`. Null is the expected P1-B
   * value.
   */
  lastAccessedAt?: Date | null;

  /** Soft-delete timestamp. `listBy*` exclude rows where this is set. */
  deletedAt?: Date | null;
}

/**
 * Lightweight attachment reference attached to a parent entity (read-time
 * derived from the `attachments` table, NOT persisted on the parent row).
 *
 * Deliberately omits `storageKey` AND `size`: the reference handed to
 * consumers cannot leak the blob key, and `size` is only meaningful at the
 * point of LLM injection (where the consumer must fetch the full entity anyway
 * to decide base64-vs-presigned). Consumers that need either go through
 * `attachmentRepo.findById(tenantId, id)`.
 */
export interface AttachmentRef {
  id: string;
  fileName: string;
  mimeType: string;
  kind: AttachmentKind;
  /** Present when the attachment's {@link Attachment.source} !== `'upload'`. */
  sourceUrl?: string;
}

/**
 * Cached text extraction. When the scheduler has a `ready` text-cache row for
 * this blob's {@link Attachment.contentHash}, it injects the extracted markdown
 * here so the worker can inline it as a text block WITHOUT re-downloading the
 * blob or re-converting it through an extractor.
 *
 * Three states, deliberately distinguished so the consumer can pick the right
 * fallback:
 *  - `undefined` — no text cache available at all (extraction disabled / table
 *    missing). The consumer treats the attachment exactly as before
 *    (image/pdf inline, office/zip → link-only).
 *  - `null` — the scheduler *looked* and there is no ready text (conversion
 *    pending or previously failed). The consumer emits a "conversion pending"
 *    link-only note rather than silently dropping the attachment.
 *  - `{ ... }` — a ready extraction; the consumer inlines the markdown as text.
 */
export type ExtractedText =
  | {
      /** Markdown body extracted from the blob (office / large-pdf / zip). */
      markdown: string;
      /** Source MIME the extractor reported (informational). */
      mime: string | null;
      /** Extractor version tag (e.g. `markitdown-sidecar-1`). */
      extractorVersion: string | null;
    }
  | null;

/**
 * Runtime-only attachment reference carried across the scheduler→worker
 * boundary. Extends {@link AttachmentRef} with a short-TTL presigned download
 * URL (minted by the scheduler at the processor flatten point) and the blob
 * `size` (so the worker can apply its inline-vs-link-only budget without an
 * extra fetch).
 *
 * NEVER persisted to the `attachments` table and NEVER returned from HTTP
 * attachment APIs — those keep using {@link AttachmentRef}. The worker
 * resolves bytes from `downloadUrl` lazily and base64-inlines them into a
 * content block; on any failure it degrades to a link-only text block and
 * never throws (the "never break planning/run" contract).
 */
export interface ResolvedAttachment extends AttachmentRef {
  /** Short-TTL presigned GET URL for the blob; `undefined` when storage is off. */
  downloadUrl?: string;
  /** Blob size in bytes (worker budget decision). */
  size?: number;
  /**
   * Cached text extraction injected by the scheduler. See {@link ExtractedText}
   * for the three-state semantics. Absent unless the scheduler populated it
   * from the text cache.
   */
  extractedText?: ExtractedText;
}

// ============================================================================
// Factory
// ============================================================================

/**
 * Create a new {@link Attachment} entity (not yet persisted).
 *
 * Auto-generates `id` + `createdAt`; `deletedAt` / `lastAccessedAt` start
 * unset (NULL). The caller supplies every persisted field — including
 * `storageKey` (= {@link Attachment.contentHash}, returned by `putIfAbsent`)
 * and `tenantId` (derived from the parent entity).
 */
export function createAttachment(
  input: Omit<Attachment, "id" | "createdAt" | "deletedAt" | "lastAccessedAt">,
): Attachment {
  const now = new Date();
  return {
    ...input,
    id: crypto.randomUUID(),
    createdAt: now,
    deletedAt: null,
    lastAccessedAt: null,
  };
}

/**
 * Project a full {@link Attachment} into the lightweight {@link AttachmentRef}
 * shape attached to parent entities. Strips `storageKey` / `size` / tenant /
 * timestamps so the derived reference cannot leak the blob handle.
 */
export function toAttachmentRef(attachment: Attachment): AttachmentRef {
  return {
    id: attachment.id,
    fileName: attachment.fileName,
    mimeType: attachment.mimeType,
    kind: attachment.kind,
    ...(attachment.sourceUrl !== undefined
      ? { sourceUrl: attachment.sourceUrl }
      : {}),
  };
}

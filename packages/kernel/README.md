# @we-kernel/kernel

> Domain-agnostic execution-kernel primitives (L0-os) for the we-kernel platform.
>
> Wave 1a seed — extracted from [win-enigma](https://github.com/renzhichao/Win-Enigma) `packages/core`.

`@we-kernel/kernel` holds the GENERIC slice of the Win-Enigma core ontology: types and runtime helpers that carry **no** dependency on any SDLC concept (Blueprint / Requirement / TestExecution / Installation / Project / git repo / Deployment / Release). It is the lowest layer of the four-layer we-kernel architecture (L0-os), consumed by the upper SDLC product line (L0-sdlc), the 数智员工引擎 (L1), and 集团管控 (L2).

## Wave 1a contents (v0.1.0)

| Module | Symbols |
|---|---|
| `version` | `KERNEL_VERSION` |
| `entities-base` | Transition type slice: `AgentRole`, `ArtifactState`, `VALID_ARTIFACT_TRANSITIONS`, `InstallationProvider` (full entities-base lands Wave 1b) |
| `errors-base` | `WinEnigmaError` + `WorkerUnavailableError` / `ConstraintViolationError` / `AuthenticationError` / `AuthorizationError` / `ConcurrentModificationError` |
| `events-base` | `WinEnigmaEvent<T>` envelope + `createEvent` factory + `EVENT_SCHEMA_VERSION` + 6 GENERIC event types (repo.accessed + 5 auth/worker) + `InMemoryEventBus` |
| `constants` | `PLATFORM_TENANT_ID`, `SHARED_DISPATCH_TENANT_ID`, `resolveDispatchTenantId`, platform-user helpers |
| `roles` | `ROLE_LABELS`, `getRoleLabel` (bilingual zh/en) |
| `attachments` | `Attachment`, `AttachmentRef`, `createAttachment`, `toAttachmentRef` |
| `artifacts` | `Artifact` lifecycle, `validateArtifactTransition`, `createArtifact` |
| `repo-context` | `RepoMetadata`, `RepoMetadataResolver` |
| `runtime-resource` | `RuntimeResourceBundle`, `bundlesConsumedBy` |
| `schema-registry` | `SchemaRegistry` (role-keyed ZodType registry) |

**Downgraded to SDLC-stays** (not in this package): `gate.ts` (HITL gate model, Blueprint/Run/Task-bound), SDLC error classes, ~60 SDLC event types, the SDLC event-version catalog, the blueprint-templates runtime-resource bundle, and `REQUIREMENT_BRANCH_PREFIX`. Those remain in win-enigma (L0-sdlc).

## Install

```bash
pnpm add @we-kernel/kernel
```

Same we-kernel npm org and publish pattern as [`@we-kernel/compute-contract`](https://www.npmjs.com/package/@we-kernel/compute-contract). Requires Node.js >= 22.

## Usage

```ts
import {
  PLATFORM_TENANT_ID,
  WinEnigmaError,
  createEvent,
  EVENT_SCHEMA_VERSION,
  ArtifactState,
  validateArtifactTransition,
} from "@we-kernel/kernel";
```

## Relationship to @we-kernel/compute-contract

- **`@we-kernel/compute-contract`** — the *stable API contract* (interfaces, schemas, OpenAPI) between the L0-os kernel and upper layers.
- **`@we-kernel/kernel`** (this package) — the *runtime primitives* (types, factories, validators, in-memory implementations) extracted from the kernel. It is the Wave 1a seed; later waves add the full entities-base, audit, constraints harness, and the `ComputeKernel` skeleton.

Both packages share the `we-kernel` npm org, Apache-2.0 license, and the tag-triggered publish workflow.

## Evolution

This is the Wave 1a seed of the L0-os extraction strategy. The wave table and topology live in [ADR-0004](https://github.com/we-kernel/program/blob/main/docs/adr/0004-l0os-extraction-strategy-e04b.md) (we-kernel/program). Subsequent waves migrate the remaining GENERIC ontology (full entities-base, `DataAccessProvider`, audit, constraints, `ComputeKernel` skeleton, scheduler/worker seams, governance + MCP) into this package. SDLC-bound symbols stay in win-enigma and compose `KernelType | SdlcType` at the app layer.

## License

Apache-2.0

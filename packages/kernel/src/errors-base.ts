// @we-kernel/kernel — errors-base
//
// GENERIC 错误原语。Source: win-enigma/packages/core/src/errors/index.ts (Wave 1a).
// 仅抽取领域无关 (zero-SDLC) 的错误类:
//   - WinEnigmaError                  (平台错误基类)
//   - WorkerUnavailableError          (worker 调度, 与 SDLC 实体解耦)
//   - ConstraintViolationError        (通用约束违反, 仅 constraintId+message)
//   - AuthenticationError             (认证失败)
//   - AuthorizationError              (授权失败)
//   - ConcurrentModificationError     (并发修改冲突)
//
// 留 win-enigma (errors-sdlc, 不抽): BlueprintValidationError, TaskExecutionError,
// PlanningError — 它们的定义体绑定 SDLC 概念 (blueprintId / taskId / 蓝图生命周期),
// 属于 SDLC 层而非 kernel 层。
//
// 不反向依赖 win-enigma: 本文件不 import 任何 win-enigma 路径; type-only 依赖走
// ./entities-base.js 过渡切片 (Wave 1b #8 迁移完整 entities-base)。本文件当前
// 零 entities-base 依赖 (六个目标符号均为自包含 Error 子类)。

/**
 * Platform base error. All kernel-level (and AgenticSDLC) error subclasses
 * extend this to carry a stable machine-readable `code`, an HTTP-friendly
 * `statusCode`, and optional structured `details`.
 *
 * Source: win-enigma/packages/core/src/errors/index.ts (Wave 1a transition copy).
 */
export class WinEnigmaError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 500,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "WinEnigmaError";
  }
}

/**
 * Raised when no registered worker can satisfy a requested capability.
 * GENERIC: 只引用 capability 字符串, 不绑定 SDLC 实体。
 *
 * Source: win-enigma/packages/core/src/errors/index.ts (Wave 1a transition copy).
 */
export class WorkerUnavailableError extends WinEnigmaError {
  constructor(capability: string) {
    super(`No worker available for capability: ${capability}`, "WORKER_UNAVAILABLE", 503, { capability });
    this.name = "WorkerUnavailableError";
  }
}

/**
 * Raised by the three-tier constraint harness when one or more constraints
 * are violated. GENERIC: violations 仅承载 constraintId + message, 不引用
 * 具体 SDLC 实体类型。
 *
 * Source: win-enigma/packages/core/src/errors/index.ts (Wave 1a transition copy).
 */
export class ConstraintViolationError extends WinEnigmaError {
  constructor(violations: Array<{ constraintId: string; message: string }>) {
    super("Constraint violations detected", "CONSTRAINT_VIOLATION", 422, { violations });
    this.name = "ConstraintViolationError";
  }
}

/**
 * Raised when a request lacks valid authentication credentials.
 * GENERIC authn 错误, 与 SDLC 实体解耦。
 *
 * Source: win-enigma/packages/core/src/errors/index.ts (Wave 1a transition copy).
 */
export class AuthenticationError extends WinEnigmaError {
  constructor(message = "Authentication required") {
    super(message, "AUTH_ERROR", 401);
    this.name = "AuthenticationError";
  }
}

/**
 * Raised when an authenticated principal lacks the permissions required
 * for the requested action. GENERIC authz 错误, 与 SDLC 实体解耦。
 *
 * Source: win-enigma/packages/core/src/errors/index.ts (Wave 1a transition copy).
 */
export class AuthorizationError extends WinEnigmaError {
  constructor(message = "Insufficient permissions") {
    super(message, "AUTHZ_ERROR", 403);
    this.name = "AuthorizationError";
  }
}

/**
 * Raised on optimistic-concurrency conflicts (e.g. stale version on write).
 * GENERIC: 仅 message + 自由结构 details, 不绑定 SDLC 实体类型。
 *
 * Source: win-enigma/packages/core/src/errors/index.ts (Wave 1a transition copy).
 */
export class ConcurrentModificationError extends WinEnigmaError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, "CONCURRENT_MODIFICATION_ERROR", 409, details);
    this.name = "ConcurrentModificationError";
  }
}

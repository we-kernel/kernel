// Wave 1a 过渡切片: 仅含 GENERIC 叶子/errors-base/events-base type-only 依赖的
// entities 纯类型。完整 entities-base 由 Wave 1b (we-kernel/program #8) 迁移。
//
// 本文件只复制 win-enigma/packages/core/src/ontology/entities.ts 中的以下纯类型
// (枚举/接口/常量字面量), 绝不复制 validateTransition 等实现逻辑:
//   - AgentRole
//   - ArtifactState
//   - VALID_ARTIFACT_TRANSITIONS
//   - InstallationProvider
//
// 不反向依赖 win-enigma: kernel 包不 import win-enigma 任何符号。
// 当 Wave 1b 完成完整 entities-base 迁移后, 本文件将被替换/扩展。

/**
 * Agent role taxonomy for AgenticSDLC.
 *
 * Source: win-enigma/packages/core/src/ontology/entities.ts (Wave 1a transition copy).
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
 *
 * Source: win-enigma/packages/core/src/ontology/entities.ts (Wave 1a transition copy).
 */
export type ArtifactState =
  | "draft"
  | "building"
  | "built"
  | "verified"
  | "deployed"
  | "archived"
  | "failed";

/**
 * Artifact state transitions (REQ-001)
 *
 * Pure data map; validateTransition() 实现逻辑留在 win-enigma (Wave 1b 迁移)。
 *
 * Source: win-enigma/packages/core/src/ontology/entities.ts (Wave 1a transition copy).
 */
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
 * NOTE: Wave 1b 将评估此枚举是否属于 SDLC-stays (Git provider 是 SDLC 概念)。
 * 当前包含是因为部分 GENERIC 叶子 (如 repo-context) 在 type-only 维度引用了它;
 * 若 Wave 1b 判定其不属于 kernel, 将在此处删除并改由 sdlc-stays 反向暴露。
 *
 * Source: win-enigma/packages/core/src/ontology/entities.ts (Wave 1a transition copy).
 */
export type InstallationProvider = "github" | "gitlab" | "gitee" | "bitbucket";

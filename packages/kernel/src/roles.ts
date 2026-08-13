// @we-kernel/kernel — Role Labels (GENERIC leaf)
//
// Wave 1a extraction from win-enigma/packages/core/src/ontology/roles.ts (Epic #787
// "Digital Employee"). Whole-file extract; all symbols are domain-agnostic primitives:
// bilingual label interface, agent-role display metadata, language type, and a label
// resolver. The only type dependency is {@link AgentRole}, which already lives in
// the kernel entities-base transition slice.
//
// Source: win-enigma/packages/core/src/ontology/roles.ts (whole file).
// Migration: ADR-0004 / we-kernel/program issue #7 (Wave 1a).

import type { AgentRole } from "./entities-base.js";

/**
 * Bilingual string: zh primary (business surface), en secondary (technical
 * surface / fallback). Both are required — the dashboard flips between them
 * via the active locale, never falls back to a missing label.
 */
export interface Bilingual {
  zh: string;
  en: string;
}

/**
 * Display metadata for a single {@link AgentRole}.
 *
 * - `roleLabel` — short, human-facing role name (e.g. "代码工程师").
 * - `tagline` — one-line responsibility statement shown under the role name
 *   on the digital-employee card and injected into the agent system prompt.
 */
export interface RoleLabel {
  roleLabel: Bilingual;
  defaultTagline: Bilingual;
}

/**
 * Per-role display metadata. Keys mirror {@link AgentRole} 1:1.
 *
 * The zh labels follow Epic #787's locked terminology:
 *   planner=规划师, builder=代码工程师, qa=测试工程师,
 *   security=安全工程师, sre=运维工程师, pm=产品经理,
 *   doc=文档工程师, governance=治理专员.
 *
 * These are platform-shared constants (do not vary per tenant). Per-tenant
 * overrides happen at the DigitalEmployee layer (personaName, tagline, avatar)
 * — the values here are the defaults a tenant instantiates from.
 */
export const ROLE_LABELS: Record<AgentRole, RoleLabel> = {
  planner: {
    roleLabel: { zh: "规划师", en: "Planner" },
    defaultTagline: {
      zh: "拆解需求、设计执行路径与任务编排",
      en: "Decomposes requirements and designs the execution plan",
    },
  },
  builder: {
    roleLabel: { zh: "代码工程师", en: "Code Engineer" },
    defaultTagline: {
      zh: "编写并提交高质量的实现代码",
      en: "Writes and ships high-quality implementation code",
    },
  },
  qa: {
    roleLabel: { zh: "测试工程师", en: "Test Engineer" },
    defaultTagline: {
      zh: "设计用例、执行验证并保障交付质量",
      en: "Designs test cases and verifies delivery quality",
    },
  },
  security: {
    roleLabel: { zh: "安全工程师", en: "Security Engineer" },
    defaultTagline: {
      zh: "识别风险并加固代码与依赖供应链",
      en: "Identifies risks and hardens code and the dependency supply chain",
    },
  },
  sre: {
    roleLabel: { zh: "运维工程师", en: "SRE" },
    defaultTagline: {
      zh: "维护部署流水线与运行时稳定性",
      en: "Maintains the deployment pipeline and runtime stability",
    },
  },
  pm: {
    roleLabel: { zh: "产品经理", en: "Product Manager" },
    defaultTagline: {
      zh: "对齐需求目标、澄清优先级与验收标准",
      en: "Aligns goals, priorities, and acceptance criteria",
    },
  },
  doc: {
    roleLabel: { zh: "文档工程师", en: "Documentation Engineer" },
    defaultTagline: {
      zh: "撰写并维护可读的技术与用户文档",
      en: "Authors and maintains readable technical and user docs",
    },
  },
  governance: {
    roleLabel: { zh: "治理专员", en: "Governance Officer" },
    defaultTagline: {
      zh: "执行合规审计与策略护栏",
      en: "Enforces compliance audits and policy guardrails",
    },
  },
};

/**
 * Languages supported by the bilingual label surface. Matches the dashboard
 * i18n locale keys (zh-CN → "zh", en-US → "en").
 */
export type RoleLabelLang = "zh" | "en";

/**
 * Resolve the displayable label + default tagline for a role in the given
 * language. Used by the dashboard card renderer and by the persona-prompt
 * builder (worker). Falls back to zh when an unknown language is requested
 * so a missing translation never breaks the UI.
 *
 * @returns a flat `{ roleLabel, tagline }` pair in the requested language.
 */
export function getRoleLabel(
  role: AgentRole,
  lang: RoleLabelLang,
): { roleLabel: string; tagline: string } {
  const entry = ROLE_LABELS[role];
  return {
    roleLabel: entry.roleLabel[lang],
    tagline: entry.defaultTagline[lang],
  };
}

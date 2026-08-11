# we-kernel

> 开源纯净 Agent 执行内核(L0-os)。领域无关的算力与执行底座。
>
> 🚧 待抽取(private) —— 从 `renzhichao/Win-Enigma` 渐进抽取,成熟后 flip 为 public。

## 这一层是什么

`we-kernel` 是集团 AI 原生组织平台四层架构的最底层(L0-os):从赢码(Win-Enigma)抽取通用部分,形成领域无关的开源 Agent 执行内核,服务上层 SDLC 产品线、数智员工引擎、集团管控。

包含(待抽取):

- **scheduler**:任务队列、worker 池、心跳监控
- **worker**:Agent-Loop 运行时、LLM 执行器(Anthropic/OpenAI/GLM via LiteLLM)
- **audit**:不可篡改事件流(SQLite→PG + 批量队列)
- **multi-tenant**:租户隔离基座
- **MCP 技能底座**:工具/技能市场基础
- **constraints**:三层约束(eager/deferred/lazy)= Agent 行为 guardrails
- **`LicenseEnforcer` 接口**:默认 noop,商业发行版注入 Ed25519 强制(见 ADR-0000)

不含(留在 L0-sdlc / 上层):capability(SDLC)、blueprint 语义、git provider、数智员工实体、集团管控。

## 契约

本仓库 publish `@we-kernel/compute-contract` —— 上层(L0-sdlc / L1 / L2)消费内核的稳定 API 契约。

## License

Apache-2.0(待正式声明,public 前补 LICENSE / CLA / CODE_OF_CONDUCT / SECURITY.md)。

商业增强(含 `LicenseEnforcer` 实现)不开源,属商业发行版。

## 相关

- 总规划:[we-kernel/program](https://github.com/we-kernel/program)
- 架构决策:[ADR-0000](https://github.com/we-kernel/program/blob/main/docs/adr/0000-four-layer-architecture.md)

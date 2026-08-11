/**
 * @we-kernel/compute-contract
 *
 * Stable API contract between the we-kernel L0-os execution kernel and upper
 * layers (L0-sdlc SDLC product / L1 数智员工引擎 / L2 集团管控).
 *
 * See ADR-0000 (four-layer architecture) and ADR-0001 (this contract) in
 * we-kernel/program.
 */
export * from "./version.js";
export * from "./types.js";
export * from "./license.js";
export * from "./kernel.js";
export * as schema from "./schema.js";

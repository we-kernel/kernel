import { noopLicenseEnforcer, type ComputeKernel } from "@we-kernel/compute-contract";

export interface ContractTestResult {
  name: string;
  pass: boolean;
  error?: string;
}

/**
 * Compatibility suite for any @we-kernel/compute-contract implementation.
 *
 * A kernel is contract-compliant iff every check passes. Upper layers
 * (e.g. the win-enigma L0-sdlc adapter) call this in their own test framework
 * and assert `results.every(r => r.pass)`.
 *
 * Skeleton (E02 acceptance): covers the 5 surfaces' core invariants —
 * submit→get, claim→complete, tenant-scoped audit, cursor pagination, license
 * noop default. Extend per-surface as the contract matures.
 */
export async function runContractTests(
  kernel: ComputeKernel,
): Promise<ContractTestResult[]> {
  const results: ContractTestResult[] = [];
  const check = async (name: string, fn: () => Promise<void>): Promise<void> => {
    try {
      await fn();
      results.push({ name, pass: true });
    } catch (err) {
      results.push({ name, pass: false, error: err instanceof Error ? err.message : String(err) });
    }
  };

  const tenantA = "tenant-A";
  const tenantB = "tenant-B";

  // 1. submitTask → getTask round trip
  await check("submitTask returns a Task in a valid initial state", async () => {
    const task = await kernel.submitTask({
      tenantId: tenantA,
      instruction: "contract-test: noop",
      capabilityTags: ["test"],
    });
    if (!task.id) throw new Error("task.id missing");
    if (task.tenantId !== tenantA) throw new Error("tenantId mismatch");
    if (task.result !== null) throw new Error("result should be null initially");
    const fetched = await kernel.getTask(task.id);
    if (fetched.id !== task.id) throw new Error("getTask id mismatch");
  });

  // 2. registerWorker → claimTask → completeTask round trip
  await check("worker claim→complete round trip transitions to succeeded", async () => {
    const workerId = "worker-contract-test";
    await kernel.registerWorker({
      id: workerId,
      capabilityTags: ["test"],
      maxConcurrentTasks: 1,
    });
    await kernel.submitTask({
      tenantId: tenantA,
      instruction: "contract-test: claim",
      capabilityTags: ["test"],
    });
    const claimed = await kernel.claimTask(workerId, ["test"]);
    if (!claimed) throw new Error("claim returned null");
    await kernel.completeTask(claimed.id, {
      summary: "done",
      metrics: { durationMs: 10 },
    });
    const done = await kernel.getTask(claimed.id);
    if (done.state !== "succeeded") throw new Error(`expected succeeded, got ${done.state}`);
  });

  // 3. tenant isolation via audit scope
  await check("queryAudit is tenant-scoped (no cross-tenant leak)", async () => {
    await kernel.submitTask({
      tenantId: tenantB,
      instruction: "contract-test: tenant B",
      capabilityTags: ["test"],
    });
    const aPage = await kernel.queryAudit({ tenantId: tenantA, limit: 100 });
    const leaked = aPage.records.some((r) => r.tenantId === tenantB);
    if (leaked) throw new Error("tenant B records leaked into tenant A audit view");
  });

  // 4. audit cursor pagination (no overlap across pages)
  await check("queryAudit cursor does not return overlapping records", async () => {
    const first = await kernel.queryAudit({ tenantId: tenantA, limit: 1 });
    if (first.records.length === 0 || !first.nextCursor) return;
    const second = await kernel.queryAudit({
      tenantId: tenantA,
      limit: 1,
      after: first.nextCursor,
    });
    const overlap = second.records.some((r) =>
      first.records.some((f) => f.id === r.id),
    );
    if (overlap) throw new Error("cursor returned overlapping records");
  });

  // 5. license noop default allows dispatch
  await check("license noop default allows dispatch", async () => {
    const enforcer = kernel.licenseEnforcer ?? noopLicenseEnforcer;
    const decision = await enforcer.isDispatchAllowed({
      tenantId: tenantA,
      capabilityTags: ["test"],
    });
    if (!decision.allowed) throw new Error("noop enforcer denied dispatch");
  });

  return results;
}

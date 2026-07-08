/**
 * Next.js instrumentation hook — boots the Operations Center monitoring
 * worker once per server process. Guarded against the build phase.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  const { ensureMonitorStarted } = await import("@/lib/ops/monitor");
  const { ensureExecutionEngineStarted } = await import("@/lib/execution/engine");
  const { ensureBrainStarted } = await import("@/lib/brain/orchestrator");
  ensureMonitorStarted();
  ensureExecutionEngineStarted();
  ensureBrainStarted();
}

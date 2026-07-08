// AITradeMinds — Portfolio Foundation bootstrap. Idempotent. Snapshots are
// captured per-account on demand (via API/OMS); a global marker registers
// availability into the Operations Center surfaces.
import { singleton } from "@/kernel";

interface PfBootState {
  done: boolean;
}

const state = singleton<PfBootState>("portfolio.bootstrap.state", () => ({ done: false }));

export function bootstrapPortfolio(): { ready: boolean } {
  if (!state.done) state.done = true;
  return { ready: state.done };
}

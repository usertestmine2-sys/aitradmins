// AITradeMinds — Portfolio Intelligence bootstrap. Idempotent. Recommend-only.
import { singleton } from "@/kernel";

interface PfiBootState {
  done: boolean;
}

const state = singleton<PfiBootState>("portfolio_intel.bootstrap.state", () => ({ done: false }));

// Portfolio intelligence is invoked on-demand per account (no global worker needed;
// account-scoped analysis would over-run a single scheduler). Bootstrap marks
// availability for the analytics/ops surfaces.
export function bootstrapPortfolioIntel(): { ready: boolean } {
  if (!state.done) state.done = true;
  return { ready: state.done };
}

// AITradeMinds — Identity bootstrap. Idempotently seeds baseline roles.
import { singleton } from "@/kernel";
import { identityRepository } from "./repository";

const BASELINE_ROLES: Array<{ name: string; description: string }> = [
  { name: "admin", description: "Full platform administration" },
  { name: "trader", description: "Can trade and manage own portfolio" },
  { name: "analyst", description: "Read-only research and analytics" },
  { name: "service", description: "Machine-to-machine service account" },
];

interface IdentityBootState {
  done: boolean;
}

const state = singleton<IdentityBootState>("identity.bootstrap.state", () => ({ done: false }));

export async function bootstrapIdentity(): Promise<{ roles: string[] }> {
  if (!state.done) {
    for (const role of BASELINE_ROLES) {
      await identityRepository.ensureRole(role.name, role.description);
    }
    state.done = true;
  }
  return { roles: BASELINE_ROLES.map((r) => r.name) };
}

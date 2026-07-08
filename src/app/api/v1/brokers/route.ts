import { z } from "zod";
import { okResponse, toResponse, errors } from "@/kernel";
import { parseBody } from "@/modules/security";
import { requireAdmin } from "@/modules/identity";
import { bootstrapBrokers, brokerManager, BROKERS, type BrokerName } from "@/modules/broker";

export const dynamic = "force-dynamic";

// Broker Foundation control plane (admin only). Connectivity + discovery ONLY.
// No order execution is exposed in this phase.
export async function GET(req: Request) {
  try {
    await requireAdmin(req);
    bootstrapBrokers();
    return okResponse({ brokers: brokerManager.status() });
  } catch (err) {
    return toResponse(err);
  }
}

const actionSchema = z.object({
  action: z.enum(["connect", "disconnect", "reconnect", "disable", "monitor"]),
  broker: z.enum(BROKERS).optional(),
  ref: z.string().optional(),
  clientId: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    await requireAdmin(req);
    bootstrapBrokers();
    const body = await parseBody(req, actionSchema);

    if (body.action === "monitor") {
      await brokerManager.monitorAll();
      return okResponse({ brokers: brokerManager.status() });
    }

    if (!body.broker) throw errors.badRequest("broker is required for this action");
    const broker = body.broker as BrokerName;
    const cred = { broker, ref: body.ref ?? `${broker}:vault`, clientId: body.clientId };

    switch (body.action) {
      case "connect":
        return okResponse({ broker, state: await brokerManager.connect(broker, cred) });
      case "reconnect":
        return okResponse({ broker, state: await brokerManager.reconnect(broker, cred) });
      case "disconnect":
        await brokerManager.disconnect(broker);
        return okResponse({ broker, state: brokerManager.state(broker) });
      case "disable":
        brokerManager.disable(broker);
        return okResponse({ broker, state: brokerManager.state(broker) });
      default:
        throw errors.badRequest("unsupported action");
    }
  } catch (err) {
    return toResponse(err);
  }
}

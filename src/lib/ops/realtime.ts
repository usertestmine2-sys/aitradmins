import { getEventBus } from "@/lib/events/bus";
import type { SystemEvent } from "@/lib/ops/types";

/**
 * Realtime hub — streams system events to connected dashboard clients over SSE.
 * Tracks connection counts and dropped deliveries for self-monitoring.
 */

export interface RealtimeStats {
  connections: number;
  eventsSent: number;
  eventsDropped: number;
  totalConnectionsServed: number;
}

interface Client {
  id: number;
  send: (chunk: string) => void;
}

class RealtimeHub {
  private clients = new Map<number, Client>();
  private nextId = 1;
  private eventsSent = 0;
  private eventsDropped = 0;
  private totalServed = 0;
  private keepAlive: NodeJS.Timeout | null = null;

  constructor() {
    getEventBus().subscribe((event) => this.broadcast(event));
  }

  addClient(send: (chunk: string) => void): number {
    const id = this.nextId++;
    this.clients.set(id, { id, send });
    this.totalServed += 1;
    this.ensureKeepAlive();
    return id;
  }

  removeClient(id: number): void {
    this.clients.delete(id);
    if (this.clients.size === 0 && this.keepAlive) {
      clearInterval(this.keepAlive);
      this.keepAlive = null;
    }
  }

  broadcast(event: SystemEvent): void {
    if (this.clients.size === 0) return;
    const frame = `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
    for (const client of [...this.clients.values()]) {
      try {
        client.send(frame);
        this.eventsSent += 1;
      } catch {
        this.eventsDropped += 1;
        this.removeClient(client.id);
      }
    }
  }

  stats(): RealtimeStats {
    return {
      connections: this.clients.size,
      eventsSent: this.eventsSent,
      eventsDropped: this.eventsDropped,
      totalConnectionsServed: this.totalServed,
    };
  }

  private ensureKeepAlive(): void {
    if (this.keepAlive) return;
    this.keepAlive = setInterval(() => {
      for (const client of [...this.clients.values()]) {
        try {
          client.send(": keep-alive\n\n");
        } catch {
          this.removeClient(client.id);
        }
      }
    }, 20_000);
    this.keepAlive.unref();
  }
}

const globalForHub = globalThis as typeof globalThis & {
  __aitmRealtimeHub?: RealtimeHub;
};

export function getRealtimeHub(): RealtimeHub {
  if (!globalForHub.__aitmRealtimeHub) {
    globalForHub.__aitmRealtimeHub = new RealtimeHub();
  }
  return globalForHub.__aitmRealtimeHub;
}

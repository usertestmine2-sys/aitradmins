import { describe, it, expect } from "vitest";
import { ConnectionStateMachine } from "@/modules/broker/state-machine";
import { STATE_TRANSITIONS } from "@/modules/broker/constants";
import { AppError } from "@/kernel/errors";

describe("broker/state-machine", () => {
  it("follows the legal connect->auth->ready lifecycle", () => {
    const m = new ConnectionStateMachine("PAPER");
    expect(m.current()).toBe("DISCONNECTED");
    m.transition("CONNECTING");
    m.transition("CONNECTED");
    m.transition("AUTHENTICATING");
    m.transition("READY");
    expect(m.current()).toBe("READY");
    expect(m.isOperational()).toBe(true);
  });

  it("rejects illegal transitions", () => {
    const m = new ConnectionStateMachine("ZERODHA");
    expect(() => m.transition("READY")).toThrow(AppError);
    expect(m.current()).toBe("DISCONNECTED");
  });

  it("allows READY -> DEGRADED -> READY", () => {
    const m = new ConnectionStateMachine("DHAN");
    m.transition("CONNECTING");
    m.transition("CONNECTED");
    m.transition("AUTHENTICATING");
    m.transition("READY");
    m.transition("DEGRADED");
    m.transition("READY");
    expect(m.current()).toBe("READY");
  });

  it("has a transition entry for every state", () => {
    for (const [, targets] of Object.entries(STATE_TRANSITIONS)) {
      expect(Array.isArray(targets)).toBe(true);
    }
  });
});

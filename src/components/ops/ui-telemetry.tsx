"use client";

import { useEffect } from "react";

/**
 * Arena UI telemetry beacon: reports real browser render performance to the
 * Operations Center and keeps the arena-ui heartbeat fresh while a session
 * is open.
 */
export default function UiTelemetry() {
  useEffect(() => {
    const send = (presenceOnly: boolean) => {
      let payload: Record<string, number | null> = {};
      if (!presenceOnly) {
        const nav = performance.getEntriesByType("navigation")[0] as
          | PerformanceNavigationTiming
          | undefined;
        const fcp = performance
          .getEntriesByType("paint")
          .find((entry) => entry.name === "first-contentful-paint");
        payload = {
          renderMs: nav && nav.domContentLoadedEventEnd > 0 ? nav.domContentLoadedEventEnd - nav.startTime : null,
          loadMs: nav && nav.loadEventEnd > 0 ? nav.loadEventEnd - nav.startTime : null,
          fcpMs: fcp ? fcp.startTime : null,
        };
      }
      fetch("/api/ops/telemetry/ui", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        keepalive: true,
      }).catch(() => {
        // Telemetry must never break the UI.
      });
    };

    const initial = setTimeout(() => send(false), 1500);
    const presence = setInterval(() => send(true), 60_000);
    return () => {
      clearTimeout(initial);
      clearInterval(presence);
    };
  }, []);

  return null;
}

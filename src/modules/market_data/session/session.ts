// AI Arena — Market Session engine (IST aware). Single instance.
import {
  IST_OFFSET_MINUTES,
  MARKET_HOLIDAYS_2026,
  SESSION_TIMINGS,
  type MarketSessionState,
} from "../constants";

export interface SessionInfo {
  state: MarketSessionState;
  istTime: string;
  isTradingDay: boolean;
  nextOpen: string | null;
  minutesToClose: number | null;
}

class MarketSession {
  private toIst(now: Date): Date {
    const utcMs = now.getTime() + now.getTimezoneOffset() * 60_000;
    return new Date(utcMs + IST_OFFSET_MINUTES * 60_000);
  }

  private istDateKey(ist: Date): string {
    return ist.toISOString().slice(0, 10);
  }

  isHoliday(ist: Date): boolean {
    return (MARKET_HOLIDAYS_2026 as readonly string[]).includes(this.istDateKey(ist));
  }

  isWeekend(ist: Date): boolean {
    const d = ist.getUTCDay();
    return d === 0 || d === 6;
  }

  isTradingDay(ist: Date): boolean {
    return !this.isWeekend(ist) && !this.isHoliday(ist);
  }

  getState(now: Date = new Date()): SessionInfo {
    const ist = this.toIst(now);
    const minutes = ist.getUTCHours() * 60 + ist.getUTCMinutes();
    const tradingDay = this.isTradingDay(ist);

    let state: MarketSessionState = "CLOSED";
    if (!tradingDay) {
      state = this.isHoliday(ist) ? "HOLIDAY" : "CLOSED";
    } else if (minutes >= SESSION_TIMINGS.preOpenStart && minutes < SESSION_TIMINGS.open) {
      state = "PRE_OPEN";
    } else if (minutes >= SESSION_TIMINGS.open && minutes < SESSION_TIMINGS.close) {
      state = "OPEN";
    } else if (minutes >= SESSION_TIMINGS.close && minutes < SESSION_TIMINGS.postCloseEnd) {
      state = "POST_CLOSE";
    }

    const minutesToClose =
      state === "OPEN" ? SESSION_TIMINGS.close - minutes : null;

    return {
      state,
      istTime: ist.toISOString().slice(11, 19),
      isTradingDay: tradingDay,
      nextOpen: this.computeNextOpen(ist),
      minutesToClose,
    };
  }

  private computeNextOpen(ist: Date): string | null {
    const candidate = new Date(ist.getTime());
    const minutes = ist.getUTCHours() * 60 + ist.getUTCMinutes();
    if (this.isTradingDay(ist) && minutes < SESSION_TIMINGS.open) {
      return `${this.istDateKey(ist)} 09:15 IST`;
    }
    for (let i = 1; i <= 10; i += 1) {
      candidate.setUTCDate(candidate.getUTCDate() + 1);
      if (this.isTradingDay(candidate)) {
        return `${this.istDateKey(candidate)} 09:15 IST`;
      }
    }
    return null;
  }

  isOpen(now: Date = new Date()): boolean {
    return this.getState(now).state === "OPEN";
  }
}

const globalForSession = globalThis as typeof globalThis & {
  __arenaMarketSession?: MarketSession;
};

export const marketSession: MarketSession =
  globalForSession.__arenaMarketSession ?? new MarketSession();

if (!globalForSession.__arenaMarketSession) {
  globalForSession.__arenaMarketSession = marketSession;
}

import {
  historicalManager,
  indicators,
  repository,
  type Timeframe,
} from "@/modules/market_data";
import { fail, handle } from "@/modules/market_data/http";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get("symbol");
  const tf = (searchParams.get("timeframe") ?? "1D") as Timeframe;
  if (!symbol) return fail("symbol is required");
  return handle(async () => {
    const candles = await repository.getCandles(symbol, tf, { limit: 400 });
    const bars = historicalManager.toBars(candles);
    const closes = bars.map((b) => b.close);
    const macd = indicators.macd(closes);
    const bb = indicators.bollinger(closes);
    const st = indicators.supertrend(bars);
    return {
      symbol,
      timeframe: tf,
      count: bars.length,
      latest: {
        close: indicators.last(closes),
        ema20: indicators.last(indicators.ema(closes, 20)),
        ema50: indicators.last(indicators.ema(closes, 50)),
        sma200: indicators.last(indicators.sma(closes, 200)),
        rsi14: indicators.last(indicators.rsi(closes)),
        macd: indicators.last(macd.macd),
        macdSignal: indicators.last(macd.signal),
        macdHist: indicators.last(macd.histogram),
        adx14: indicators.last(indicators.adx(bars)),
        atr14: indicators.last(indicators.atr(bars)),
        cci20: indicators.last(indicators.cci(bars)),
        obv: indicators.last(indicators.obv(bars)),
        vwap: indicators.last(indicators.vwap(bars)),
        bbUpper: indicators.last(bb.upper),
        bbLower: indicators.last(bb.lower),
        supertrend: indicators.last(st.value),
        supertrendDir: st.direction[st.direction.length - 1] ?? 0,
      },
      volumeProfile: indicators.volumeProfile(bars, 12),
    };
  });
}

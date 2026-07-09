import { db } from "./index";
import { 
  usrUsers, 
  tradeAccounts, 
  mdSymbols, 
  brainStrategies, 
  aiModels, 
  opsRegistry 
} from "./schema";

async function main() {
  console.log("🌱 Starting database seeding...");

  try {
    // 1. Seed System Admin User
    console.log("👤 Seeding system user...");
    const [systemUser] = await db.insert(usrUsers).values({
      email: "system@aitrademinds.com",
      passwordHash: "$2b$10$xyzhashedpasswordplaceholder",
      displayName: "System Administrator",
      status: "ACTIVE",
      tenantId: "tenant_system",
    }).onConflictDoNothing().returning();

    const userId = systemUser ? systemUser.id : 1;

    // 2. Seed Default Paper Trading Account
    console.log("💰 Seeding default paper trading account...");
    await db.insert(tradeAccounts).values({
      userId: userId,
      kind: "PAPER",
      currency: "INR",
      startingBalance: 1000000.0,
      cash: 1000000.0,
      realizedPnl: 0.0,
      tenantId: "tenant_system",
    }).onConflictDoNothing();

    // 3. Seed Reference NSE Symbols
    console.log("📈 Seeding NSE market symbols...");
    await db.insert(mdSymbols).values([
      {
        symbol: "RELIANCE",
        exchange: "NSE",
        name: "Reliance Industries Limited",
        instrumentType: "EQUITY",
        segment: "EQ",
        sector: "Energy",
        industry: "Oil & Gas",
        lotSize: 1,
        tickSize: 0.05,
        status: "ACTIVE",
      },
      {
        symbol: "TCS",
        exchange: "NSE",
        name: "Tata Consultancy Services Limited",
        instrumentType: "EQUITY",
        segment: "EQ",
        sector: "Technology",
        industry: "IT Services",
        lotSize: 1,
        tickSize: 0.05,
        status: "ACTIVE",
      },
      {
        symbol: "INFY",
        exchange: "NSE",
        name: "Infosys Limited",
        instrumentType: "EQUITY",
        segment: "EQ",
        sector: "Technology",
        industry: "IT Services",
        lotSize: 1,
        tickSize: 0.05,
        status: "ACTIVE",
      },
    ]).onConflictDoNothing();

    // 4. Seed Standard Trading Strategies
    console.log("🧠 Seeding baseline strategies...");
    await db.insert(brainStrategies).values([
      {
        id: "strat_ma_crossover",
        name: "Moving Average Crossover",
        description: "Standard dual EMA (9/21) trend following strategy.",
        config: { fastPeriod: 9, slowPeriod: 21 },
        stats: { winRate: 0.58, profitFactor: 1.4 },
        active: true,
        version: 1,
        status: "active",
      },
      {
        id: "strat_rsi_momentum",
        name: "RSI Momentum",
        description: "RSI oscillator overbought/oversold breakout strategy.",
        config: { rsiPeriod: 14, overbought: 70, oversold: 30 },
        stats: { winRate: 0.62, profitFactor: 1.65 },
        active: true,
        version: 1,
        status: "active",
      },
    ]).onConflictDoNothing();

    // 5. Seed Core AI Models
    console.log("🤖 Seeding AI models...");
    await db.insert(aiModels).values([
      {
        modelKey: "TREND_FOLLOWING",
        version: 1,
        hash: "sha256_trend_v1_model_weights_mock",
        datasetTrainingId: "ds_nse_historical_v1",
        weights: [0.35, 0.25, 0.40],
        featureNames: ["close_ema9", "close_ema21", "rsi_14"],
        metrics: { accuracy: 0.61, f1: 0.59 },
        active: true,
        approvalStatus: "APPROVED",
        tenantId: "tenant_system",
      },
      {
        modelKey: "RISK_ENGINE",
        version: 1,
        hash: "sha256_risk_v1_model_weights_mock",
        datasetTrainingId: "ds_nse_volatility_v1",
        weights: [0.50, 0.50],
        featureNames: ["atr_14", "historical_vol_20"],
        metrics: { precision: 0.88, recall: 0.85 },
        active: true,
        approvalStatus: "APPROVED",
        tenantId: "tenant_system",
      },
    ]).onConflictDoNothing();

    // 6. Seed Operations Registries
    console.log("⚙️ Seeding ops registry components...");
    await db.insert(opsRegistry).values([
      {
        componentId: "market_ingest",
        name: "NSE Live Feed Ingestion Engine",
        description: "Manages real-time feed socket connections and database ingestion stream.",
        kind: "engine",
        mode: "heartbeat",
        heartbeatTimeoutSec: 60,
        dependencies: [],
        alertRules: [],
        active: true,
        source: "system-bootstrap",
      },
      {
        componentId: "risk_gate",
        name: "Pre-Trade RMS Gatekeeper",
        description: "Validates incoming paper/live trades against margin requirements and exposure rules.",
        kind: "engine",
        mode: "heartbeat",
        heartbeatTimeoutSec: 30,
        dependencies: [{ componentId: "market_ingest", criticality: "HIGH" }],
        alertRules: [],
        active: true,
        source: "system-bootstrap",
      },
    ]).onConflictDoNothing();

    console.log("🎉 Seeding completed successfully!");
  } catch (error) {
    console.error("❌ Seeding encountered an error:", error);
    throw error;
  }
}

// If run directly via tsx / node
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

export { main as seed };

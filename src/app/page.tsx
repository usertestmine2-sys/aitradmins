export const dynamic = "force-dynamic";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#0a0f1e] text-white flex flex-col items-center justify-center px-6 py-12">

      {/* Header */}
      <div className="w-full max-w-5xl flex items-center justify-between mb-16">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-500 flex items-center justify-center font-bold text-white text-lg">A</div>
          <span className="text-white font-semibold text-lg tracking-tight">AITradeMinds</span>
          <span className="ml-2 text-xs bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded-full">v1.0</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span className="w-2 h-2 rounded-full bg-green-400 inline-block animate-pulse"></span>
          System Online
        </div>
      </div>

      {/* Hero */}
      <div className="text-center max-w-3xl mb-16">
        <p className="text-blue-400 text-sm uppercase tracking-widest mb-4 font-medium">
          AITradeMinds Operating System
        </p>
        <h1 className="text-5xl md:text-6xl font-bold leading-tight mb-6 bg-gradient-to-r from-white via-blue-100 to-blue-400 bg-clip-text text-transparent">
          Autonomous AI<br />Trading Platform
        </h1>
        <p className="text-slate-400 text-lg leading-relaxed max-w-2xl mx-auto">
          AAOS combines AI decision intelligence, real-time risk management,
          and paper trading execution in a single enterprise-grade operating system.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center mt-10">
          <a href="/dashboard" className="px-8 py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-xl transition-all">
            Open Dashboard →
          </a>
          <a href="/api/health" className="px-8 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold rounded-xl transition-all">
            System Health
          </a>
        </div>
      </div>

      {/* System Status Cards */}
      <div className="w-full max-w-5xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-16">
        {[
          { label: "AI Brain", status: "Initialising", color: "yellow", icon: "🧠" },
          { label: "Order Engine", status: "Ready", color: "green", icon: "📋" },
          { label: "Risk Engine", status: "Ready", color: "green", icon: "🛡️" },
          { label: "Portfolio", status: "Ready", color: "green", icon: "📊" },
        ].map((item) => (
          <div
            key={item.label}
            className="bg-white/5 border border-white/10 rounded-2xl p-5 flex items-center gap-4"
          >
            <span className="text-2xl">{item.icon}</span>
            <div>
              <p className="text-white font-medium text-sm">{item.label}</p>
              <p className={`text-xs mt-0.5 ${
                item.color === "green" ? "text-green-400" :
                item.color === "yellow" ? "text-yellow-400" : "text-red-400"
              }`}>
                ● {item.status}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Feature Grid */}
      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
        {[
          {
            icon: "🤖",
            title: "AI Society",
            desc: "Multi-agent consensus system with Analyst, Risk Officer, Executor, and Reviewer agents collaborating on every decision.",
          },
          {
            icon: "⚡",
            title: "Paper Trading Engine",
            desc: "Simulate real market conditions with full order lifecycle management, fills, and execution reports — zero financial risk.",
          },
          {
            icon: "🛡️",
            title: "Risk Management",
            desc: "Real-time position limits, drawdown controls, kill switch, and automated risk alerts protect capital at all times.",
          },
          {
            icon: "📈",
            title: "Portfolio Engine",
            desc: "Double-entry ledger, NAV tracking, P&L attribution, and real-time position management across all strategies.",
          },
          {
            icon: "🔒",
            title: "Enterprise Security",
            desc: "OAuth 2.0, RBAC, MFA, Zero Trust architecture, audit logging, and encrypted data at rest and in transit.",
          },
          {
            icon: "📡",
            title: "Event-Driven Core",
            desc: "Append-only event store, single event bus, CQRS architecture, and full audit trail for every system action.",
          },
        ].map((f) => (
          <div
            key={f.title}
            className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/8 transition-all"
          >
            <div className="text-3xl mb-4">{f.icon}</div>
            <h3 className="text-white font-semibold text-base mb-2">{f.title}</h3>
            <p className="text-slate-400 text-sm leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </div>

      {/* Deployment Info */}
      <div className="w-full max-w-5xl bg-white/5 border border-white/10 rounded-2xl p-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <p className="text-white font-semibold text-sm mb-1">Deployment Status</p>
            <p className="text-slate-400 text-xs">
              Infrastructure: Vercel (Frontend) · Supabase (Database) · Render (Backend)
            </p>
          </div>
          <div className="flex flex-wrap gap-3 text-xs">
            <span className="bg-green-500/10 text-green-400 border border-green-500/20 px-3 py-1 rounded-full">
              ✓ Supabase Connected
            </span>
            <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-3 py-1 rounded-full">
              ✓ Build Passing
            </span>
            <span className="bg-purple-500/10 text-purple-400 border border-purple-500/20 px-3 py-1 rounded-full">
              ✓ v1.0 Tagged
            </span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-16 text-center text-slate-600 text-xs">
        AITradeMinds Operating System (AAOS) · Version 1.0 · Paper Trading Edition
      </div>

    </main>
  );
}

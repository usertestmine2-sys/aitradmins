import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import dynamic from "next/dynamic";
const ClientLayoutWrapper = dynamic(() => import("./lib/auth-context").then(m => m.ClientLayoutWrapper), { ssr: false });

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "AITradeMinds — AI Trading OS",
  description: "Institutional-grade AI Trading Operating System.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased">
        <ClientLayoutWrapper>{children}</ClientLayoutWrapper>
      </body>
    </html>
  );
}

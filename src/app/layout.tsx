import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { ClientLayoutWrapper } from "./lib/auth-context";

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

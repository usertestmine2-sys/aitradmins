"use client";
// AITradeMinds — App shell: top nav, auth-aware, responsive.

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useAuth } from "@/app/lib/auth-context";
import { Button } from "./ui";

const NAV = [
  { href: "/", label: "Dashboard" },
  { href: "/market", label: "Market Watch" },
  { href: "/analytics", label: "Analytics" },
];

export function AppShell({ children }: { children: ReactNode }) {
  // const { user, logout, loading } = useAuth();
  const user = null;
  const logout = () => {};
  const loading = false;
  const pathname = usePathname();
  const onAuthPage = pathname === "/login" || pathname === "/register";

  return (
    <div className="flex min-h-screen flex-col">
      {!onAuthPage && (
        <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
            <div className="flex items-center gap-6">
              <Link href="/" className="text-sm font-bold tracking-tight text-indigo-400">
                AITradeMinds
              </Link>
              <nav className="flex gap-1">
                {NAV.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`rounded-full px-3 py-1.5 text-sm transition ${
                      pathname === item.href
                        ? "bg-indigo-500 text-white"
                        : "text-slate-400 hover:text-slate-100"
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>
            <div className="flex items-center gap-3 text-sm">
              {loading ? null : user ? (
                <>
                  <span className="text-slate-400">{user.email}</span>
                  {user.roles.includes("admin") && (
                    <span className="rounded bg-indigo-950 px-1.5 py-0.5 text-xs text-indigo-300">
                      admin
                    </span>
                  )}
                  <Button variant="ghost" onClick={() => void logout()}>
                    Sign out
                  </Button>
                </>
              ) : (
                <>
                  <Link href="/login" className="text-slate-300 hover:text-white">
                    Sign in
                  </Link>
                  <Link
                    href="/register"
                    className="rounded-lg bg-indigo-500 px-3 py-1.5 text-white hover:bg-indigo-400"
                  >
                    Get started
                  </Link>
                </>
              )}
            </div>
          </div>
        </header>
      )}
      <main className="flex-1">{children}</main>
    </div>
  );
}

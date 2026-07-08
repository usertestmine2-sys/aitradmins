// AITradeMinds — Shared UI primitives. Accessible, dark-mode-native, reusable.
"use client";

import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";

export function Card({
  title,
  children,
  actions,
  className = "",
}: {
  title?: string;
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-2xl border border-slate-800 bg-slate-900/60 p-5 ${className}`}
      aria-label={title}
    >
      {(title || actions) && (
        <header className="mb-3 flex items-center justify-between">
          {title && (
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              {title}
            </h3>
          )}
          {actions}
        </header>
      )}
      {children}
    </section>
  );
}

export function Button({
  children,
  variant = "primary",
  loading = false,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "danger";
  loading?: boolean;
}) {
  const styles: Record<string, string> = {
    primary: "bg-indigo-500 text-white hover:bg-indigo-400 disabled:bg-indigo-500/50",
    ghost: "border border-slate-700 text-slate-200 hover:bg-slate-800",
    danger: "bg-rose-600 text-white hover:bg-rose-500",
  };
  return (
    <button
      {...props}
      disabled={props.disabled || loading}
      className={`rounded-lg px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed ${styles[variant]} ${className}`}
    >
      {loading ? "…" : children}
    </button>
  );
}

export function Input({
  label,
  id,
  error,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string }) {
  return (
    <label htmlFor={id} className="block">
      <span className="mb-1 block text-sm text-slate-300">{label}</span>
      <input
        id={id}
        {...props}
        className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-500"
      />
      {error && <span className="mt-1 block text-xs text-rose-400">{error}</span>}
    </label>
  );
}

export function Spinner({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-slate-400" role="status">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-600 border-t-indigo-400" />
      {label}
    </div>
  );
}

export function EmptyState({ message }: { message: string }) {
  return <p className="py-8 text-center text-sm text-slate-500">{message}</p>;
}

export function ErrorState({ message }: { message: string }) {
  return (
    <p className="rounded-lg bg-rose-950/50 p-3 text-sm text-rose-300" role="alert">
      {message}
    </p>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-slate-800/70 ${className}`} />;
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "up" | "down" | "warn";
}) {
  const tones: Record<string, string> = {
    neutral: "bg-slate-800 text-slate-300",
    up: "bg-emerald-950 text-emerald-300",
    down: "bg-rose-950 text-rose-300",
    warn: "bg-amber-950 text-amber-300",
  };
  return (
    <span className={`rounded px-1.5 py-0.5 text-xs ${tones[tone]}`}>{children}</span>
  );
}

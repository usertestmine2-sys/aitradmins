"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/app/lib/auth-context";
import { Button, Card, ErrorState, Input } from "@/components/ui";
import type { ApiError } from "@/app/lib/api-client";

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    setLoading(true);
    try {
      await register(email, password, displayName || undefined);
      router.push("/");
    } catch (err) {
      setError((err as ApiError).message ?? "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen place-items-center px-6">
      <div className="w-full max-w-md">
        <h1 className="mb-1 text-center text-2xl font-bold text-indigo-400">AITradeMinds</h1>
        <p className="mb-6 text-center text-sm text-slate-400">Create your account</p>
        <Card>
          <form onSubmit={onSubmit} className="space-y-4">
            {error && <ErrorState message={error} />}
            <Input
              id="displayName"
              label="Display name (optional)"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
            <Input
              id="email"
              label="Email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Input
              id="password"
              label="Password"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Button type="submit" loading={loading} className="w-full">
              Create account
            </Button>
          </form>
        </Card>
        <p className="mt-4 text-center text-sm text-slate-400">
          Already registered?{" "}
          <Link href="/login" className="text-indigo-400 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

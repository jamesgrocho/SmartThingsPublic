"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    if (res?.error) {
      setError("Invalid email or password");
    } else {
      router.push("/tournaments");
      router.refresh();
    }
  }

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">🏓</div>
          <h1 className="text-3xl font-bold text-white">Welcome back</h1>
          <p className="text-gg-muted mt-2 text-sm">Sign in to manage your tournaments</p>
        </div>

        <div className="bg-gg-card border border-gg-border rounded-2xl p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-gg-error-dim border border-gg-error/30 rounded-xl px-4 py-3 text-red-400 text-sm">
                {error}
              </div>
            )}
            <div>
              <label className="label">Email</label>
              <input type="email" className="input" placeholder="you@example.com"
                value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
            </div>
            <div>
              <label className="label">Password</label>
              <input type="password" className="input" placeholder="••••••••"
                value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <button type="submit" className="btn-primary w-full py-3 text-base mt-2" disabled={loading}>
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>

        <p className="text-center text-gg-muted mt-5 text-sm">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="text-gg-green hover:text-green-400 font-medium">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}

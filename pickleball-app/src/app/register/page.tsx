"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
    if (!res.ok) {
      const d = await res.json();
      setError(d.error || "Registration failed");
      setLoading(false);
      return;
    }
    await signIn("credentials", { email, password, redirect: false });
    router.push("/tournaments");
    router.refresh();
  }

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">🏓</div>
          <h1 className="text-3xl font-bold text-white">Create an account</h1>
          <p className="text-gg-muted mt-2 text-sm">Join tournaments and track your results</p>
        </div>

        <div className="bg-gg-card border border-gg-border rounded-2xl p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-gg-error-dim border border-gg-error/30 rounded-xl px-4 py-3 text-red-400 text-sm">
                {error}
              </div>
            )}
            <div>
              <label className="label">Name</label>
              <input className="input" placeholder="Your name"
                value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
            </div>
            <div>
              <label className="label">Email</label>
              <input type="email" className="input" placeholder="you@example.com"
                value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div>
              <label className="label">Password</label>
              <input type="password" className="input" placeholder="At least 6 characters"
                value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
            </div>
            <button type="submit" className="btn-primary w-full py-3 text-base mt-2" disabled={loading}>
              {loading ? "Creating account…" : "Create account"}
            </button>
          </form>
        </div>

        <p className="text-center text-gg-muted mt-5 text-sm">
          Already have an account?{" "}
          <Link href="/login" className="text-gg-green hover:text-green-400 font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

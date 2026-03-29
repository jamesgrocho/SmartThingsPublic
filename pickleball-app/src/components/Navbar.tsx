"use client";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useState } from "react";

export default function Navbar() {
  const { data: session } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg">
          <span className="text-2xl">🏓</span>
          <span className="text-white">PickleBracket</span>
        </Link>

        <nav className="hidden sm:flex items-center gap-6 text-sm">
          <Link href="/tournaments" className="text-gray-400 hover:text-white transition-colors">
            Tournaments
          </Link>
          <Link href="/tournaments/new" className="text-gray-400 hover:text-white transition-colors">
            + New
          </Link>
        </nav>

        <div className="hidden sm:flex items-center gap-3">
          {session ? (
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-400">
                {session.user?.name}
              </span>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="btn-secondary text-sm py-1.5"
              >
                Sign out
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Link href="/login" className="btn-secondary text-sm py-1.5">
                Sign in
              </Link>
              <Link href="/register" className="btn-primary text-sm py-1.5">
                Register
              </Link>
            </div>
          )}
        </div>

        {/* Mobile menu button */}
        <button
          className="sm:hidden p-2 text-gray-400"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          ☰
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="sm:hidden border-t border-gray-800 px-6 py-4 space-y-3 bg-gray-950">
          <Link href="/tournaments" className="block text-gray-300 hover:text-white" onClick={() => setMenuOpen(false)}>
            Tournaments
          </Link>
          <Link href="/tournaments/new" className="block text-gray-300 hover:text-white" onClick={() => setMenuOpen(false)}>
            + New Tournament
          </Link>
          {session ? (
            <button onClick={() => signOut({ callbackUrl: "/" })} className="text-gray-400 hover:text-white">
              Sign out
            </button>
          ) : (
            <div className="flex gap-3">
              <Link href="/login" className="btn-secondary text-sm" onClick={() => setMenuOpen(false)}>Sign in</Link>
              <Link href="/register" className="btn-primary text-sm" onClick={() => setMenuOpen(false)}>Register</Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}

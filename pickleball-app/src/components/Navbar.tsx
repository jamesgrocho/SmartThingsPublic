"use client";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import { useState } from "react";

export default function Navbar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const isAdmin = (session?.user as { isAdmin?: boolean })?.isAdmin;

  const navLinks = [
    { href: "/tournaments", label: "Tournaments" },
    ...(isAdmin ? [{ href: "/tournaments/new", label: "+ New" }] : []),
  ];

  return (
    <header className="border-b border-gg-border bg-gg-card/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold text-base">
          <span className="text-xl">🏓</span>
          <span className="text-white">PickleBracket</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden sm:flex items-center gap-1">
          {navLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                pathname.startsWith(l.href)
                  ? "text-white bg-gg-card-2"
                  : "text-gg-muted hover:text-white"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="hidden sm:flex items-center gap-2">
          {session ? (
            <>
              <span className="text-sm text-gg-muted">{session.user?.name}</span>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="btn-secondary py-1.5 text-xs"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="btn-ghost">Sign in</Link>
              <Link href="/register" className="btn-primary py-1.5">Create account</Link>
            </>
          )}
        </div>

        <button className="sm:hidden p-2 text-gg-muted" onClick={() => setOpen(!open)}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d={open ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
          </svg>
        </button>
      </div>

      {open && (
        <div className="sm:hidden border-t border-gg-border bg-gg-card px-4 py-3 space-y-1">
          {navLinks.map((l) => (
            <Link key={l.href} href={l.href}
              className="block py-2 text-gg-muted hover:text-white text-sm"
              onClick={() => setOpen(false)}>
              {l.label}
            </Link>
          ))}
          <div className="pt-2 border-t border-gg-border flex gap-2">
            {session ? (
              <button onClick={() => signOut({ callbackUrl: "/" })} className="btn-secondary text-xs">
                Sign out
              </button>
            ) : (
              <>
                <Link href="/login" className="btn-ghost text-xs" onClick={() => setOpen(false)}>Sign in</Link>
                <Link href="/register" className="btn-primary text-xs" onClick={() => setOpen(false)}>Register</Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

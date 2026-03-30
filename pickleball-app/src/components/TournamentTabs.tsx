"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface Props {
  id: string;
  status: string;
}

export default function TournamentTabs({ id, status }: Props) {
  const pathname = usePathname();

  const tabs = [
    { href: `/tournaments/${id}`,          label: "Overview",  exact: true },
    { href: `/tournaments/${id}/matches`,   label: "Matches",   exact: false, hide: status === "REGISTRATION" },
    { href: `/tournaments/${id}/bracket`,   label: "Bracket",   exact: false, hide: status === "REGISTRATION" },
    { href: `/tournaments/${id}/players`,   label: "Players",   exact: false },
  ].filter((t) => !t.hide);

  return (
    <div className="tab-bar mt-4 -mb-px">
      {tabs.map((t) => {
        const active = t.exact
          ? pathname === t.href
          : pathname.startsWith(t.href);
        return (
          <Link key={t.href} href={t.href} className={`tab ${active ? "tab-active" : ""}`}>
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}

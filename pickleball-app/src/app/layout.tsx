import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import Navbar from "@/components/Navbar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "PickleBracket — Pickleball Tournament Software",
  description: "Run pickleball tournaments with live brackets, score reporting, and DUPR export",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gg-bg`} suppressHydrationWarning>
        <Providers>
          <div className="min-h-screen flex flex-col">
            <Navbar />
            <main className="flex-1">{children}</main>
            <footer className="border-t border-gg-border py-5 text-center text-gg-muted text-xs">
              © {new Date().getFullYear()} PickleBracket
            </footer>
          </div>
        </Providers>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import Navbar from "@/components/Navbar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "PickleBracket — Pickleball Tournament Manager",
  description: "Create and manage pickleball tournaments with live bracket tracking",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        <Providers>
          <div className="min-h-screen flex flex-col">
            <Navbar />
            <main className="flex-1">{children}</main>
            <footer className="border-t border-gray-800 py-6 text-center text-gray-500 text-sm">
              © {new Date().getFullYear()} PickleBracket — Serving up great tournaments
            </footer>
          </div>
        </Providers>
      </body>
    </html>
  );
}

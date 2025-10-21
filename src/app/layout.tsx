import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ThawbWorks POC",
  description: "Tailoring operations dashboard for Qatari branches.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} bg-muted antialiased`}>
        <div className="flex min-h-screen flex-col">
          <header className="sticky top-0 z-50 border-b bg-background">
            <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">ThawbWorks</p>
                <h1 className="text-lg font-semibold">Tailoring Operations Control</h1>
              </div>
              <nav className="flex flex-wrap items-center gap-3 text-sm font-medium text-muted-foreground">
                <Link href="/" className="hover:text-foreground">
                  Dashboard
                </Link>
                <Link href="/factory/board" className="hover:text-foreground">
                  Factory Board
                </Link>
                <Link href="/customers" className="hover:text-foreground">
                  Customers
                </Link>
                <Link href="/work-orders/new" className="hover:text-foreground">
                  New Work Order
                </Link>
                <Link href="/fabrics" className="hover:text-foreground">
                  Fabrics
                </Link>
                <Link href="/shipments" className="hover:text-foreground">
                  Shipments
                </Link>
              </nav>
            </div>
          </header>
          <main className="flex-1">
            <div className="mx-auto max-w-6xl px-4 py-8">{children}</div>
          </main>
          <footer className="border-t bg-background">
            <div className="mx-auto max-w-6xl px-4 py-4 text-xs text-muted-foreground">
              (c) {new Date().getFullYear()} ThawbWorks POC - Tailoring Operations Platform
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}

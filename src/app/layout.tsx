import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "IMAX Alerts — Know the moment bookings open",
  description:
    "Get instant email alerts when IMAX bookings open on BookMyShow for your favourite movie and screen.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-[#f8f7ff] text-[#1a1a2e] font-[family-name:var(--font-geist-sans)]">
        <main className="flex-1 flex flex-col">
          {children}
        </main>
        <footer className="px-4 py-4 text-center text-xs text-gray-400">
          Built by{" "}
          <a href="https://guneetsk.com" className="underline hover:text-gray-600">
            guneetsk.com
          </a>{" "}
          &middot; Not affiliated with BookMyShow
        </footer>
      </body>
    </html>
  );
}

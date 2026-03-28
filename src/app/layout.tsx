import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "IMAX Alerts — Get notified when bookings open",
  description:
    "Get email alerts when IMAX bookings open for your favourite movie at screens across India.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-gray-50 text-gray-900 font-[family-name:var(--font-geist-sans)]">
        <header className="border-b bg-white px-4 py-3">
          <a href="/" className="text-xl font-bold text-red-600">
            IMAX Alerts
          </a>
        </header>
        <main className="flex-1 flex items-start justify-center px-4 py-8">
          {children}
        </main>
        <footer className="border-t bg-white px-4 py-3 text-center text-sm text-gray-400">
          Built by guneetsk.com
        </footer>
      </body>
    </html>
  );
}

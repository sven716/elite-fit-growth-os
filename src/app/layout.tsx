import type { Metadata, Viewport } from "next";
import { Lato } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/AppShell";

const lato = Lato({
  variable: "--font-lato",
  subsets: ["latin"],
  weight: ["300", "400", "700", "900"],
});

export const metadata: Metadata = {
  title: "Elite Fit Growth OS",
  description:
    "Visie, doelen, planning en executie op één plek — gericht op meer klanten en meer omzet.",
};

export const viewport: Viewport = {
  themeColor: "#1a1e2e",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="nl" className={`${lato.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}

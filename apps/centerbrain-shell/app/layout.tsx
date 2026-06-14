import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SIRINX CenterBrain Shell",
  description: "Local-only CenterBrain control shell for SIRINXDev.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Sora, Inter } from "next/font/google";
import "./agents.css";

const sora = Sora({ variable: "--font-sora", subsets: ["latin"], weight: ["500", "600", "700", "800"], display: "swap" });
const inter = Inter({ variable: "--font-inter", subsets: ["latin"], weight: "variable", display: "swap" });

export const metadata: Metadata = {
  title: "AI Command Center",
  description: "One console controlling the AI agents of GhrFix and ShadiLife.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${sora.variable} ${inter.variable}`}>
      <body>
        <div
          className="ag-root"
          style={{
            ["--ag-font-display" as string]: "var(--font-sora)",
            ["--ag-font-body" as string]: "var(--font-inter)",
          }}
        >
          {children}
        </div>
      </body>
    </html>
  );
}

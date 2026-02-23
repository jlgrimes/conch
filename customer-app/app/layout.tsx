import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Conch for Teams | Memory Infrastructure for AI Agents",
  description:
    "Conch gives your AI agents durable, semantic memory with decay and reinforcement so context stays useful over time.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

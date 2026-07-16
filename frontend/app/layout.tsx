import type { Metadata } from "next";
import { AuthProvider } from "@/stores/auth-store";
import "./globals.css";

export const metadata: Metadata = {
  title: "FinAI — AI-Powered Personal Finance Assistant",
  description: "Track your personal finance, monitor budgets, and get automated recommendations using AI.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="h-full antialiased dark"
    >
      <body className="min-h-full flex flex-col bg-neutral-950 text-neutral-50 antialiased font-sans">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}

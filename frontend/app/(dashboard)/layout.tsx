"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as Icons from "lucide-react";
import { useAuth } from "@/stores/auth-store";

const NAV_ITEMS = [
  { name: "Dashboard", href: "/dashboard", icon: "LayoutDashboard" },
  { name: "Expenses", href: "/expenses", icon: "CreditCard" },
  { name: "Budgets", href: "/budgets", icon: "TrendingUp" },
  { name: "Income", href: "/income", icon: "DollarSign" },
  { name: "Reports", href: "/reports", icon: "FileText" },
  { name: "Chat", href: "/chat", icon: "MessageSquareCode" },
  { name: "Loans Tracker", href: "/loans", icon: "Users" },
  { name: "Settings", href: "/settings", icon: "Settings" },
];

function NavIcon({ name, className = "w-5 h-5" }: { name: string; className?: string }) {
  const IconComponent = (Icons as any)[name] || Icons.HelpCircle;
  return <IconComponent className={className} />;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, logout, loading } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-neutral-950">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-violet-500 border-r-2" />
        <span className="text-xs text-neutral-500 mt-3">Loading FinAI session...</span>
      </div>
    );
  }

  return (
    <div className="flex-1 flex overflow-hidden bg-neutral-950 text-neutral-200">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:flex-col md:w-64 border-r border-neutral-900 bg-neutral-950 flex-shrink-0">
        {/* Logo */}
        <div className="h-16 flex items-center gap-2 px-6 border-b border-neutral-900">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/25">
            <Icons.Layers className="w-4 h-4 text-neutral-50" />
          </div>
          <span className="font-extrabold text-lg bg-gradient-to-r from-neutral-50 to-neutral-400 bg-clip-text text-transparent tracking-tight">
            FinAI
          </span>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer ${
                  active
                    ? "bg-violet-950/20 border border-violet-500/20 text-violet-400 shadow-sm"
                    : "text-neutral-400 border border-transparent hover:bg-neutral-900/60 hover:text-neutral-200"
                }`}
              >
                <NavIcon name={item.icon} className={`w-4 h-4 ${active ? "text-violet-400" : "text-neutral-400"}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* User Card */}
        {user && (
          <div className="p-4 border-t border-neutral-900 bg-neutral-950/40">
            <div className="flex items-center justify-between gap-3 p-2 bg-neutral-900/30 border border-neutral-800/40 rounded-xl">
              <div className="flex items-center gap-2.5 truncate">
                <div className="w-9 h-9 rounded-full bg-violet-600/10 border border-violet-500/20 flex items-center justify-center text-xs font-bold text-violet-400 flex-shrink-0 uppercase">
                  {user.full_name?.slice(0, 2) || "US"}
                </div>
                <div className="truncate">
                  <span className="block text-xs font-bold text-neutral-200 truncate">
                    {user.full_name || "User"}
                  </span>
                  <span className="block text-[10px] text-neutral-500 truncate">
                    {user.email}
                  </span>
                </div>
              </div>
              <button
                onClick={logout}
                className="p-1.5 rounded-lg hover:bg-rose-950/20 text-neutral-500 hover:text-rose-400 transition cursor-pointer"
                title="Log Out"
              >
                <Icons.LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </aside>

      {/* Mobile Drawer Backdrop */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 bg-neutral-950/60 backdrop-blur-sm z-30 md:hidden cursor-pointer"
        />
      )}

      {/* Mobile Navigation Drawer */}
      <aside
        className={`fixed inset-y-0 left-0 w-64 border-r border-neutral-900 bg-neutral-950 z-40 transform transition-transform duration-300 md:hidden flex flex-col ${
          mobileOpen ? "translate-x-0" : "-translate-x-0 -left-64"
        }`}
      >
        <div className="h-16 flex items-center gap-2 px-6 border-b border-neutral-900 justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center">
              <Icons.Layers className="w-4 h-4 text-neutral-50" />
            </div>
            <span className="font-extrabold text-lg bg-gradient-to-r from-neutral-50 to-neutral-400 bg-clip-text text-transparent">
              FinAI
            </span>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="p-1 rounded-lg hover:bg-neutral-900 text-neutral-400 cursor-pointer"
          >
            <Icons.X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer ${
                  active
                    ? "bg-violet-950/20 border border-violet-500/20 text-violet-400 shadow-sm"
                    : "text-neutral-400 border border-transparent hover:bg-neutral-900/60 hover:text-neutral-200"
                }`}
              >
                <NavIcon name={item.icon} className={`w-4 h-4 ${active ? "text-violet-400" : "text-neutral-400"}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {user && (
          <div className="p-4 border-t border-neutral-900 bg-neutral-950/40">
            <div className="flex items-center justify-between gap-3 p-2 bg-neutral-900/30 border border-neutral-800/40 rounded-xl">
              <div className="flex items-center gap-2.5 truncate">
                <div className="w-9 h-9 rounded-full bg-violet-600/10 border border-violet-500/20 flex items-center justify-center text-xs font-bold text-violet-400 flex-shrink-0 uppercase">
                  {user.full_name?.slice(0, 2) || "US"}
                </div>
                <div className="truncate text-left">
                  <span className="block text-xs font-bold text-neutral-200 truncate">
                    {user.full_name || "User"}
                  </span>
                  <span className="block text-[10px] text-neutral-500 truncate">
                    {user.email}
                  </span>
                </div>
              </div>
              <button
                onClick={logout}
                className="p-1.5 rounded-lg hover:bg-rose-950/20 text-neutral-500 hover:text-rose-400 transition cursor-pointer"
              >
                <Icons.LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Top Header */}
        <header className="h-16 border-b border-neutral-900 flex items-center justify-between px-6 bg-neutral-950 flex-shrink-0 z-20">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="p-2 -ml-2 rounded-lg hover:bg-neutral-900 text-neutral-400 md:hidden cursor-pointer"
            >
              <Icons.Menu className="w-5 h-5" />
            </button>
            <span className="hidden md:inline text-sm font-semibold text-neutral-400 uppercase tracking-wider">
              {NAV_ITEMS.find((item) => pathname.startsWith(item.href))?.name || "System"}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Quick action placeholders */}
            <div className="text-xs text-neutral-500 border border-neutral-900 px-3 py-1.5 rounded-full flex items-center gap-1.5 bg-neutral-900/10">
              <Icons.Sparkles className="w-3.5 h-3.5 text-violet-500" />
              AI Assistant Online
            </div>
          </div>
        </header>

        {/* Content Outlet */}
        <main className="flex-1 overflow-y-auto bg-neutral-950 p-6 flex flex-col">
          {children}
        </main>
      </div>
    </div>
  );
}

"use client";

import React, { useState, useEffect } from "react";
import * as Icons from "lucide-react";
import { useAuth } from "@/stores/auth-store";
import { fetchApi } from "@/lib/api-client";
import { useCategories } from "@/hooks/use-expenses";

export default function SettingsPage() {
  const [mounted, setMounted] = useState(false);
  const { user, checkAuth } = useAuth();

  // Settings Forms states
  const [fullName, setFullName] = useState("");
  const [currency, setCurrency] = useState("INR");
  const [budgetThreshold, setBudgetThreshold] = useState(90);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Backup & Reset states
  const [backingUp, setBackingUp] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Category Customizer states
  const { categories, refetch: refetchCategories } = useCategories();
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryIcon, setNewCategoryIcon] = useState("Tag");
  const [newCategoryColor, setNewCategoryColor] = useState("#8B5CF6");

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    setSuccessMsg("");
    setErrorMsg("");
    try {
      await fetchApi("/categories", {
        method: "POST",
        json: {
          name: newCategoryName,
          icon: newCategoryIcon,
          color: newCategoryColor,
        },
      });
      setNewCategoryName("");
      refetchCategories();
      setSuccessMsg("Category created successfully!");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to create category.");
    }
  };

  useEffect(() => {
    setMounted(true);
    if (user) {
      setFullName(user.full_name || "");
      setCurrency(user.currency || "INR");
      const storedThreshold = localStorage.getItem("budget_alert_threshold");
      if (storedThreshold) {
        setBudgetThreshold(Number(storedThreshold));
      }
    }
  }, [user]);

  if (!mounted || !user) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-neutral-950 text-neutral-500">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-violet-500 border-r-2 mb-2" />
        <span className="text-xs font-semibold">Loading system settings...</span>
      </div>
    );
  }

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg("");
    setErrorMsg("");

    try {
      await fetchApi("/auth/me", {
        method: "PATCH",
        json: {
          full_name: fullName,
          currency: currency,
        },
      });
      localStorage.setItem("budget_alert_threshold", String(budgetThreshold));
      await checkAuth(); // Refresh global auth user details
      setSuccessMsg("Settings updated successfully!");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to update profile settings.");
    } finally {
      setSaving(false);
    }
  };

  const handleBackupData = async () => {
    setBackingUp(true);
    try {
      const response = await fetchApi("/auth/me/backup");
      if (response && response.data) {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(response.data, null, 2));
        const downloadAnchor = document.createElement("a");
        downloadAnchor.setAttribute("href", dataStr);
        downloadAnchor.setAttribute("download", `FinAI_Data_Backup_${user.email}.json`);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.removeChild(downloadAnchor);
      }
    } catch (err) {
      alert("Failed to export backing file. Verify your session.");
    } finally {
      setBackingUp(false);
    }
  };

  const handleResetData = async () => {
    setResetting(true);
    try {
      await fetchApi("/auth/me/reset-data", { method: "POST" });
      setShowResetConfirm(false);
      alert("All transactions, budgets, goals, and recurring records have been reset successfully.");
      window.location.href = "/dashboard";
    } catch (err) {
      alert("Failed to clear database logs.");
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col space-y-6">
      {/* Page Title */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-neutral-100">
          Preferences & Settings
        </h2>
        <p className="text-xs text-neutral-400 mt-1">
          Customize configuration profiles, threshold indicators, database backup nodes, and clear slate options
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side: General Profile Form Settings */}
        <div className="lg:col-span-2 space-y-6">
          <form onSubmit={handleSaveSettings} className="bg-neutral-900/10 border border-neutral-800/60 p-6 rounded-2xl space-y-6">
            <h3 className="text-sm font-black text-neutral-100 border-b border-neutral-850 pb-2 flex items-center gap-2">
              <Icons.User className="w-4 h-4 text-violet-400" />
              General Preferences
            </h3>

            {successMsg && (
              <div className="p-3 bg-emerald-950/20 border border-emerald-800/30 text-emerald-400 rounded-xl text-xs flex items-center gap-2">
                <Icons.CheckCircle className="w-4 h-4" />
                {successMsg}
              </div>
            )}
            {errorMsg && (
              <div className="p-3 bg-rose-950/20 border border-rose-800/30 text-rose-400 rounded-xl text-xs flex items-center gap-2">
                <Icons.AlertCircle className="w-4 h-4" />
                {errorMsg}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Full Name */}
              <div className="flex flex-col space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                  Full Name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="bg-neutral-900 border border-neutral-800 focus:border-violet-500 rounded-xl px-4 py-2.5 text-xs text-neutral-200 outline-none"
                  required
                />
              </div>

              {/* Email (Read Only) */}
              <div className="flex flex-col space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                  Email Address
                </label>
                <input
                  type="email"
                  value={user.email}
                  disabled
                  className="bg-neutral-950 border border-neutral-900 text-neutral-500 cursor-not-allowed rounded-xl px-4 py-2.5 text-xs outline-none"
                />
              </div>

              {/* Currency Selector */}
              <div className="flex flex-col space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                  Preferred Currency
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="bg-neutral-900 border border-neutral-800 focus:border-violet-500 rounded-xl px-4 py-2.5 text-xs text-neutral-200 outline-none"
                >
                  <option value="INR">INR (₹) - Indian Rupee</option>
                  <option value="USD">USD ($) - United States Dollar</option>
                  <option value="EUR">EUR (€) - Euro</option>
                  <option value="GBP">GBP (£) - British Pound Sterling</option>
                </select>
              </div>

              {/* Budget Threshold slider */}
              <div className="flex flex-col space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 flex justify-between">
                  <span>Budget Threshold Trigger</span>
                  <span className="text-violet-400 font-black">{budgetThreshold}%</span>
                </label>
                <div className="flex items-center gap-3 py-2">
                  <input
                    type="range"
                    min="50"
                    max="100"
                    value={budgetThreshold}
                    onChange={(e) => setBudgetThreshold(Number(e.target.value))}
                    className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-violet-600"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-neutral-850">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50 text-xs font-semibold text-neutral-50 flex items-center gap-2 cursor-pointer shadow-lg shadow-violet-500/15"
              >
                {saving && <span className="animate-spin border-2 border-neutral-50 border-t-transparent rounded-full w-3.5 h-3.5" />}
                Save Preferences
              </button>
            </div>
          </form>

          {/* Visual Category Customizer */}
          <div className="bg-neutral-900/10 border border-neutral-800/60 p-6 rounded-2xl space-y-6">
            <h3 className="text-sm font-black text-neutral-100 border-b border-neutral-850 pb-2 flex items-center gap-2">
              <Icons.FolderPlus className="w-4 h-4 text-violet-400" />
              Category Customizer
            </h3>

            {/* Custom Category Form */}
            <form onSubmit={handleCreateCategory} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Category Name */}
                <div className="flex flex-col space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                    Category Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Subscriptions"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    className="bg-neutral-900 border border-neutral-800 focus:border-violet-500 rounded-xl px-4 py-2 text-xs text-neutral-200 outline-none"
                    required
                  />
                </div>

                {/* Icon Selection */}
                <div className="flex flex-col space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                    Icon Symbol
                  </label>
                  <select
                    value={newCategoryIcon}
                    onChange={(e) => setNewCategoryIcon(e.target.value)}
                    className="bg-neutral-900 border border-neutral-800 focus:border-violet-500 rounded-xl px-4 py-2 text-xs text-neutral-200 outline-none"
                  >
                    <option value="Tag">Tag (Default)</option>
                    <option value="Coffee">Coffee (Food/Cafes)</option>
                    <option value="ShoppingBag">ShoppingBag (Retail)</option>
                    <option value="Car">Car (Transport)</option>
                    <option value="Home">Home (Rent/Utilities)</option>
                    <option value="Film">Film (Entertainment)</option>
                    <option value="Gift">Gift (Presents)</option>
                    <option value="Briefcase">Briefcase (Work/Business)</option>
                  </select>
                </div>

                {/* Color Palette */}
                <div className="flex flex-col space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                    Color Accent
                  </label>
                  <select
                    value={newCategoryColor}
                    onChange={(e) => setNewCategoryColor(e.target.value)}
                    className="bg-neutral-900 border border-neutral-800 focus:border-violet-500 rounded-xl px-4 py-2 text-xs text-neutral-200 outline-none"
                  >
                    <option value="#8B5CF6">Purple Accent</option>
                    <option value="#EC4899">Pink Accent</option>
                    <option value="#3B82F6">Blue Accent</option>
                    <option value="#10B981">Green Accent</option>
                    <option value="#F59E0B">Yellow Accent</option>
                    <option value="#EF4444">Red Accent</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-xs font-semibold text-neutral-50 flex items-center gap-1.5 cursor-pointer shadow-lg shadow-violet-500/10"
                >
                  <Icons.Plus className="w-3.5 h-3.5" />
                  Add Category
                </button>
              </div>
            </form>

            {/* List Active Custom Categories */}
            <div className="space-y-3">
              <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 block">
                Active Category List
              </label>
              <div className="flex flex-wrap gap-2 max-h-[140px] overflow-y-auto pr-1">
                {categories.map((cat) => (
                  <div
                    key={cat.id}
                    className="flex items-center gap-2 px-3 py-1.5 bg-neutral-900/50 border border-neutral-850 rounded-xl text-xs text-neutral-200 font-semibold"
                  >
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: cat.color }}
                    />
                    <span>{cat.name}</span>
                    {cat.is_default && (
                      <span className="text-[9px] text-neutral-500 uppercase tracking-widest font-normal">
                        (Default)
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Data Backup & Destructive Reset Panels */}
        <div className="space-y-6">
          {/* Data Backup Card */}
          <div className="bg-neutral-900/10 border border-neutral-800/60 p-6 rounded-2xl space-y-4">
            <h3 className="text-sm font-black text-neutral-100 flex items-center gap-2">
              <Icons.ShieldAlert className="w-4 h-4 text-emerald-400" />
              Backup Statement logs
            </h3>
            <p className="text-[10px] text-neutral-500 leading-relaxed">
              Export all stored transactions, budgets, targets, and subscription forecasts into a single JSON ledger file. Keep a copies offline for safekeeping.
            </p>
            <button
              onClick={handleBackupData}
              disabled={backingUp}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-neutral-900 border border-neutral-800 hover:bg-neutral-850 disabled:opacity-50 rounded-xl text-xs text-neutral-300 font-bold transition cursor-pointer"
            >
              {backingUp ? (
                <span className="animate-spin border-2 border-neutral-400 border-t-transparent rounded-full w-3.5 h-3.5" />
              ) : (
                <Icons.Download className="w-4 h-4 text-emerald-400" />
              )}
              Download Backup JSON
            </button>
          </div>

          {/* Destructive Clear slate Reset Card */}
          <div className="bg-neutral-900/10 border border-rose-900/30 p-6 rounded-2xl space-y-4">
            <h3 className="text-sm font-black text-red-400 flex items-center gap-2">
              <Icons.Trash2 className="w-4 h-4" />
              Danger Zone
            </h3>
            <p className="text-[10px] text-neutral-500 leading-relaxed">
              Permanently purge all income histories, expense records, budget boundaries, recurring subscriptions, and active goals. This action is irreversible.
            </p>

            {showResetConfirm ? (
              <div className="space-y-3 p-3 bg-red-950/20 border border-red-800/30 rounded-xl">
                <span className="block text-[10px] text-red-400 font-bold">
                  Are you absolutely certain? This wipes all account statistics.
                </span>
                <div className="flex gap-2 text-[10px]">
                  <button
                    onClick={handleResetData}
                    disabled={resetting}
                    className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-neutral-50 rounded-lg font-bold flex items-center gap-1.5 transition cursor-pointer"
                  >
                    {resetting && <span className="animate-spin border-2 border-neutral-50 border-t-transparent rounded-full w-2.5 h-2.5" />}
                    Confirm Purge
                  </button>
                  <button
                    onClick={() => setShowResetConfirm(false)}
                    className="px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-neutral-400 rounded-lg transition cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowResetConfirm(true)}
                className="w-full py-2.5 bg-rose-950/20 border border-rose-900/50 hover:bg-rose-950/40 rounded-xl text-xs text-rose-400 font-bold transition cursor-pointer"
              >
                Reset Financial Data
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

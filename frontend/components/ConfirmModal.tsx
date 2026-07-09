"use client";

import React from "react";
import * as Icons from "lucide-react";

interface ConfirmModalProps {
  open: boolean;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning";
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export default function ConfirmModal({
  open,
  title = "Confirm Action",
  message,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  variant = "danger",
  onConfirm,
  onCancel,
  loading = false,
}: ConfirmModalProps) {
  if (!open) return null;

  const iconColor =
    variant === "danger" ? "text-rose-400" : "text-amber-400";
  const iconBg =
    variant === "danger"
      ? "bg-rose-500/10 border-rose-500/20"
      : "bg-amber-500/10 border-amber-500/20";
  const confirmBtnClass =
    variant === "danger"
      ? "bg-rose-600 hover:bg-rose-500 shadow-rose-500/15"
      : "bg-amber-600 hover:bg-amber-500 shadow-amber-500/15";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-sm mx-4 bg-neutral-950 border border-neutral-800 rounded-2xl shadow-2xl p-6 animate-in fade-in zoom-in-95 duration-200">
        {/* Icon */}
        <div className="flex items-center gap-3 mb-4">
          <div
            className={`w-10 h-10 rounded-xl border flex items-center justify-center ${iconBg}`}
          >
            <Icons.AlertTriangle className={`w-5 h-5 ${iconColor}`} />
          </div>
          <h3 className="text-sm font-bold text-neutral-100">{title}</h3>
        </div>

        {/* Message */}
        <p className="text-xs text-neutral-400 leading-relaxed mb-6 pl-[52px]">
          {message}
        </p>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 text-xs font-semibold text-neutral-300 bg-neutral-900 border border-neutral-800 rounded-lg hover:bg-neutral-800 transition cursor-pointer disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`px-4 py-2 text-xs font-semibold text-white rounded-lg transition shadow-md cursor-pointer disabled:opacity-50 flex items-center gap-1.5 ${confirmBtnClass}`}
          >
            {loading && (
              <Icons.Loader2 className="w-3 h-3 animate-spin" />
            )}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

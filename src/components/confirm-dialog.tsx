"use client";

import { useState } from "react";
import { AlertTriangle, X } from "lucide-react";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning" | "default";
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "default",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;

  const confirmStyles = {
    danger: "bg-red-500/20 text-red-300 border border-red-500/30 hover:bg-red-500/30",
    warning: "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 hover:bg-yellow-500/30",
    default: "btn-primary",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onCancel}
      />
      <div
        className="relative glass-card p-6 max-w-md w-full mx-4 shadow-2xl"
        style={{ animation: "fadeIn 0.2s ease-out" }}
      >
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
        >
          <X size={18} />
        </button>

        <div className="flex items-start gap-3 mb-4">
          {variant === "danger" && (
            <div className="p-2 rounded-lg bg-red-500/10 text-red-400">
              <AlertTriangle size={20} />
            </div>
          )}
          <div>
            <h3 className="font-semibold text-lg">{title}</h3>
            <p className="text-sm text-[var(--muted-foreground)] mt-1">
              {message}
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg text-sm font-medium btn-secondary"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${confirmStyles[variant]}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// Hook to manage confirm dialog state easily
export function useConfirmDialog() {
  const [state, setState] = useState<{
    open: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    variant?: "danger" | "warning" | "default";
    resolve?: (value: boolean) => void;
  }>({ open: false, title: "", message: "" });

  const confirm = (opts: {
    title: string;
    message: string;
    confirmLabel?: string;
    variant?: "danger" | "warning" | "default";
  }): Promise<boolean> => {
    return new Promise((resolve) => {
      setState({ ...opts, open: true, resolve });
    });
  };

  const handleConfirm = () => {
    state.resolve?.(true);
    setState((s) => ({ ...s, open: false }));
  };

  const handleCancel = () => {
    state.resolve?.(false);
    setState((s) => ({ ...s, open: false }));
  };

  const dialogProps: ConfirmDialogProps = {
    open: state.open,
    title: state.title,
    message: state.message,
    confirmLabel: state.confirmLabel,
    variant: state.variant,
    onConfirm: handleConfirm,
    onCancel: handleCancel,
  };

  return { confirm, dialogProps };
}

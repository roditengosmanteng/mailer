"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { CheckCircle, XCircle, AlertTriangle, Info, X } from "lucide-react";

interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "warning" | "info";
  duration?: number;
}

interface ToastContextType {
  addToast: (message: string, type?: Toast["type"], duration?: number) => void;
}

const ToastContext = createContext<ToastContextType>({ addToast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback(
    (message: string, type: Toast["type"] = "info", duration = 4000) => {
      const id = Math.random().toString(36).slice(2);
      setToasts((prev) => [...prev, { id, message, type, duration }]);

      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    },
    []
  );

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const icons = {
    success: <CheckCircle size={18} className="text-green-400" />,
    error: <XCircle size={18} className="text-red-400" />,
    warning: <AlertTriangle size={18} className="text-yellow-400" />,
    info: <Info size={18} className="text-blue-400" />,
  };

  const borderColors = {
    success: "border-green-500/20",
    error: "border-red-500/20",
    warning: "border-yellow-500/20",
    info: "border-blue-500/20",
  };

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="toast-viewport">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`flex items-center gap-3 p-4 rounded-xl border ${borderColors[toast.type]} bg-[var(--card-solid)] backdrop-blur-xl shadow-2xl`}
            style={{ animation: "toast-enter 0.3s ease-out" }}
          >
            {icons[toast.type]}
            <p className="text-sm flex-1">{toast.message}</p>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

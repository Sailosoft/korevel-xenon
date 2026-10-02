"use client";

// BDToast — lightweight toast notifications for the BunnyDev module.
//
// Wrap a subtree in <BDToastProvider> and call `useBDToast().toast({...})`.

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { CheckCircle2, AlertTriangle, Info, XCircle, X } from "lucide-react";
import { cn } from "@heroui/react";
import { v7 as uuidv7 } from "uuid";

export type BDToastStatus = "info" | "success" | "warning" | "error";

export interface BDToastInput {
  title: string;
  description?: string;
  status?: BDToastStatus;
  duration?: number;
}

interface BDToastItem extends Required<Pick<BDToastInput, "title">> {
  id: string;
  description?: string;
  status: BDToastStatus;
}

export interface BDToastContextValue {
  toast: (input: BDToastInput) => void;
  dismiss: (id: string) => void;
}

const BDToastContext = createContext<BDToastContextValue | null>(null);

const STATUS_ICONS = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  error: XCircle,
} as const;

const STATUS_CLASSES: Record<BDToastStatus, string> = {
  info: "border-l-blue-500 text-blue-600",
  success: "border-l-green-500 text-green-600",
  warning: "border-l-amber-500 text-amber-600",
  error: "border-l-red-500 text-red-600",
};

export function BDToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<BDToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (input: BDToastInput) => {
      const id = uuidv7();
      const item: BDToastItem = {
        id,
        title: input.title,
        description: input.description,
        status: input.status ?? "info",
      };
      setItems((prev) => [...prev, item]);
      const duration = input.duration ?? 4000;
      window.setTimeout(() => dismiss(id), duration);
    },
    [dismiss],
  );

  return (
    <BDToastContext.Provider value={{ toast, dismiss }}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-80 flex-col gap-2">
        {items.map((item) => {
          const Icon = STATUS_ICONS[item.status];
          return (
            <div
              key={item.id}
              className={cn(
                "pointer-events-auto flex items-start gap-3 rounded-xl border border-slate-100 border-l-4 bg-white p-3 shadow-lg",
                STATUS_CLASSES[item.status],
              )}
            >
              <Icon className="mt-0.5 h-4 w-4 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-800">
                  {item.title}
                </p>
                {item.description && (
                  <p className="mt-0.5 text-xs text-slate-500">
                    {item.description}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => dismiss(item.id)}
                className="text-slate-300 transition-colors hover:text-slate-500"
                aria-label="Dismiss"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </BDToastContext.Provider>
  );
}

export function useBDToast(): BDToastContextValue {
  const ctx = useContext(BDToastContext);
  if (!ctx) {
    throw new Error("useBDToast must be used within BDToastProvider");
  }
  return ctx;
}

"use client";

import { cn } from "./cn";

export type ScrimProps = {
  open: boolean;
  onDismiss: () => void;
  className?: string;
};

export function Scrim({ open, onDismiss, className }: ScrimProps) {
  return (
    <div
      aria-hidden="true"
      onClick={onDismiss}
      className={cn(
        "fixed inset-0 z-10 bg-scrim transition-opacity duration-200",
        open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
        className
      )}
    />
  );
}

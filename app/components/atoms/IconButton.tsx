"use client";

import type { ComponentPropsWithRef, ReactNode } from "react";
import { cn } from "./cn";

export type IconButtonProps = {
  icon: ReactNode;
  /** Required — rendered as the button's aria-label since the icon alone conveys no text. */
  label: string;
  pressed?: boolean;
} & Omit<ComponentPropsWithRef<"button">, "children" | "aria-label" | "aria-pressed">;

export function IconButton({
  icon,
  label,
  pressed,
  className,
  ...rest
}: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={pressed}
      className={cn(
        "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] text-iconIdle transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yes focus-visible:ring-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-50",
        pressed && "text-gold",
        className
      )}
      {...rest}
    >
      {icon}
    </button>
  );
}

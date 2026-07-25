"use client";

import type { ComponentPropsWithRef } from "react";
import { cn } from "./cn";

export type ButtonVariant = "primary" | "outline" | "ghost";
export type ButtonSize = "md" | "lg";

const buttonSizeClassMap: Record<ButtonSize, string> = {
  md: "h-10 rounded-[8px] px-4 text-[13.5px]",
  lg: "h-12 rounded-[10px] px-5 text-[13.5px]",
};

const buttonVariantClassMap: Record<ButtonVariant, string> = {
  primary: "bg-yes text-white disabled:bg-yes-muted disabled:text-white",
  outline: "border border-line bg-surface text-ink disabled:opacity-50",
  ghost: "bg-transparent text-ink hover:bg-hover disabled:opacity-50",
};

const buttonOutlineActiveClasses = "border-yes text-yes";

export type ButtonProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  /** Selected/active styling for the outline variant. */
  active?: boolean;
} & ComponentPropsWithRef<"button">;

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  active = false,
  disabled,
  className,
  children,
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <button
      type="button"
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={cn(
        "inline-flex items-center justify-center gap-2 font-sans font-semibold transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yes focus-visible:ring-offset-2",
        "disabled:cursor-not-allowed",
        buttonSizeClassMap[size],
        buttonVariantClassMap[variant],
        variant === "outline" && active && buttonOutlineActiveClasses,
        className
      )}
      {...rest}
    >
      {loading && (
        <svg
          className="h-3.5 w-3.5 shrink-0 animate-spin"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
          />
        </svg>
      )}
      {children}
    </button>
  );
}

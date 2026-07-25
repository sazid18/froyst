"use client";

import type { ComponentPropsWithRef, ReactNode } from "react";
import { cn } from "./cn";

export type InputSize = "md" | "lg";

const inputWrapperSizeClassMap: Record<InputSize, string> = {
  md: "h-10",
  lg: "h-[46px]",
};

export type InputProps = {
  prefix?: ReactNode;
  size?: InputSize;
} & Omit<ComponentPropsWithRef<"input">, "size" | "prefix">;

export function Input({
  prefix,
  size = "md",
  className,
  disabled,
  ...rest
}: InputProps) {
  return (
    <span
      className={cn(
        "inline-flex w-full items-center gap-1.5 rounded-[8px] border border-line bg-surface px-3",
        "focus-within:ring-2 focus-within:ring-yes focus-within:ring-offset-2",
        disabled && "opacity-50",
        inputWrapperSizeClassMap[size],
        className
      )}
    >
      {prefix && (
        <span className="shrink-0 text-ink-soft" aria-hidden="true">
          {prefix}
        </span>
      )}
      <input
        disabled={disabled}
        className="w-full min-w-0 border-0 bg-transparent p-0 font-sans text-[13.5px] text-ink outline-none placeholder:text-ink-soft disabled:cursor-not-allowed"
        {...rest}
      />
    </span>
  );
}

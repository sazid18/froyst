"use client";

import type { ComponentPropsWithRef } from "react";
import { cn } from "./cn";

export type SelectOption = {
  value: string;
  label: string;
};

export type SelectProps = {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
} & Omit<ComponentPropsWithRef<"select">, "value" | "onChange" | "children">;

export function Select({
  options,
  value,
  onChange,
  className,
  disabled,
  ...rest
}: SelectProps) {
  return (
    <select
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
      className={cn(
        "h-10 w-full rounded-[8px] border border-line bg-surface px-3 font-sans text-[13.5px] text-ink",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yes focus-visible:ring-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...rest}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

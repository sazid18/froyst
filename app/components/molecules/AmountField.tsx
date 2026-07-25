"use client";

import { useId, type ChangeEvent } from "react";
import { Input, Text, cn } from "../atoms";

export type AmountFieldProps = {
  value: number | "";
  onChange: (value: number | "") => void;
  className?: string;
};

export function AmountField({ value, onChange, className }: AmountFieldProps) {
  const id = useId();

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const raw = event.target.value;
    if (raw === "") {
      onChange("");
      return;
    }

    const parsed = Number(raw);
    onChange(Number.isNaN(parsed) ? "" : parsed);
  }

  return (
    <div className={cn(className)}>
      <Text as="label" variant="label" htmlFor={id} className="mb-1.5 block">
        Amount
      </Text>
      <Input
        id={id}
        size="lg"
        prefix="$"
        type="number"
        min={1}
        inputMode="numeric"
        value={value}
        onChange={handleChange}
      />
    </div>
  );
}

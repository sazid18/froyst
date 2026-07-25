"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { Icon, Input, cn } from "../atoms";

export type SearchFieldProps = {
  value: string;
  onChange: (query: string) => void;
  placeholder?: string;
  className?: string;
};

const DEBOUNCE_MS = 200;

export function SearchField({
  value,
  onChange,
  placeholder,
  className,
}: SearchFieldProps) {
  const [localValue, setLocalValue] = useState(value);
  const [prevPropValue, setPrevPropValue] = useState(value);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined
  );

  // External changes to `value` (e.g. a "clear" button elsewhere) win over
  // local edits. Adjusting state during render — rather than syncing via an
  // effect — avoids an extra render pass and satisfies react-hooks'
  // set-state-in-effect rule.
  if (value !== prevPropValue) {
    setPrevPropValue(value);
    setLocalValue(value);
  }

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const next = event.target.value;
    setLocalValue(next);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      onChange(next);
    }, DEBOUNCE_MS);
  }

  return (
    <Input
      value={localValue}
      onChange={handleChange}
      prefix={<Icon name="search" />}
      placeholder={placeholder}
      aria-label={placeholder ?? "Search"}
      className={cn(className)}
    />
  );
}

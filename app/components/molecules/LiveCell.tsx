"use client";

import { useEffect, useState } from "react";
import { Text, cn } from "../atoms";

export type LiveCellTone = "volume" | "liquidity";

export type LiveCellProps = {
  value: number;
  tone: LiveCellTone;
  formatter?: (value: number) => string;
  className?: string;
};

const FLASH_MS = 700;

const toneFlashClassMap: Record<LiveCellTone, string> = {
  volume: "bg-gain-soft",
  liquidity: "bg-yes-soft",
};

function defaultFormatter(value: number): string {
  return `$${Math.round(value).toLocaleString("en-US")}`;
}

function prefersReducedMotion(): boolean {
  return (
    window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false
  );
}

export function LiveCell({
  value,
  tone,
  formatter = defaultFormatter,
  className,
}: LiveCellProps) {
  const [trackedValue, setTrackedValue] = useState(value);
  const [flashing, setFlashing] = useState(false);
  // Bumped every time a new flash should (re)start, so the timer effect
  // below resets even when `flashing` was already true.
  const [flashToken, setFlashToken] = useState(0);

  // Detecting "value changed since last render" during render — rather
  // than in an effect — avoids an extra render pass and satisfies
  // react-hooks' set-state-in-effect rule. No flash on mount: trackedValue
  // starts equal to value, so this branch only fires on later updates.
  if (value !== trackedValue) {
    setTrackedValue(value);
    if (!prefersReducedMotion()) {
      setFlashing(true);
      setFlashToken((token) => token + 1);
    }
  }

  useEffect(() => {
    if (!flashing) {
      return;
    }
    const timer = setTimeout(() => setFlashing(false), FLASH_MS);
    return () => clearTimeout(timer);
  }, [flashing, flashToken]);

  return (
    <span
      className={cn(
        "inline-flex rounded-[4px] px-1 transition-colors",
        flashing && toneFlashClassMap[tone],
        className
      )}
    >
      <Text as="span" variant="num">
        {formatter(value)}
      </Text>
    </span>
  );
}

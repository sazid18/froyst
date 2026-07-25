import type { ComponentPropsWithRef } from "react";
import type { ConnectionStatus } from "../../types/state";
import { cn } from "./cn";
import { Text } from "./Text";

const liveDotStateConfig: Record<ConnectionStatus, { dot: string; label: string }> = {
  open: {
    dot: "bg-gain animate-pulse motion-reduce:animate-none",
    label: "live",
  },
  connecting: { dot: "bg-gold", label: "connecting…" },
  reconnecting: { dot: "bg-gold", label: "reconnecting…" },
  closed: { dot: "bg-control", label: "offline" },
};

export type LiveDotProps = {
  state: ConnectionStatus;
} & Omit<ComponentPropsWithRef<"span">, "children">;

export function LiveDot({ state, className, ...rest }: LiveDotProps) {
  const config = liveDotStateConfig[state];

  return (
    <span className={cn("inline-flex items-center gap-1.5", className)} {...rest}>
      <span aria-hidden="true" className={cn("h-2 w-2 rounded-full", config.dot)} />
      <Text as="span" variant="numSmall">
        {config.label}
      </Text>
    </span>
  );
}

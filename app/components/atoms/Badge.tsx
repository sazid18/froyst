import type { ComponentPropsWithRef } from "react";
import { cn } from "./cn";
import { Text } from "./Text";

export type BadgeProps = {
  count: number;
} & Omit<ComponentPropsWithRef<"span">, "children">;

export function Badge({ count, className, ...rest }: BadgeProps) {
  if (count === 0) {
    return null;
  }

  return (
    <span
      className={cn(
        "inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-yes px-1.5",
        className
      )}
      {...rest}
    >
      <Text as="span" variant="numSmall" className="text-white">
        {count}
      </Text>
    </span>
  );
}

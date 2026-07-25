import type { ComponentPropsWithRef, ReactNode } from "react";
import { cn } from "./cn";
import { Text } from "./Text";

export type TagTone =
  | "yes"
  | "no"
  | "pending"
  | "confirmed"
  | "failed"
  | "won"
  | "lost"
  | "resolved";

const tagToneClassMap: Record<TagTone, { bg: string; text: string }> = {
  yes: { bg: "bg-yes-soft", text: "text-yes" },
  no: { bg: "bg-no-soft", text: "text-no" },
  pending: { bg: "bg-muted", text: "text-ink-soft" },
  confirmed: { bg: "bg-gain-soft", text: "text-gain" },
  failed: { bg: "bg-no-soft", text: "text-no" },
  won: { bg: "bg-gain-soft", text: "text-gain" },
  lost: { bg: "bg-no-soft", text: "text-no" },
  resolved: { bg: "bg-muted", text: "text-ink-soft" },
};

export type TagProps = {
  tone: TagTone;
  children?: ReactNode;
} & Omit<ComponentPropsWithRef<"span">, "children">;

export function Tag({ tone, children, className, ...rest }: TagProps) {
  const colors = tagToneClassMap[tone];

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-[6px] px-1.5 py-0.5",
        colors.bg,
        className
      )}
      {...rest}
    >
      <Text as="span" variant="numSmall" className={cn("uppercase", colors.text)}>
        {children ?? tone}
      </Text>
    </span>
  );
}

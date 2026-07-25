import type { ComponentPropsWithRef } from "react";
import { cn } from "./cn";
import { Text } from "./Text";

export type ChipCategory =
  | "Crypto"
  | "Business"
  | "Sports"
  | "Politics"
  | "Pop Culture"
  | "Science";

/**
 * Complete literal class strings per category (no interpolation) so
 * Tailwind's scanner can find every candidate class.
 */
const chipCategoryClassMap: Record<ChipCategory, { bg: string; text: string }> = {
  Crypto: { bg: "bg-chip-crypto-bg", text: "text-chip-crypto-text" },
  Business: { bg: "bg-chip-business-bg", text: "text-chip-business-text" },
  Sports: { bg: "bg-chip-sports-bg", text: "text-chip-sports-text" },
  Politics: { bg: "bg-chip-politics-bg", text: "text-chip-politics-text" },
  "Pop Culture": { bg: "bg-chip-pop-bg", text: "text-chip-pop-text" },
  Science: { bg: "bg-chip-science-bg", text: "text-chip-science-text" },
};

export type ChipProps = {
  category: ChipCategory;
} & Omit<ComponentPropsWithRef<"span">, "children">;

export function Chip({ category, className, ...rest }: ChipProps) {
  const colors = chipCategoryClassMap[category];

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-1",
        colors.bg,
        className
      )}
      {...rest}
    >
      <Text as="span" variant="eyebrow" className={cn("text-[10px]", colors.text)}>
        {category}
      </Text>
    </span>
  );
}

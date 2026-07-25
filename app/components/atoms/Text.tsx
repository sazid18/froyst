/**
 * Polymorphic typography primitive. One component, nine variants — no
 * separate Heading/Paragraph components.
 *
 * Usage:
 *
 *   // Table column header
 *   <Text as="th" variant="colhead" scope="col">NAME</Text>
 *
 *   // Live price cell — mono + tabular-nums keeps digits from shifting
 *   // layout on every tick
 *   <Text as="span" variant="num" className="text-gain">$0.62</Text>
 *
 *   // Section eyebrow
 *   <Text variant="eyebrow">Place a Bid</Text>
 */

import { createElement } from "react";
import type { ComponentPropsWithRef, ElementType, ReactElement } from "react";
import { cn } from "./cn";

export type TextVariant =
  | "display"
  | "heading"
  | "body"
  | "caption"
  | "label"
  | "eyebrow"
  | "colhead"
  | "num"
  | "numSmall";

/**
 * Variant → class map. Every string is a complete literal (no
 * interpolation) so Tailwind's scanner can find every candidate class.
 * Exported for reuse in tests.
 */
export const textVariantClassMap: Record<TextVariant, string> = {
  display: "font-sans text-[20px] font-bold text-ink",
  heading: "font-sans text-base font-semibold text-ink",
  body: "font-sans text-[13.5px] font-semibold text-ink",
  caption: "font-sans text-[13px] font-normal text-ink-soft",
  label: "font-sans text-xs font-semibold text-ink-soft",
  eyebrow:
    "font-sans text-[11px] font-bold uppercase tracking-[0.08em] text-ink-soft",
  colhead: "font-sans text-[11px] font-bold tracking-[0.08em] text-ink-soft",
  num: "font-mono text-[13.5px] font-medium tabular-nums text-ink",
  numSmall: "font-mono text-[11px] font-normal tabular-nums text-ink",
};

const textVariantDefaultElement: Record<TextVariant, ElementType> = {
  display: "h1",
  heading: "h2",
  body: "span",
  caption: "span",
  label: "span",
  eyebrow: "span",
  colhead: "span",
  num: "span",
  numSmall: "span",
};

type TextOwnProps = {
  variant?: TextVariant;
  className?: string;
};

type AsProp<C extends ElementType> = {
  as?: C;
};

type PropsToOmit<C extends ElementType, Props> = keyof (AsProp<C> & Props);

// `ComponentPropsWithRef` (not `WithoutRef`) so `ref` flows through `...rest`
// below — React 19 accepts `ref` as a plain prop on function components, so
// no `forwardRef` wrapper is needed.
type PolymorphicComponentProp<
  C extends ElementType,
  Props = TextOwnProps,
> = Props & AsProp<C> & Omit<ComponentPropsWithRef<C>, PropsToOmit<C, Props>>;

export type TextProps<C extends ElementType = "span"> =
  PolymorphicComponentProp<C>;

interface TextComponent {
  <C extends ElementType = "span">(props: TextProps<C>): ReactElement | null;
  displayName?: string;
}

export const Text: TextComponent = function Text<
  C extends ElementType = "span",
>({ as, variant = "body", className, children, ...rest }: TextProps<C>) {
  const Component: ElementType = as ?? textVariantDefaultElement[variant];

  return createElement(
    Component,
    { className: cn(textVariantClassMap[variant], className), ...rest },
    children
  );
};

Text.displayName = "Text";

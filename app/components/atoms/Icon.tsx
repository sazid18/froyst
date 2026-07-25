import type { ComponentPropsWithoutRef } from "react";
import { cn } from "./cn";

export type IconName = "star" | "bolt" | "chevron" | "close" | "search";

export type IconProps = {
  name: IconName;
  size?: number;
  filled?: boolean;
} & Omit<ComponentPropsWithoutRef<"svg">, "name" | "width" | "height">;

const iconPaths: Record<IconName, React.ReactNode> = {
  star: (
    <path d="M12 3.5l2.6 5.6 6.1.7-4.5 4.2 1.2 6-5.4-3-5.4 3 1.2-6-4.5-4.2 6.1-.7z" />
  ),
  bolt: <path d="M13 2 4 14h7l-1 8 9-12h-7z" />,
  chevron: (
    <polyline points="6 9 12 15 18 9" fill="none" strokeLinecap="round" strokeLinejoin="round" />
  ),
  close: (
    <>
      <line x1="18" y1="6" x2="6" y2="18" strokeLinecap="round" />
      <line x1="6" y1="6" x2="18" y2="18" strokeLinecap="round" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" fill="none" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" strokeLinecap="round" />
    </>
  ),
};

export function Icon({
  name,
  size = 15,
  filled = false,
  className,
  ...rest
}: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill={filled ? "currentColor" : "none"}
      stroke={filled ? "none" : "currentColor"}
      strokeWidth={1.5}
      aria-hidden="true"
      className={cn("shrink-0", className)}
      {...rest}
    >
      {iconPaths[name]}
    </svg>
  );
}

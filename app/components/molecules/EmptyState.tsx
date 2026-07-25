import type { ReactNode } from "react";
import { Text, cn } from "../atoms";

export type EmptyStateProps = {
  title: string;
  description: string;
  children?: ReactNode;
  className?: string;
};

export function EmptyState({
  title,
  description,
  children,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-2 px-6 py-16 text-center",
        className
      )}
    >
      <Text as="h2" variant="display">
        {title}
      </Text>
      <Text as="p" variant="caption">
        {description}
      </Text>
      {children}
    </div>
  );
}

import type { ComponentPropsWithRef } from "react";
import { cn } from "./cn";

export type SkeletonShape = "row" | "cell";

const skeletonShapeClassMap: Record<SkeletonShape, string> = {
  row: "h-[72px] w-full",
  cell: "h-4 w-20",
};

export type SkeletonProps = {
  shape: SkeletonShape;
} & Omit<ComponentPropsWithRef<"div">, "children">;

export function Skeleton({ shape, className, ...rest }: SkeletonProps) {
  return (
    <div
      role="presentation"
      aria-hidden="true"
      className={cn(
        "animate-pulse rounded-[6px] bg-line motion-reduce:animate-none",
        skeletonShapeClassMap[shape],
        className
      )}
      {...rest}
    />
  );
}

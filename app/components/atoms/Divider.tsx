import type { ComponentPropsWithRef } from "react";
import { cn } from "./cn";

export type DividerProps = ComponentPropsWithRef<"hr">;

export function Divider({ className, ...rest }: DividerProps) {
  return <hr className={cn("m-0 border-0 border-t border-line", className)} {...rest} />;
}

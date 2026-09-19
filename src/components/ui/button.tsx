import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type ButtonVariant = "primary" | "secondary" | "ghost";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

export function buttonClassName(variant: ButtonVariant = "primary") {
  return cn(
    "inline-flex h-11 items-center justify-center rounded-full px-5 text-sm font-semibold transition",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
    variant === "primary" &&
      "bg-brand text-white hover:bg-brand-dark active:bg-brand-dark",
    variant === "secondary" &&
      "border border-border bg-surface text-foreground hover:bg-white",
    variant === "ghost" && "text-foreground hover:bg-white/70",
  );
}

export function Button({
  className,
  variant = "primary",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(buttonClassName(variant), className)}
      {...props}
    />
  );
}

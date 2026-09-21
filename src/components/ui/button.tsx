import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type ButtonVariant = "primary" | "secondary" | "ghost";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

export function buttonClassName(variant: ButtonVariant = "primary") {
  return cn(
    "shopnest-focus inline-flex h-11 items-center justify-center rounded-full px-5 text-sm font-semibold shadow-sm transition hover:-translate-y-0.5",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
    variant === "primary" &&
      "bg-brand text-black hover:bg-brand-dark active:bg-brand-dark hover:shadow-md",
    variant === "secondary" &&
      "border border-border bg-surface text-foreground hover:border-brand/40 hover:bg-white hover:text-[#17231e]",
    variant === "ghost" && "text-foreground hover:bg-white/10 hover:text-brand",
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

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
      "border border-brand/80 bg-[#111513] text-white shadow-[0_0_0_1px_rgba(243,154,61,0.08)] hover:border-brand hover:bg-brand hover:text-black hover:shadow-[0_8px_24px_rgba(243,154,61,0.2)]",
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

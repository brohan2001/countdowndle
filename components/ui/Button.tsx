import type { ButtonHTMLAttributes } from "react";

export type ButtonVariant = "primary" | "secondary";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "border-forest bg-forest text-cream hover:brightness-110",
  secondary:
    "border-tile-edge bg-paper text-ink hover:bg-tab",
};

export function Button({
  variant = "primary",
  className = "",
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`rounded-desk border-[1.5px] px-5 py-2 font-sans text-sm font-bold tracking-wide shadow-paper transition active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:brightness-100 ${VARIANTS[variant]} ${className}`}
      {...rest}
    />
  );
}

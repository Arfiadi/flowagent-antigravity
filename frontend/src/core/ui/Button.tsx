/**
 * Button — Primary interactive element
 *
 * Supports glow effects and semantic color variants.
 */

import type { ReactNode, ButtonHTMLAttributes } from "react";
import "./Button.css";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  /** Visual variant */
  variant?: "primary" | "ghost" | "positive" | "critical";
  /** Size of the button */
  size?: "sm" | "md" | "lg";
  /** Loading state */
  isLoading?: boolean;
}

export function Button({
  children,
  variant = "primary",
  size = "md",
  isLoading = false,
  className = "",
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={`fa-button fa-button--${variant} fa-button--${size} ${className}`.trim()}
      disabled={disabled || isLoading}
      {...rest}
    >
      {isLoading ? <span className="fa-button__spinner spin" /> : children}
    </button>
  );
}

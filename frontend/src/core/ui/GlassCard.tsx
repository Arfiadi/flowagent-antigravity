/**
 * GlassCard — Reusable translucent panel component
 *
 * Base component for all card-style UIs across domains.
 * Uses the glassmorphism design system from ui_ux_design.md §2.
 */

import type { ReactNode, CSSProperties } from "react";
import "./GlassCard.css";

interface GlassCardProps {
  /** Content rendered inside the glass panel */
  children: ReactNode;
  /** Visual variant of the card */
  variant?: "default" | "elevated" | "accent";
  /** Optional additional CSS class names */
  className?: string;
  /** Optional inline styles for layout overrides */
  style?: CSSProperties;
  /** Optional click handler */
  onClick?: () => void;
}

export function GlassCard({
  children,
  variant = "default",
  className = "",
  style,
  onClick,
}: GlassCardProps) {
  const variantClass =
    variant === "elevated"
      ? "glass-panel--elevated"
      : variant === "accent"
        ? "glass-panel--accent"
        : "";

  return (
    <div
      className={`glass-card glass-panel ${variantClass} ${className}`.trim()}
      style={style}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {children}
    </div>
  );
}

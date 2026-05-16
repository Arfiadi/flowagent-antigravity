/**
 * ShimmerLoader — AI "Thinking" indicator
 *
 * Source of truth: ui_ux_design.md §4
 * Displays a shimmering gradient overlay when Gemini is processing.
 */

import "./ShimmerLoader.css";

interface ShimmerLoaderProps {
  /** Text displayed below the shimmer */
  message?: string;
}

export function ShimmerLoader({
  message = "AI sedang menganalisis...",
}: ShimmerLoaderProps) {
  return (
    <div className="shimmer-loader">
      <div className="shimmer-loader__bar shimmer" />
      <p className="shimmer-loader__text">{message}</p>
    </div>
  );
}

import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { HealthScoreRing } from "./HealthScoreRing";

describe("HealthScoreRing", () => {
  const GAUGE_CIRCUMFERENCE = Math.PI * 80;

  it("renders with a normal score and calculates correct stroke offset", () => {
    // For a score of 5.0, percentage is 100%, offset should be 0
    const { container } = render(<HealthScoreRing score={5.0} />);
    const progressPath = container.querySelector(".health-gauge__progress");
    expect(progressPath).not.toBeNull();
    const offset = Number(progressPath?.getAttribute("stroke-dashoffset"));
    expect(offset).toBeCloseTo(0, 4);

    // Check GAUGE_CIRCUMFERENCE is passed to strokeDasharray
    const dashArray = progressPath?.getAttribute("stroke-dasharray");
    expect(Number(dashArray)).toBeCloseTo(GAUGE_CIRCUMFERENCE, 4);
  });

  it("normalizes scores below 0.0 and above 5.0", () => {
    // Score > 5.0 should be capped at 5.0 -> offset = 0
    const { container: containerHigh } = render(<HealthScoreRing score={6.0} />);
    const progressHigh = containerHigh.querySelector(".health-gauge__progress");
    expect(Number(progressHigh?.getAttribute("stroke-dashoffset"))).toBeCloseTo(0, 4);

    // Score < 0.0 should be floored at 0.0 -> offset = GAUGE_CIRCUMFERENCE
    const { container: containerLow } = render(<HealthScoreRing score={-1.0} />);
    const progressLow = containerLow.querySelector(".health-gauge__progress");
    expect(Number(progressLow?.getAttribute("stroke-dashoffset"))).toBeCloseTo(GAUGE_CIRCUMFERENCE, 4);
  });

  it("calculates stroke offset correctly for intermediate scores", () => {
    // For score 2.5, percentage is 50%, offset is half circumference
    const { container } = render(<HealthScoreRing score={2.5} />);
    const progress = container.querySelector(".health-gauge__progress");
    expect(Number(progress?.getAttribute("stroke-dashoffset"))).toBeCloseTo(GAUGE_CIRCUMFERENCE / 2, 4);
  });

  it("applies correct color styling class based on risk levels (Green, Amber, Red)", () => {
    // Score >= 3.5 is Green
    const { container: greenContainer } = render(<HealthScoreRing score={4.0} />);
    expect(greenContainer.firstElementChild?.classList.contains("health-gauge--green")).toBe(true);

    // Score >= 1.5 and < 3.5 is Amber
    const { container: amberContainer } = render(<HealthScoreRing score={2.0} />);
    expect(amberContainer.firstElementChild?.classList.contains("health-gauge--amber")).toBe(true);

    // Score < 1.5 is Red
    const { container: redContainer } = render(<HealthScoreRing score={1.0} />);
    expect(redContainer.firstElementChild?.classList.contains("health-gauge--red")).toBe(true);
  });
});

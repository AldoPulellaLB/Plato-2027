// Quantity stepper: minus, a number that rolls in the direction of change, plus.
import { Minus, Plus } from "lucide-react";
import { useState } from "react";

import "./quantity-stepper.css";

interface QuantityStepperProps {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  /** Used in the button labels: "Decrease quantity of House Blend". */
  itemLabel?: string;
  size?: "md" | "sm";
  disabled?: boolean;
  id?: string;
}

export function QuantityStepper({ value, onChange, min = 1, max = 99, itemLabel, size = "md", disabled, id }: QuantityStepperProps) {
  // Track the direction of change during render (React's "adjust state on prop change" pattern).
  const [previous, setPrevious] = useState(value);
  const [direction, setDirection] = useState<"up" | "down" | undefined>(undefined);
  if (value !== previous) {
    setDirection(value > previous ? "up" : "down");
    setPrevious(value);
  }
  const suffix = itemLabel ? ` of ${itemLabel}` : "";

  return (
    <div aria-label={`Quantity${suffix}`} className="qty" data-size={size} id={id} role="group">
      <button
        aria-label={`Decrease quantity${suffix}`}
        className="qty-btn"
        disabled={disabled || value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
        type="button"
      >
        <Minus aria-hidden="true" size={size === "sm" ? 14 : 16} strokeWidth={1.5} />
      </button>
      <output aria-live="polite" className="qty-value t-num">
        <span className="qty-num" data-dir={direction} key={value}>
          {value}
        </span>
      </output>
      <button
        aria-label={`Increase quantity${suffix}`}
        className="qty-btn"
        disabled={disabled || value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
        type="button"
      >
        <Plus aria-hidden="true" size={size === "sm" ? 14 : 16} strokeWidth={1.5} />
      </button>
    </div>
  );
}

import { clamp } from "../lib/constants.js";

export default function Stepper({ label, value, min, max, onChange, accent }) {
  return (
    <div className="stepper">
      <span className="stepper-label">{label}</span>
      <button className="step-btn" onClick={() => onChange(clamp(value - 1, min, max))}
        disabled={value <= min} aria-label={`Decrease ${label}`}>−</button>
      <span className="step-val" style={accent ? { color: accent } : {}}>{value}</span>
      <button className="step-btn" onClick={() => onChange(clamp(value + 1, min, max))}
        disabled={value >= max} aria-label={`Increase ${label}`}>+</button>
    </div>
  );
}

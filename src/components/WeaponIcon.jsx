import { WEAPON_PATHS } from "../data/elements.js";

export default function WeaponIcon({ type, size = 15, color = "currentColor" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={WEAPON_PATHS[type]} />
    </svg>
  );
}

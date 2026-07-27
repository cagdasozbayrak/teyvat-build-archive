export default function Ring({ done, total = 8, size = 40, element }) {
  const r = 15;
  const c = 2 * Math.PI * r;
  const pct = total ? done / total : 0;
  const full = done === total && total > 0;
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" className="ring">
      <circle cx="20" cy="20" r={r} stroke="rgba(255,255,255,0.12)" strokeWidth="3" fill="none" />
      <circle cx="20" cy="20" r={r} stroke={full ? "#e6c368" : element} strokeWidth="3" fill="none"
        strokeDasharray={c} strokeDashoffset={c * (1 - pct)} strokeLinecap="round"
        transform="rotate(-90 20 20)" style={{ transition: "stroke-dashoffset .4s ease" }} />
      <text x="20" y="20" textAnchor="middle" dominantBaseline="central"
        fontSize="11" fontWeight="700" fill={full ? "#e6c368" : "#d6dae4"}>
        {done}<tspan fontSize="7" fill="#7c869a">/{total}</tspan>
      </text>
    </svg>
  );
}

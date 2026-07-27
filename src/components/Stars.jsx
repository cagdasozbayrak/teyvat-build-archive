export default function Stars({ n }) {
  return (
    <span className="stars" aria-label={`${n} star${n === 1 ? "" : "s"}`}>
      {"★".repeat(n)}
    </span>
  );
}

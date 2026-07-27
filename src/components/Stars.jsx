export default function Stars({ n }) {
  return (
    <span className="stars" aria-label={`${n} star`}>
      {"★".repeat(n)}
    </span>
  );
}

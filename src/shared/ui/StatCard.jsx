function StatCard({ label, value, tone, onClick }) {
  const className = `stat-card ${tone}${onClick ? " clickable" : ""}`;

  if (onClick) {
    return (
      <button className={className} onClick={onClick}>
        <span>{label}</span>
        <strong>{value}</strong>
      </button>
    );
  }

  return (
    <div className={className}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export default StatCard;

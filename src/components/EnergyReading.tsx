interface EnergyReadingProps {
  noteCount: number;
  linkCount: number;
}

export function EnergyReading({ noteCount, linkCount }: EnergyReadingProps) {
  const density = noteCount > 0 ? Math.min(1, linkCount / (noteCount * 2)) : 0;
  const label =
    density > 0.7 ? 'CRITICAL' : density > 0.4 ? 'ELEVATED' : density > 0.1 ? 'STABLE' : 'LOW';
  const barPct = Math.round(density * 100);

  return (
    <div className="energy-card">
      <div className="energy-label">ENERGY READING</div>
      <div className="energy-bar-wrap">
        <div className="energy-bar" style={{ width: `${barPct}%` }} />
      </div>
      <div className="energy-status">{label} — {barPct}%</div>
    </div>
  );
}

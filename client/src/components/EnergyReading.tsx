import Frame from "./Frame";
import { RED } from "../theme";

type EnergyReadingProps = {
  percent: number;
  status: string;
};

export default function EnergyReading({ percent, status }: EnergyReadingProps) {
  const filledBars = Math.round((percent / 100) * 14);

  return (
    <Frame accent={RED}>
      <div className="energy-inner">
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M13 2 L5 14 H11 L9 22 L19 9 H13 Z" fill={RED} />
        </svg>
        <div className="energy-bars-wrap">
          <div className="energy-title">ENERGY READING</div>
          <div className="energy-bars">
            {Array.from({ length: 14 }).map((_, i) => (
              <span key={i} className={`energy-bar${i < filledBars ? " on" : ""}`} />
            ))}
          </div>
        </div>
        <div className="energy-stats">
          <div className="energy-percent">{percent}%</div>
          <div className="energy-status">{status}</div>
        </div>
      </div>
    </Frame>
  );
}

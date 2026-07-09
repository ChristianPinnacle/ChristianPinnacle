import Frame from "./Frame";
import { notch, RED } from "../theme";

type PowerLevelScanProps = {
  value: number;
  label: string;
};

export default function PowerLevelScan({ value, label }: PowerLevelScanProps) {
  return (
    <Frame accent={RED} glow className="scan-frame">
      <div className="scan-inner">
        <div className="scan-header">
          <span>POWER LEVEL SCAN</span>
          <span className="scan-dot" />
        </div>
        <div className="scan-row">
          <svg width="30" height="30" viewBox="0 0 30 30" aria-hidden="true">
            <circle cx="15" cy="15" r="12" fill="none" stroke={RED} strokeWidth="1.4" strokeDasharray="6 5" />
            <line x1="15" y1="1" x2="15" y2="8" stroke={RED} strokeWidth="1.4" />
            <line x1="15" y1="22" x2="15" y2="29" stroke={RED} strokeWidth="1.4" />
            <line x1="1" y1="15" x2="8" y2="15" stroke={RED} strokeWidth="1.4" />
            <line x1="22" y1="15" x2="29" y2="15" stroke={RED} strokeWidth="1.4" />
          </svg>
          <span className="scan-value">{value.toLocaleString()}</span>
          <span className="scan-badge" style={{ clipPath: notch(4) }}>
            PL
          </span>
        </div>
        <div className="scan-bars">
          {Array.from({ length: 24 }).map((_, i) => (
            <span
              key={i}
              className="scan-bar"
              style={{
                height: `${28 + ((i * 31) % 70)}%`,
                animationDelay: `${(i % 6) * 0.14}s`,
              }}
            />
          ))}
        </div>
        <div className="scan-label">{label}</div>
      </div>
    </Frame>
  );
}

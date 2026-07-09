import Frame from "./Frame";
import { MUTE, RED } from "../theme";

export type RadarTarget = {
  id: string;
  title: string;
  x: number;
  y: number;
  plScore: number;
};

type RadarPaneProps = {
  targets: RadarTarget[];
  threatLevel: number;
};

export default function RadarPane({ targets, threatLevel }: RadarPaneProps) {
  const targetLabel = targets.length === 1 ? "SINGLE" : "MULTIPLE";
  const avgDistance = targets.length
    ? (targets.reduce((sum, target) => sum + Math.hypot(target.x - 50, target.y - 50), 0) /
        targets.length /
        4).toFixed(1)
    : "0.0";

  return (
    <Frame accent={RED}>
      <div className="radar-inner">
        <div className="radar-meta">
          <span>
            TARGET
            <br />
            <span className="radar-accent">{targetLabel}</span>
          </span>
          <span className="radar-meta-right">
            DISTANCE
            <br />
            <span className="radar-accent">{avgDistance}KM</span>
          </span>
        </div>

        <div className="radar-display">
          <svg viewBox="0 0 100 100" className="radar-svg" aria-hidden="true">
            <circle cx="50" cy="50" r="47" fill="none" stroke={`${RED}77`} strokeWidth="1" />
            <circle cx="50" cy="50" r="33" fill="none" stroke={`${RED}44`} strokeWidth="0.7" />
            <circle cx="50" cy="50" r="18" fill="none" stroke={`${RED}44`} strokeWidth="0.7" />
            <line x1="3" y1="50" x2="97" y2="50" stroke={`${RED}33`} strokeWidth="0.6" />
            <line x1="50" y1="3" x2="50" y2="97" stroke={`${RED}33`} strokeWidth="0.6" />
            <path d="M46 46 L54 46 L50 55 Z" fill={RED} />
            {targets.map((target, i) => (
              <circle
                key={target.id}
                cx={target.x}
                cy={target.y}
                r="1.8"
                fill="#FF6B72"
                className="radar-blip"
                style={{ animationDelay: `${i * 0.3}s` }}
              />
            ))}
            {[
              [6, 6, 1, 1],
              [94, 6, -1, 1],
              [94, 94, -1, -1],
              [6, 94, 1, -1],
            ].map(([x, y, sx, sy], i) => (
              <path
                key={i}
                d={`M${x} ${y + sy * 10} L${x} ${y} L${x + sx * 10} ${y}`}
                fill="none"
                stroke={RED}
                strokeWidth="1.2"
              />
            ))}
          </svg>
          <div className="radar-sweep" />
        </div>

        <div className="radar-meta">
          <span>
            SIGNATURE
            <br />
            <span className="radar-accent">KI: HIGH</span>
          </span>
          <span className="radar-meta-right">
            THREAT LVL
            <br />
            <span className="radar-accent">
              {threatLevel} · {threatLevel >= 7 ? "ELEVATED" : "MODERATE"}
            </span>
          </span>
        </div>
      </div>
    </Frame>
  );
}

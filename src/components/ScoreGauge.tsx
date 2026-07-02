import { cn, scoreColor, scoreLabel } from "@/lib/utils";

interface ScoreGaugeProps {
  score: number;
  size?: "sm" | "lg";
  label?: string;
}

export function ScoreGauge({ score, size = "lg", label }: ScoreGaugeProps) {
  const radius = size === "lg" ? 54 : 36;
  const stroke = size === "lg" ? 8 : 6;
  const normalizedRadius = radius - stroke / 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const offset = circumference - (score / 100) * circumference;
  const dimension = radius * 2;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: dimension, height: dimension }}>
        <svg width={dimension} height={dimension} className="-rotate-90">
          <circle
            cx={radius}
            cy={radius}
            r={normalizedRadius}
            fill="none"
            stroke="currentColor"
            strokeWidth={stroke}
            className="text-white/10"
          />
          <circle
            cx={radius}
            cy={radius}
            r={normalizedRadius}
            fill="none"
            stroke="currentColor"
            strokeWidth={stroke}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className={cn("transition-all duration-1000", scoreColor(score))}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn("font-bold tabular-nums", size === "lg" ? "text-3xl" : "text-xl", scoreColor(score))}>
            {score}
          </span>
          {size === "lg" && (
            <span className="text-xs text-slate-500 uppercase tracking-wider">{scoreLabel(score)}</span>
          )}
        </div>
      </div>
      {label && <span className="text-sm text-slate-400 font-medium">{label}</span>}
    </div>
  );
}

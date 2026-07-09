import type { CSSProperties, ReactNode } from "react";
import { CARD, notch } from "../theme";

type FrameProps = {
  children: ReactNode;
  accent?: string;
  glow?: boolean;
  pad?: number;
  className?: string;
  style?: CSSProperties;
};

export default function Frame({
  children,
  accent = "#F5C542",
  glow = false,
  pad = 14,
  className = "",
  style = {},
}: FrameProps) {
  return (
    <div
      className={`frame ${className}`.trim()}
      style={{
        position: "relative",
        background: CARD,
        clipPath: notch(12),
        boxShadow: glow ? `0 0 24px ${accent}33` : "none",
        ...style,
      }}
    >
      <div
        className="frame-border"
        style={{
          position: "absolute",
          inset: 0,
          clipPath: notch(12),
          padding: 1.4,
          background: `linear-gradient(160deg, ${accent}, #8A6A1D 45%, ${accent}66)`,
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            background: CARD,
            clipPath: notch(11),
          }}
        />
      </div>
      <div style={{ position: "relative", padding: pad }}>{children}</div>
    </div>
  );
}

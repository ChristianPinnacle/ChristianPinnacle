import { useEffect, useState } from "react";
import BattleLog from "./BattleLog";
import EnergyReading from "./EnergyReading";
import PortraitSlot from "./PortraitSlot";
import PowerLevelScan from "./PowerLevelScan";
import RadarPane from "./RadarPane";
import { trpc } from "../lib/trpc";

type HudScreenProps = {
  selectedTitle: string | null;
  selectedPl: number | null;
};

export default function HudScreen({ selectedTitle, selectedPl }: HudScreenProps) {
  const hud = trpc.hud.get.useQuery();
  const health = trpc.health.useQuery();
  const [plDisplay, setPlDisplay] = useState(0);

  const scanLabel = selectedTitle ? selectedTitle.toUpperCase() : "MAX OUTPUT";

  useEffect(() => {
    if (selectedPl === null) {
      setPlDisplay(hud.data?.totalPl ?? 0);
      return;
    }

    const target = selectedPl;
    setPlDisplay(0);
    const start = performance.now();
    let frame = 0;

    const tick = (time: number): void => {
      const progress = Math.min(1, (time - start) / 900);
      setPlDisplay(Math.floor(target * (1 - Math.pow(1 - progress, 3))));
      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      }
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [selectedPl, hud.data?.totalPl]);

  const displayPl = selectedPl !== null ? plDisplay : (hud.data?.totalPl ?? 0);

  if (hud.isLoading) {
    return <p className="status">Loading HUD...</p>;
  }

  if (hud.error || !hud.data) {
    return <p className="status error">HUD failed: {hud.error?.message ?? "unknown"}</p>;
  }

  return (
    <>
      <PortraitSlot portraitUrl={hud.data.portraitUrl} />
      <PowerLevelScan value={displayPl} label={scanLabel} />
      <EnergyReading percent={hud.data.energyPercent} status={hud.data.energyStatus} />
      <RadarPane targets={hud.data.radarTargets} threatLevel={hud.data.threatLevel} />
      <BattleLog
        entries={hud.data.battleLog}
        noteCount={hud.data.noteCount}
        agentCount={hud.data.agentCount}
        dbConfigured={health.data?.dbConfigured ?? false}
      />
    </>
  );
}

import { access } from 'node:fs/promises';
import path from 'node:path';
import { buildGraphPayload } from '../graph/buildGraph';
import type { GraphNode } from '../graph/buildGraph';
import { getBattleLog } from './battleLog';
import { buildIndexFromVault } from '../vault/indexer';
import { VALID_FOLDERS } from '../vault/types';

const FOLDER_COLORS: Record<string, string> = {
  projects: '#4D6BFF',
  areas: '#F5C542',
  resources: '#EDF1FA',
  warroom: '#9AAFFF',
  archive: '#5A6890',
  unsorted: '#FF4D4D',
};

const FOLDER_LABELS: Record<string, string> = {
  projects: 'ELITE',
  areas: 'ROYAL',
  resources: 'CAPSULE',
  warroom: 'WAR ROOM',
  archive: 'GRAVEYARD',
  unsorted: 'SCOUTER ERROR',
};

const FOLDER_SUBS: Record<string, string> = {
  projects: 'Current Projects',
  areas: 'Areas',
  resources: 'Resources',
  warroom: 'Decisions',
  archive: 'Archive',
  unsorted: 'Unsorted',
};

export type RadarTarget = {
  id: string;
  title: string;
  x: number;
  y: number;
  plScore: number;
};

export type HudFolder = {
  id: string;
  label: string;
  sub: string;
  color: string;
  count: number;
};

export type HudPayload = {
  totalPl: number;
  energyPercent: number;
  energyStatus: 'STABLE' | 'MODERATE' | 'LOW';
  threatLevel: number;
  radarTargets: RadarTarget[];
  folders: HudFolder[];
  battleLog: Awaited<ReturnType<typeof getBattleLog>>;
  portraitUrl: string | null;
  noteCount: number;
  agentCount: number;
};

function hashUnit(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) % 1000;
  }
  return hash / 1000;
}

export function buildRadarTargets(hubNodes: GraphNode[]): RadarTarget[] {
  return hubNodes
    .filter((node) => node.hub)
    .sort((a, b) => b.plScore - a.plScore)
    .slice(0, 8)
    .map((node, index) => {
      const seed = hashUnit(node.path);
      const angle = (seed + index * 0.61) * Math.PI * 2;
      const distance = 12 + (seed * 27) % 24;
      return {
        id: node.id,
        title: node.title,
        x: 50 + Math.cos(angle) * distance,
        y: 50 + Math.sin(angle) * distance,
        plScore: node.plScore,
      };
    });
}

function computeEnergy(indexNoteCount: number, hubCount: number, recentCount: number): {
  energyPercent: number;
  energyStatus: HudPayload['energyStatus'];
  threatLevel: number;
} {
  const recencyScore = indexNoteCount > 0 ? (recentCount / indexNoteCount) * 55 : 0;
  const hubScore = Math.min(30, hubCount * 5);
  const volumeScore = Math.min(15, indexNoteCount * 2);
  const energyPercent = Math.min(99, Math.round(20 + recencyScore + hubScore + volumeScore));
  const energyStatus =
    energyPercent >= 65 ? 'STABLE' : energyPercent >= 40 ? 'MODERATE' : 'LOW';
  const threatLevel = Math.min(10, Math.max(1, Math.round(hubCount * 1.2 + recentCount * 0.3)));

  return { energyPercent, energyStatus, threatLevel };
}

export async function buildHudPayload(vaultDir: string): Promise<HudPayload> {
  const index = await buildIndexFromVault(vaultDir);
  const graph = buildGraphPayload(index);
  const battleLog = await getBattleLog(vaultDir);

  const folderCounts = new Map<string, number>();
  for (const note of index.notes) {
    folderCounts.set(note.folder, (folderCounts.get(note.folder) ?? 0) + 1);
  }

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const recentCount = index.notes.filter((note) => {
    const updated = new Date(`${note.updated}T12:00:00Z`);
    return updated >= thirtyDaysAgo;
  }).length;

  const hubCount = graph.nodes.filter((node) => node.hub).length;
  const { energyPercent, energyStatus, threatLevel } = computeEnergy(
    index.notes.length,
    hubCount,
    recentCount,
  );

  const folders: HudFolder[] = VALID_FOLDERS.map((id) => ({
    id,
    label: FOLDER_LABELS[id],
    sub: FOLDER_SUBS[id],
    color: FOLDER_COLORS[id],
    count: folderCounts.get(id) ?? 0,
  }));

  const portraitPath = path.join(vaultDir, 'assets', 'portrait.png');
  let portraitUrl: string | null = null;
  try {
    await access(portraitPath);
    portraitUrl = '/vault-assets/portrait.png';
  } catch {
    portraitUrl = null;
  }

  const agentSources = new Set(battleLog.map((entry) => entry.source));

  return {
    totalPl: graph.totalPl,
    energyPercent,
    energyStatus,
    threatLevel,
    radarTargets: buildRadarTargets(graph.nodes),
    folders,
    battleLog,
    portraitUrl,
    noteCount: index.notes.length,
    agentCount: agentSources.size,
  };
}

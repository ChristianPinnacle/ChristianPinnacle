import { VALID_FOLDERS } from '../vault/types';
import type { VaultIndex } from '../vault/types';

export type GraphNode = {
  id: string;
  path: string;
  title: string;
  folder: string;
  color: string;
  plScore: number;
  inboundLinks: number;
  hub: boolean;
  r: number;
  spikes: number;
  seed: number;
  label: string;
};

export type GraphEdge = {
  source: string;
  target: string;
  type: 'wiki';
};

export type GraphFolder = {
  id: string;
  label: string;
  color: string;
  count: number;
};

export type GraphPayload = {
  nodes: GraphNode[];
  edges: GraphEdge[];
  folders: GraphFolder[];
  totalPl: number;
};

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

function hashSeed(path: string): number {
  let hash = 0;
  for (let i = 0; i < path.length; i += 1) {
    hash = (hash * 31 + path.charCodeAt(i)) % 1000;
  }
  return hash / 100;
}

export function buildGraphPayload(index: VaultIndex): GraphPayload {
  const inbound = new Map<string, number>();

  for (const link of index.links) {
    inbound.set(link.targetPath, (inbound.get(link.targetPath) ?? 0) + 1);
  }

  const folderCounts = new Map<string, number>();
  for (const note of index.notes) {
    folderCounts.set(note.folder, (folderCounts.get(note.folder) ?? 0) + 1);
  }

  const nodes: GraphNode[] = index.notes.map((note) => {
    const inboundLinks = inbound.get(note.path) ?? 0;
    const hub = inboundLinks >= 1 || note.plScore >= 2500;

    return {
      id: note.path,
      path: note.path,
      title: note.title,
      folder: note.folder,
      color: FOLDER_COLORS[note.folder] ?? FOLDER_COLORS.unsorted,
      plScore: note.plScore,
      inboundLinks,
      hub,
      r: hub ? 6 + Math.min(inboundLinks, 3) * 0.8 : 2.2,
      spikes: hub ? 10 + (inboundLinks % 4) : 8,
      seed: hashSeed(note.path),
      label: note.title,
    };
  });

  const edges: GraphEdge[] = index.links.map((link) => ({
    source: link.sourcePath,
    target: link.targetPath,
    type: 'wiki',
  }));

  const folders: GraphFolder[] = VALID_FOLDERS.filter(
    (id) => (folderCounts.get(id) ?? 0) > 0,
  ).map((id) => ({
    id,
    label: FOLDER_LABELS[id],
    color: FOLDER_COLORS[id],
    count: folderCounts.get(id) ?? 0,
  }));

  const totalPl = nodes.reduce((sum, node) => sum + node.plScore, 0);

  return { nodes, edges, folders, totalPl };
}

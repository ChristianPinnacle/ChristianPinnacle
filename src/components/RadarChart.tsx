import { getFolderColor } from '../lib/graphColors';

interface RadarNode {
  id: string;
  title: string;
  folder: string;
  plScore: number;
}

interface RadarProps {
  nodes: RadarNode[];
}

const SIZE = 180;
const CX = SIZE / 2;
const CY = SIZE / 2;
const R = SIZE * 0.38;
const AXES = ['projects', 'areas', 'resources', 'warroom', 'archive'];
const AXIS_LABELS: Record<string, string> = {
  projects: 'PROJ',
  areas: 'AREA',
  resources: 'RES',
  warroom: 'WAR',
  archive: 'ARC',
};

function axisPoint(idx: number, total: number, radius: number) {
  const angle = (idx / total) * Math.PI * 2 - Math.PI / 2;
  return {
    x: CX + Math.cos(angle) * radius,
    y: CY + Math.sin(angle) * radius,
  };
}

export function RadarChart({ nodes }: RadarProps) {
  const maxPl = Math.max(...nodes.map((n) => n.plScore), 1);

  const hubByFolder = new Map<string, RadarNode>();
  for (const node of nodes) {
    const existing = hubByFolder.get(node.folder);
    if (!existing || node.plScore > existing.plScore) {
      hubByFolder.set(node.folder, node);
    }
  }

  const scores = AXES.map((folder) => {
    const hub = hubByFolder.get(folder);
    return hub ? hub.plScore / maxPl : 0;
  });

  const outerPoints = AXES.map((_, i) => axisPoint(i, AXES.length, R));
  const dataPoints = scores.map((s, i) => axisPoint(i, AXES.length, R * Math.max(0.08, s)));

  const dataPath = dataPoints.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ') + ' Z';
  const gridPath = (r: number) =>
    AXES.map((_, i) => {
      const p = axisPoint(i, AXES.length, r);
      return `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`;
    }).join(' ') + ' Z';

  return (
    <div className="radar-card">
      <div className="radar-label">RADAR — HUB POSITIONS</div>
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className="radar-svg">
        {[0.25, 0.5, 0.75, 1].map((t) => (
          <path key={t} d={gridPath(R * t)} fill="none" stroke="rgba(154,175,255,0.15)" strokeWidth="1" />
        ))}
        {outerPoints.map((p, i) => (
          <line key={i} x1={CX} y1={CY} x2={p.x} y2={p.y} stroke="rgba(154,175,255,0.2)" strokeWidth="1" />
        ))}
        <path d={dataPath} fill="rgba(60,88,214,0.35)" stroke="#3C58D6" strokeWidth="1.5" />
        {dataPoints.map((p, i) => {
          const folder = AXES[i]!;
          const hub = hubByFolder.get(folder);
          return (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={hub ? 4 : 2}
              fill={getFolderColor(folder)}
            />
          );
        })}
        {outerPoints.map((p, i) => {
          const folder = AXES[i]!;
          const labelPt = axisPoint(i, AXES.length, R + 14);
          return (
            <text
              key={i}
              x={labelPt.x}
              y={labelPt.y}
              textAnchor="middle"
              dominantBaseline="middle"
              fill={getFolderColor(folder)}
              fontSize="8"
              fontFamily="Saira Condensed, sans-serif"
              fontWeight="700"
            >
              {AXIS_LABELS[folder]}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

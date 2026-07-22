export interface GraphNode {
  id: string;
  title: string;
  folder: string;
  plScore: number;
  x: number;
  y: number;
  radius: number;
  vx: number;
  vy: number;
}

export interface GraphEdge {
  source: string;
  target: string;
  type?: 'wiki' | 'ai';
  confidence?: number;
  accepted?: boolean | null;
}

export interface GraphData {
  nodes: Array<{ id: string; title: string; folder: string; plScore: number }>;
  edges: GraphEdge[];
}

const REPULSION = 6000;
const ATTRACTION = 0.015;
const DAMPING = 0.82;
const CENTRE_PULL = 0.012;
const ITERATIONS = 120;

export function layoutGraph(data: GraphData, width: number, height: number): GraphNode[] {
  const cx = width / 2;
  const cy = height / 2;

  const nodes: GraphNode[] = data.nodes.map((node, i) => {
    const angle = (i / data.nodes.length) * Math.PI * 2;
    const r = Math.min(width, height) * 0.28;
    return {
      ...node,
      x: cx + Math.cos(angle) * r + (Math.random() - 0.5) * 40,
      y: cy + Math.sin(angle) * r + (Math.random() - 0.5) * 40,
      radius: Math.max(10, Math.min(26, 10 + Math.sqrt(node.plScore) * 0.08)),
      vx: 0,
      vy: 0,
    };
  });

  const nodeById = new Map(nodes.map((n) => [n.id, n]));

  for (let iter = 0; iter < ITERATIONS; iter++) {
    // repulsion
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i]!;
        const b = nodes[j]!;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist2 = dx * dx + dy * dy + 1;
        const force = REPULSION / dist2;
        const dist = Math.sqrt(dist2);
        a.vx -= (force * dx) / dist;
        a.vy -= (force * dy) / dist;
        b.vx += (force * dx) / dist;
        b.vy += (force * dy) / dist;
      }
    }

    // attraction along edges
    for (const edge of data.edges) {
      const a = nodeById.get(edge.source);
      const b = nodeById.get(edge.target);
      if (!a || !b) continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      a.vx += dx * ATTRACTION;
      a.vy += dy * ATTRACTION;
      b.vx -= dx * ATTRACTION;
      b.vy -= dy * ATTRACTION;
    }

    // centre gravity
    for (const node of nodes) {
      node.vx += (cx - node.x) * CENTRE_PULL;
      node.vy += (cy - node.y) * CENTRE_PULL;
      node.vx *= DAMPING;
      node.vy *= DAMPING;
      node.x += node.vx;
      node.y += node.vy;
    }
  }

  return nodes;
}

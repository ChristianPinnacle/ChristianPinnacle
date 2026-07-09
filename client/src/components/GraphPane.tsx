import { useCallback, useEffect, useRef } from "react";
import { CARD, GOLDD, GOLD, MUTE, NAVY, notch } from "../theme";

export type GraphNodePayload = {
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

export type GraphEdgePayload = {
  source: string;
  target: string;
  type: "wiki";
};

type SimNode = GraphNodePayload & {
  x: number;
  y: number;
  vx: number;
  vy: number;
};

type GraphData = {
  nodes: SimNode[];
  edges: Array<[number, number]>;
};

type ViewState = {
  x: number;
  y: number;
  k: number;
  init?: boolean;
};

type DragState = {
  x: number;
  y: number;
  moved: boolean;
  vx: number;
  vy: number;
};

type PointerEventLike = {
  clientX: number;
  clientY: number;
};

type GraphPaneProps = {
  nodes: GraphNodePayload[];
  edges: GraphEdgePayload[];
  hidden: Record<string, boolean>;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
};

function buildSimulation(nodes: GraphNodePayload[], edges: GraphEdgePayload[]): GraphData {
  const idToIndex = new Map(nodes.map((node, index) => [node.id, index]));
  const simNodes: SimNode[] = nodes.map((node) => ({
    ...node,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
  }));

  const W = 1200;
  const H = 1200;

  simNodes.forEach((node) => {
    node.x = W / 2 + (Math.random() - 0.5) * W * 0.8;
    node.y = H / 2 + (Math.random() - 0.5) * H * 0.8;
  });

  const simEdges: Array<[number, number]> = [];
  for (const edge of edges) {
    const source = idToIndex.get(edge.source);
    const target = idToIndex.get(edge.target);
    if (source !== undefined && target !== undefined) {
      simEdges.push([source, target]);
    }
  }

  for (let iteration = 0; iteration < 160; iteration += 1) {
    const cell = 60;
    const grid = new Map<string, SimNode[]>();

    simNodes.forEach((node) => {
      const key = `${Math.floor(node.x / cell)},${Math.floor(node.y / cell)}`;
      const bucket = grid.get(key) ?? [];
      bucket.push(node);
      grid.set(key, bucket);
    });

    simNodes.forEach((node) => {
      const cx = Math.floor(node.x / cell);
      const cy = Math.floor(node.y / cell);

      for (let gx = cx - 1; gx <= cx + 1; gx += 1) {
        for (let gy = cy - 1; gy <= cy + 1; gy += 1) {
          const bucket = grid.get(`${gx},${gy}`);
          if (!bucket) continue;

          bucket.forEach((other) => {
            if (other === node) return;
            let dx = node.x - other.x;
            let dy = node.y - other.y;
            let d2 = dx * dx + dy * dy;
            if (d2 < 1) d2 = 1;
            if (d2 > 3600) return;
            const force = 220 / d2;
            const distance = Math.sqrt(d2);
            node.vx += (dx / distance) * force;
            node.vy += (dy / distance) * force;
          });
        }
      }
    });

    simEdges.forEach(([a, b]) => {
      const na = simNodes[a];
      const nb = simNodes[b];
      if (!na || !nb) return;

      const dx = nb.x - na.x;
      const dy = nb.y - na.y;
      const distance = Math.sqrt(dx * dx + dy * dy) || 1;
      const force = (distance - 55) * 0.02;
      na.vx += (dx / distance) * force;
      na.vy += (dy / distance) * force;
      nb.vx -= (dx / distance) * force;
      nb.vy -= (dy / distance) * force;
    });

    simNodes.forEach((node) => {
      node.vx += (600 - node.x) * 0.0015;
      node.vy += (600 - node.y) * 0.0015;
      node.vx *= 0.6;
      node.vy *= 0.6;
      node.x += node.vx;
      node.y += node.vy;
    });
  }

  return { nodes: simNodes, edges: simEdges };
}

export default function GraphPane({
  nodes,
  edges,
  hidden,
  selectedId,
  onSelect,
}: GraphPaneProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const graphRef = useRef<GraphData | null>(null);
  const viewRef = useRef<ViewState>({ x: 0, y: 0, k: 1 });
  const dragRef = useRef<DragState | null>(null);
  const pulseRef = useRef(0);
  const selectedRef = useRef(selectedId);
  const hiddenRef = useRef(hidden);

  useEffect(() => {
    selectedRef.current = selectedId;
  }, [selectedId]);

  useEffect(() => {
    hiddenRef.current = hidden;
  }, [hidden]);

  useEffect(() => {
    graphRef.current = buildSimulation(nodes, edges);
    viewRef.current = { x: 0, y: 0, k: 1 };
  }, [nodes, edges]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    const graph = graphRef.current;
    if (!canvas || !wrap || !graph) return;

    const dpr = window.devicePixelRatio || 1;
    const width = wrap.clientWidth;
    const height = wrap.clientHeight;

    if (canvas.width !== width * dpr) {
      canvas.width = width * dpr;
      canvas.style.width = `${width}px`;
    }
    if (canvas.height !== height * dpr) {
      canvas.height = height * dpr;
      canvas.style.height = `${height}px`;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = NAVY;
    ctx.fillRect(0, 0, width, height);

    const view = viewRef.current;
    const hiddenFolders = hiddenRef.current;

    if (!view.init) {
      const xs = graph.nodes.map((node) => node.x);
      const ys = graph.nodes.map((node) => node.y);
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const minY = Math.min(...ys);
      const maxY = Math.max(...ys);
      const scale = Math.min(width / (maxX - minX + 100), height / (maxY - minY + 100));
      view.k = scale;
      view.x = width / 2 - ((minX + maxX) / 2) * scale;
      view.y = height / 2 - ((minY + maxY) / 2) * scale;
      view.init = true;
    }

    const isVisible = (node: SimNode): boolean => !hiddenFolders[node.folder];

    ctx.save();
    ctx.translate(view.x, view.y);
    ctx.scale(view.k, view.k);

    const pulse = pulseRef.current;
    const selected = selectedRef.current;

    ctx.strokeStyle = "rgba(77,107,255,0.14)";
    ctx.lineWidth = 0.6 / view.k;
    ctx.beginPath();
    graph.edges.forEach(([a, b]) => {
      const na = graph.nodes[a];
      const nb = graph.nodes[b];
      if (!na || !nb || !isVisible(na) || !isVisible(nb)) return;
      ctx.moveTo(na.x, na.y);
      ctx.lineTo(nb.x, nb.y);
    });
    ctx.stroke();

    graph.nodes.forEach((node) => {
      if (!isVisible(node)) return;

      const hot = selected === node.id;
      if (hot) {
        const layers = [
          { len: 5.5, color: `${GOLD}33` },
          { len: 4, color: `${GOLD}77` },
          { len: 2.6, color: "#FFF3C4CC" },
        ];

        layers.forEach((layer, layerIndex) => {
          ctx.beginPath();
          const spikes = node.spikes;
          const base = node.r * 2.2;

          for (let i = 0; i <= spikes * 2; i += 1) {
            const angle = (i / (spikes * 2)) * Math.PI * 2 - Math.PI / 2;
            const flicker = Math.sin(pulse * 3 + node.seed + i * 1.7) * 0.35;
            const radius =
              i % 2 === 0
                ? base * layer.len * (1 + flicker)
                : base * (1.1 + layerIndex * 0.2);
            const x = node.x + Math.cos(angle) * radius;
            const y = node.y + Math.sin(angle) * radius * 1.15;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }

          ctx.closePath();
          ctx.fillStyle = layer.color;
          ctx.fill();
        });
      }

      ctx.beginPath();
      ctx.arc(node.x, node.y, node.r * (hot ? 1.5 : 1), 0, Math.PI * 2);
      ctx.fillStyle = hot ? "#FFF" : `${node.color}${node.hub ? "" : "CC"}`;
      ctx.fill();

      if (node.label && (hot || (node.hub && view.k > 0.9))) {
        ctx.font = `600 ${11 / view.k}px sans-serif`;
        ctx.fillStyle = hot ? GOLD : "rgba(220,230,255,0.6)";
        ctx.textAlign = "center";
        ctx.fillText(node.label.toUpperCase(), node.x, node.y + node.r + 20 / view.k);
      }
    });

    ctx.restore();
  }, []);

  useEffect(() => {
    let frame = 0;
    const loop = (): void => {
      pulseRef.current += 0.06;
      draw();
      frame = requestAnimationFrame(loop);
    };

    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [draw, nodes, edges, hidden, selectedId]);

  const getPos = (event: MouseEvent | TouchEvent): { x: number; y: number } => {
    const rect = canvasRef.current?.getBoundingClientRect();
    const pointer: PointerEventLike | undefined = "touches" in event ? event.touches[0] : event;
    if (!rect || !pointer) return { x: 0, y: 0 };
    return { x: pointer.clientX - rect.left, y: pointer.clientY - rect.top };
  };

  const toWorld = (px: number, py: number): { x: number; y: number } => {
    const view = viewRef.current;
    return { x: (px - view.x) / view.k, y: (py - view.y) / view.k };
  };

  const onDown = (event: React.MouseEvent | React.TouchEvent): void => {
    const pos = getPos(event.nativeEvent);
    dragRef.current = {
      ...pos,
      moved: false,
      vx: viewRef.current.x,
      vy: viewRef.current.y,
    };
  };

  const onMove = (event: React.MouseEvent | React.TouchEvent): void => {
    const drag = dragRef.current;
    if (!drag) return;

    const pos = getPos(event.nativeEvent);
    if (Math.hypot(pos.x - drag.x, pos.y - drag.y) > 4) {
      drag.moved = true;
    }

    if (drag.moved) {
      viewRef.current.x = drag.vx + (pos.x - drag.x);
      viewRef.current.y = drag.vy + (pos.y - drag.y);
    }
  };

  const onUp = (event: React.MouseEvent | React.TouchEvent): void => {
    const drag = dragRef.current;
    dragRef.current = null;

    if (!drag || drag.moved) return;

    const graph = graphRef.current;
    const canvas = canvasRef.current;
    if (!graph || !canvas) return;

    const rect = canvas.getBoundingClientRect();
    const pointer: PointerEventLike | undefined =
      "changedTouches" in event.nativeEvent
        ? event.nativeEvent.changedTouches[0]
        : event.nativeEvent;
    if (!pointer) return;

    const world = toWorld(pointer.clientX - rect.left, pointer.clientY - rect.top);
    const hiddenFolders = hiddenRef.current;

    let best: SimNode | null = null;
    let bestDistance = 14 / viewRef.current.k;

    graph.nodes.forEach((node) => {
      if (hiddenFolders[node.folder]) return;
      const distance = Math.hypot(node.x - world.x, node.y - world.y);
      const hitRadius = Math.max(node.r + 4, bestDistance);
      if (distance < hitRadius && (!best || distance < bestDistance)) {
        best = node;
        bestDistance = distance;
      }
    });

    onSelect(best?.id ?? null);
  };

  const onWheel = (event: React.WheelEvent): void => {
    event.preventDefault();
    const pos = getPos(event.nativeEvent);
    const view = viewRef.current;
    const nextScale = Math.max(0.2, Math.min(4, view.k * (event.deltaY < 0 ? 1.12 : 0.89)));
    const world = toWorld(pos.x, pos.y);
    view.k = nextScale;
    view.x = pos.x - world.x * nextScale;
    view.y = pos.y - world.y * nextScale;
  };

  return (
    <div
      className="graph-frame"
      style={{
        position: "relative",
        background: CARD,
        clipPath: notch(12),
        border: `1px solid ${GOLDD}`,
      }}
    >
      <div ref={wrapRef} className="graph-wrap">
        <canvas
          ref={canvasRef}
          onMouseDown={onDown}
          onMouseMove={onMove}
          onMouseUp={onUp}
          onMouseLeave={() => {
            dragRef.current = null;
          }}
          onTouchStart={onDown}
          onTouchMove={onMove}
          onTouchEnd={onUp}
          onWheel={onWheel}
          style={{ display: "block", touchAction: "none", cursor: "grab", width: "100%", height: "100%" }}
        />
        <div className="graph-hint">SCROLL = ZOOM · DRAG = PAN · TAP = SCAN</div>
      </div>
    </div>
  );
}

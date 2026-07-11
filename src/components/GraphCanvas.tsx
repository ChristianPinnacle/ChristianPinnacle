import { useEffect, useRef, useState, useCallback } from 'react';
import { getFolderColor, getFolderGlow } from '../lib/graphColors';
import { layoutGraph, type GraphNode, type GraphEdge } from '../lib/graphLayout';

interface GraphCanvasProps {
  nodes: Array<{ id: string; title: string; folder: string; plScore: number }>;
  edges: GraphEdge[];
  onNodeTap: (nodeId: string) => void;
}

interface Transform {
  x: number;
  y: number;
  scale: number;
}

function drawFlameAura(
  ctx: CanvasRenderingContext2D,
  node: GraphNode,
  t: number,
): void {
  const glowColor = getFolderGlow(node.folder);
  const pulseSize = node.radius * (1.6 + 0.25 * Math.sin(t * 0.05 + node.x));

  const gradient = ctx.createRadialGradient(
    node.x, node.y, node.radius * 0.5,
    node.x, node.y, pulseSize,
  );
  gradient.addColorStop(0, glowColor);
  gradient.addColorStop(1, 'transparent');

  ctx.beginPath();
  ctx.arc(node.x, node.y, pulseSize, 0, Math.PI * 2);
  ctx.fillStyle = gradient;
  ctx.fill();
}

function drawEdge(
  ctx: CanvasRenderingContext2D,
  a: GraphNode,
  b: GraphNode,
): void {
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.strokeStyle = 'rgba(154,175,255,0.25)';
  ctx.lineWidth = 1;
  ctx.stroke();
}

function drawNode(
  ctx: CanvasRenderingContext2D,
  node: GraphNode,
  selected: boolean,
  t: number,
): void {
  drawFlameAura(ctx, node, t);

  ctx.beginPath();
  ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
  ctx.fillStyle = getFolderColor(node.folder);
  ctx.fill();

  if (selected) {
    ctx.strokeStyle = '#F5C542';
    ctx.lineWidth = 2.5;
    ctx.stroke();
  }

  const label = node.title.length > 14 ? node.title.slice(0, 13) + '…' : node.title;
  ctx.fillStyle = '#EDF1FA';
  ctx.font = `bold ${Math.max(9, node.radius * 0.65)}px "Saira Condensed", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, node.x, node.y + node.radius + 10);
}

export function GraphCanvas({ nodes: rawNodes, edges, onNodeTap }: GraphCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [layoutNodes, setLayoutNodes] = useState<GraphNode[]>([]);
  const [transform, setTransform] = useState<Transform>({ x: 0, y: 0, scale: 1 });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const frameRef = useRef(0);
  const tickRef = useRef(0);

  // pointer state for pan / tap detection
  const pointerRef = useRef<{
    down: boolean;
    startX: number;
    startY: number;
    lastX: number;
    lastY: number;
    moved: boolean;
  }>({ down: false, startX: 0, startY: 0, lastX: 0, lastY: 0, moved: false });

  // layout once on mount / data change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || rawNodes.length === 0) return;
    const w = canvas.width;
    const h = canvas.height;
    const laid = layoutGraph({ nodes: rawNodes, edges }, w, h);
    setLayoutNodes(laid);
  }, [rawNodes, edges]);

  // animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || layoutNodes.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const nodeById = new Map(layoutNodes.map((n) => [n.id, n]));

    const draw = () => {
      tickRef.current += 1;
      const t = tickRef.current;
      const { x, y, scale } = transform;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(scale, scale);

      for (const edge of edges) {
        const a = nodeById.get(edge.source);
        const b = nodeById.get(edge.target);
        if (a && b) drawEdge(ctx, a, b);
      }

      for (const node of layoutNodes) {
        drawNode(ctx, node, node.id === selectedId, t);
      }

      ctx.restore();
      frameRef.current = requestAnimationFrame(draw);
    };

    frameRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frameRef.current);
  }, [layoutNodes, edges, transform, selectedId]);

  const canvasToWorld = useCallback(
    (cx: number, cy: number) => {
      const canvas = canvasRef.current!;
      const rect = canvas.getBoundingClientRect();
      const px = (cx - rect.left) * (canvas.width / rect.width);
      const py = (cy - rect.top) * (canvas.height / rect.height);
      return {
        x: (px - transform.x) / transform.scale,
        y: (py - transform.y) / transform.scale,
      };
    },
    [transform],
  );

  const hitTest = useCallback(
    (wx: number, wy: number): GraphNode | null => {
      for (const node of layoutNodes) {
        const dx = wx - node.x;
        const dy = wy - node.y;
        if (Math.sqrt(dx * dx + dy * dy) <= node.radius + 12) return node;
      }
      return null;
    },
    [layoutNodes],
  );

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const p = pointerRef.current;
    p.down = true;
    p.startX = e.clientX;
    p.startY = e.clientY;
    p.lastX = e.clientX;
    p.lastY = e.clientY;
    p.moved = false;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const p = pointerRef.current;
    if (!p.down) return;
    const dx = e.clientX - p.lastX;
    const dy = e.clientY - p.lastY;
    if (Math.abs(e.clientX - p.startX) > 5 || Math.abs(e.clientY - p.startY) > 5) {
      p.moved = true;
    }
    p.lastX = e.clientX;
    p.lastY = e.clientY;
    setTransform((prev) => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
  };

  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const p = pointerRef.current;
    p.down = false;
    if (!p.moved) {
      const { x, y } = canvasToWorld(e.clientX, e.clientY);
      const hit = hitTest(x, y);
      if (hit) {
        setSelectedId(hit.id);
        onNodeTap(hit.id);
      } else {
        setSelectedId(null);
      }
    }
  };

  const onWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.1 : 0.9;
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const px = (e.clientX - rect.left) * (canvas.width / rect.width);
    const py = (e.clientY - rect.top) * (canvas.height / rect.height);
    setTransform((prev) => ({
      scale: Math.max(0.3, Math.min(4, prev.scale * factor)),
      x: px - (px - prev.x) * factor,
      y: py - (py - prev.y) * factor,
    }));
  };

  return (
    <canvas
      ref={canvasRef}
      width={412}
      height={560}
      style={{ width: '100%', height: 'auto', touchAction: 'none', cursor: 'grab' }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onWheel={onWheel}
    />
  );
}

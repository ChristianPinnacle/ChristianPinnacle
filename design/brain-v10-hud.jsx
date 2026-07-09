import { useState, useEffect, useRef, useCallback } from "react";

// ---------- PALETTE ----------
const NAVY = "#05070F";
const CARD = "#0A0D1C";
const GOLD = "#F5C542";
const GOLDD = "#8A6A1D";
const RED = "#FF3B45";
const REDBG = "rgba(255,59,69,0.08)";
const GREEN = "#39FF88";
const WHITE = "#EDF1FA";
const MUTE = "#6B7694";

const FOLDERS = [
  { id: "projects", label: "ELITE", sub: "Current Projects", color: "#4D6BFF", count: 90 },
  { id: "areas",    label: "ROYAL", sub: "Areas",            color: GOLD,      count: 60 },
  { id: "resources",label: "CAPSULE", sub: "Resources",      color: WHITE,     count: 55 },
  { id: "warroom",  label: "WAR ROOM", sub: "Decisions",     color: "#9AAFFF", count: 18 },
  { id: "archive",  label: "GRAVEYARD", sub: "Archive",      color: "#5A6890", count: 130 },
  { id: "unsorted", label: "SCOUTER ERROR", sub: "Unsorted", color: RED,       count: 25 },
];
const HUBS = {
  projects: ["VitalEdge Hub", "Bloodwork OCR", "CSV Import Wizard", "T4 Workout Logger", "MFP Campaign", "Hamilton S&C"],
  areas: ["Pinnacle Coaching", "Adonis Gym", "Supplements Brand", "Project 160 Ops"],
  resources: ["Hormozi — 100M Offers", "Pinnacle Soul File", "AU Nutrition DB", "Competitor Pain Points", "KPI Workbook Feed"],
  warroom: ["B2B-First Decision", "Pricing: 15-25-35", "Teal Rebrand Call"],
  archive: ["Gold Branding (old)", "14-Sheet Workbook", "WorkoutX GIFs"],
  unsorted: ["Candice PWA", "Injury 3D Map"],
};
const AGENT_FEED = [
  { agent: "MANUS", action: "logged finding → Bloodw…", t: "2m" },
  { agent: "CLAUDE CODE", action: "updated whats-n…", t: "14m" },
  { agent: "CANDICE", action: "filed voice note → Adoni…", t: "1h" },
  { agent: "SYNC", action: "memory-bank/ · 5 files pull…", t: "1h" },
];

function buildGraph() {
  const nodes = [];
  let id = 0;
  FOLDERS.forEach((f) => {
    const hubs = HUBS[f.id] || [];
    hubs.forEach((label) => nodes.push({ id: id++, folder: f.id, color: f.color, r: 6 + Math.random() * 3, label, hub: true, pl: 8500 + Math.floor(Math.random() * 6000), spikes: 10 + ((Math.random() * 4) | 0), seed: Math.random() * 10 }));
    for (let i = 0; i < f.count - hubs.length; i++)
      nodes.push({ id: id++, folder: f.id, color: f.color, r: 1.8 + Math.random() * 1.8, label: null, hub: false, pl: 100 + ((Math.random() * 900) | 0), spikes: 8, seed: Math.random() * 10 });
  });
  const edges = [];
  const hubsBy = {};
  nodes.forEach((n) => { if (n.hub) (hubsBy[n.folder] ||= []).push(n); });
  nodes.forEach((n) => {
    if (n.hub) return;
    const hs = hubsBy[n.folder];
    if (hs && hs.length && Math.random() < 0.75) edges.push([n.id, hs[(Math.random() * hs.length) | 0].id]);
    if (Math.random() < 0.55) {
      const o = nodes[(Math.random() * nodes.length) | 0];
      if (o.id !== n.id) edges.push([n.id, o.id]);
    }
  });
  const allHubs = nodes.filter((n) => n.hub);
  allHubs.forEach((h) => {
    for (let k = 0; k < 2; k++) {
      const o = allHubs[(Math.random() * allHubs.length) | 0];
      if (o.id !== h.id) edges.push([h.id, o.id]);
    }
  });
  return { nodes, edges };
}

const notch = (n = 10) => `polygon(${n}px 0, calc(100% - ${n}px) 0, 100% ${n}px, 100% calc(100% - ${n}px), calc(100% - ${n}px) 100%, ${n}px 100%, 0 calc(100% - ${n}px), 0 ${n}px)`;

// gold-framed angular card
function Frame({ children, accent = GOLD, glow, style = {}, pad = 14 }) {
  return (
    <div style={{
      position: "relative", background: CARD, clipPath: notch(12),
      boxShadow: glow ? `0 0 24px ${accent}33` : "none", ...style,
    }}>
      <div style={{ position: "absolute", inset: 0, clipPath: notch(12), padding: 1.4, background: `linear-gradient(160deg, ${accent}, ${GOLDD} 45%, ${accent}66)` }}>
        <div style={{ width: "100%", height: "100%", background: CARD, clipPath: notch(11) }} />
      </div>
      <div style={{ position: "relative", padding: pad }}>{children}</div>
    </div>
  );
}

function ArmourIcon({ size = 40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 60 60">
      <path d="M14 18 Q30 8 46 18 L46 44 Q30 54 14 44 Z" fill="#3C58D6" />
      <path d="M10 16 Q30 4 50 16 L50 28 Q42 24 38 30 L38 46 Q30 51 22 46 L22 30 Q18 24 10 28 Z" fill={WHITE} stroke="#B9C2D8" strokeWidth="1.5" />
      <path d="M2 14 Q10 8 18 16 L14 30 Q6 26 2 20 Z" fill={GOLD} stroke="#C99A1E" strokeWidth="1.5" />
      <path d="M58 14 Q50 8 42 16 L46 30 Q54 26 58 20 Z" fill={GOLD} stroke="#C99A1E" strokeWidth="1.5" />
      <path d="M22 30 L30 40 L38 30 L38 36 L30 46 L22 36 Z" fill={GOLD} />
    </svg>
  );
}

function FolderGlyph({ kind, color }) {
  const p = { width: 16, height: 16, viewBox: "0 0 24 24", style: { flexShrink: 0 } };
  switch (kind) {
    case "projects": return <svg {...p}><path d="M12 1 L14.5 9 L23 12 L14.5 15 L12 23 L9.5 15 L1 12 L9.5 9 Z" fill={color} /></svg>;
    case "areas": return <svg {...p}><path d="M2 18 L4 7 L9 12 L12 4 L15 12 L20 7 L22 18 Z" fill={color} /><rect x="2" y="19" width="20" height="3" rx="1" fill={color} /></svg>;
    case "resources": return <svg {...p}><rect x="4" y="2" width="16" height="20" rx="8" fill="none" stroke={color} strokeWidth="2.4" /><line x1="4" y1="12" x2="20" y2="12" stroke={color} strokeWidth="2.4" /><circle cx="12" cy="7" r="2" fill={color} /></svg>;
    case "warroom": return <svg {...p}><path d="M4 20 L20 4 M4 12 L12 4 M12 20 L20 12" stroke={color} strokeWidth="2.4" fill="none" strokeLinecap="round" /></svg>;
    case "archive": return <svg {...p}><path d="M5 22 L5 9 Q12 1 19 9 L19 22 Z" fill="none" stroke={color} strokeWidth="2.2" /><line x1="12" y1="9" x2="12" y2="16" stroke={color} strokeWidth="2.2" /><line x1="8.5" y1="12" x2="15.5" y2="12" stroke={color} strokeWidth="2.2" /></svg>;
    default: return <svg {...p}><path d="M13 2 L5 14 H11 L9 22 L19 9 H13 Z" fill={color} /></svg>;
  }
}

// Original ki-aura portrait placeholder — swap with commissioned art via `src`
function PortraitSlot({ src }) {
  return (
    <div style={{ position: "relative", height: 190, overflow: "hidden", clipPath: notch(12), background: "radial-gradient(ellipse at 50% 80%, #101A45 0%, #05070F 70%)" }}>
      {src ? (
        <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (
        <svg viewBox="0 0 300 190" style={{ width: "100%", height: "100%" }}>
          {[...Array(14)].map((_, i) => {
            const x = 150 + (i - 7) * 16;
            const h = 60 + Math.abs(7 - i) * -4 + (i % 3) * 26;
            return <path key={i} d={`M${x} 185 L${x - 9} ${185 - h} L${x} ${170 - h - (i % 2) * 18} L${x + 9} ${185 - h} Z`} fill={i % 2 ? "#2E5BFF" : "#5FD4FF"} opacity={0.16 + (i % 3) * 0.1} />;
          })}
          <ellipse cx="150" cy="188" rx="120" ry="16" fill="#5FD4FF22" />
          <circle cx="150" cy="120" r="34" fill="none" stroke="#5FD4FF66" strokeWidth="1.4" strokeDasharray="6 8" />
          <text x="150" y="118" textAnchor="middle" fill="#7FA8FF" fontSize="10" letterSpacing="2" fontFamily="sans-serif">YOUR ART</text>
          <text x="150" y="132" textAnchor="middle" fill="#4A5B8F" fontSize="8" letterSpacing="2" fontFamily="sans-serif">DROP PORTRAIT HERE</text>
        </svg>
      )}
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, transparent 60%, #05070F 100%)" }} />
    </div>
  );
}

export default function SaiyanHUD() {
  const [view, setView] = useState("hud"); // hud | graph
  const [hidden, setHidden] = useState({});
  const [selected, setSelected] = useState(null);
  const [plDisplay, setPlDisplay] = useState(0);
  const graphRef = useRef(null);
  if (!graphRef.current) graphRef.current = buildGraph();
  const totalPL = graphRef.current.nodes.reduce((s, n) => s + n.pl, 0);
  const selNode = selected != null ? graphRef.current.nodes.find((n) => n.id === selected) : null;
  const scanPL = selNode ? plDisplay : totalPL;

  useEffect(() => {
    const target = selNode ? selNode.pl : 0;
    if (!selNode) return;
    setPlDisplay(0);
    const start = performance.now();
    let raf;
    const tick = (t) => {
      const p = Math.min(1, (t - start) / 900);
      setPlDisplay(Math.floor(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [selected]); // eslint-disable-line

  return (
    <div style={{
      fontFamily: "'Saira Condensed', system-ui, sans-serif", background: "#020308", color: WHITE,
      minHeight: "100vh", padding: 10, display: "flex", justifyContent: "center",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Saira+Condensed:wght@400;600;700&family=Bungee&display=swap');
        * { box-sizing: border-box; } button { cursor: pointer; font-family: inherit; }
        ::-webkit-scrollbar { width: 0; }
        .dbz-title { font-family: 'Bungee', sans-serif; transform: skewX(-5deg); color: ${GOLD};
          text-shadow: 0 0 18px rgba(245,197,66,.45), 2px 2px 0 rgba(0,0,0,.7); line-height: .95; }
        .blink { animation: blink 1.5s ease-in-out infinite; }
        .barflick { animation: flick 1.1s ease-in-out infinite; }
        .sweep { animation: spin 3.6s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes blink { 0%,100% { opacity:.35 } 50% { opacity:1 } }
        @keyframes flick { 0%,100% { opacity:.65 } 50% { opacity:1 } }
        @media (prefers-reduced-motion: reduce) { .blink,.barflick,.sweep { animation: none !important } }
      `}</style>

      {/* OUTER GOLD FRAME */}
      <Frame accent={GOLD} pad={0} style={{ width: "100%", maxWidth: 520 }}>
        <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 12 }}>

          {/* header */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "4px 4px 0" }}>
            <ArmourIcon size={44} />
            <div>
              <div className="dbz-title" style={{ fontSize: 26 }}>SAIYAN<br />ARCHIVE</div>
            </div>
            <div style={{ marginLeft: "auto", textAlign: "right" }}>
              <button onClick={() => setView(view === "hud" ? "graph" : "hud")}
                style={{
                  background: view === "graph" ? GOLD : "transparent", color: view === "graph" ? NAVY : GOLD,
                  border: `1px solid ${GOLD}`, clipPath: notch(6), padding: "6px 14px",
                  fontFamily: "'Bungee', sans-serif", fontSize: 11,
                }}>
                {view === "hud" ? "GRAPH" : "HUD"}
              </button>
            </div>
          </div>
          <div style={{ fontSize: 12, letterSpacing: "0.22em", color: WHITE, padding: "0 6px", fontWeight: 700 }}>
            PRINCE OF ALL NOTES · <span style={{ color: GOLD }}>PL {Math.round(totalPL / 1000)}K</span>
          </div>

          {view === "graph" ? (
            <GraphPane graphRef={graphRef} hidden={hidden} selected={selected} setSelected={setSelected} />
          ) : (
            <>
              {/* portrait */}
              <PortraitSlot />

              {/* POWER LEVEL SCAN */}
              <Frame accent={RED} glow>
                <div style={{ background: REDBG, margin: -14, padding: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <span style={{ fontSize: 12, letterSpacing: "0.24em", color: RED, fontWeight: 700 }}>POWER LEVEL SCAN</span>
                    <span className="blink" style={{ width: 7, height: 7, borderRadius: 99, background: RED, boxShadow: `0 0 10px ${RED}` }} />
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 6 }}>
                    <svg width="30" height="30" viewBox="0 0 30 30">
                      <circle cx="15" cy="15" r="12" fill="none" stroke={RED} strokeWidth="1.4" strokeDasharray="6 5" />
                      <line x1="15" y1="1" x2="15" y2="8" stroke={RED} strokeWidth="1.4" />
                      <line x1="15" y1="22" x2="15" y2="29" stroke={RED} strokeWidth="1.4" />
                      <line x1="1" y1="15" x2="8" y2="15" stroke={RED} strokeWidth="1.4" />
                      <line x1="22" y1="15" x2="29" y2="15" stroke={RED} strokeWidth="1.4" />
                    </svg>
                    <span style={{ fontFamily: "'Bungee', sans-serif", fontSize: "clamp(30px, 9vw, 44px)", color: "#FF6B72", textShadow: `0 0 22px ${RED}AA`, fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>
                      {scanPL.toLocaleString()}
                    </span>
                    <span style={{ marginLeft: "auto", border: `1.5px solid ${RED}`, color: RED, fontWeight: 700, fontSize: 13, padding: "4px 8px", clipPath: notch(4) }}>PL</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 40, marginTop: 12 }}>
                    {[...Array(24)].map((_, i) => (
                      <span key={i} className="barflick" style={{
                        flex: 1, height: `${28 + ((i * 31) % 70)}%`,
                        background: `linear-gradient(180deg, #FF6B72, ${RED})`,
                        boxShadow: `0 0 5px ${RED}66`, animationDelay: `${(i % 6) * 0.14}s`,
                      }} />
                    ))}
                  </div>
                  <div style={{ textAlign: "right", fontSize: 10.5, letterSpacing: "0.2em", color: RED, fontWeight: 700, marginTop: 6 }}>
                    {selNode ? selNode.label.toUpperCase() : "MAX OUTPUT"}
                  </div>
                </div>
              </Frame>

              {/* ENERGY READING */}
              <Frame accent={RED}>
                <div style={{ background: REDBG, margin: -14, padding: 14, display: "flex", alignItems: "center", gap: 12 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24"><path d="M13 2 L5 14 H11 L9 22 L19 9 H13 Z" fill={RED} /></svg>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11.5, letterSpacing: "0.22em", color: RED, fontWeight: 700 }}>ENERGY READING</div>
                    <div style={{ display: "flex", gap: 3, marginTop: 7 }}>
                      {[...Array(14)].map((_, i) => (
                        <span key={i} style={{
                          flex: 1, height: 11,
                          background: i < 11 ? RED : "#2A1520",
                          boxShadow: i < 11 ? `0 0 5px ${RED}88` : "none",
                        }} />
                      ))}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontFamily: "'Bungee', sans-serif", fontSize: 20, color: "#FF6B72" }}>78%</div>
                    <div style={{ fontSize: 10, letterSpacing: "0.18em", color: RED, fontWeight: 700 }}>STABLE</div>
                  </div>
                </div>
              </Frame>

              {/* RADAR */}
              <Frame accent={RED}>
                <div style={{ background: REDBG, margin: -14, padding: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10.5, letterSpacing: "0.14em", fontWeight: 700 }}>
                    <span style={{ color: MUTE }}>TARGET<br /><span style={{ color: RED }}>MULTIPLE</span></span>
                    <span style={{ color: MUTE, textAlign: "right" }}>DISTANCE<br /><span style={{ color: RED }}>12.4KM</span></span>
                  </div>
                  <div style={{ position: "relative", width: "min(62vw, 250px)", aspectRatio: "1", margin: "8px auto" }}>
                    <svg viewBox="0 0 100 100" style={{ width: "100%", height: "100%" }}>
                      <circle cx="50" cy="50" r="47" fill="none" stroke={RED + "77"} strokeWidth="1" />
                      <circle cx="50" cy="50" r="33" fill="none" stroke={RED + "44"} strokeWidth="0.7" />
                      <circle cx="50" cy="50" r="18" fill="none" stroke={RED + "44"} strokeWidth="0.7" />
                      <line x1="3" y1="50" x2="97" y2="50" stroke={RED + "33"} strokeWidth="0.6" />
                      <line x1="50" y1="3" x2="50" y2="97" stroke={RED + "33"} strokeWidth="0.6" />
                      <path d="M46 46 L54 46 L50 55 Z" fill={RED} />
                      {[[30, 34], [68, 28], [62, 62], [26, 66], [58, 44], [40, 58]].map(([x, y], i) => (
                        <circle key={i} cx={x} cy={y} r="1.8" fill="#FF6B72" className="blink" style={{ animationDelay: `${i * 0.3}s` }} />
                      ))}
                      {/* corner brackets */}
                      {[[6, 6, 1, 1], [94, 6, -1, 1], [94, 94, -1, -1], [6, 94, 1, -1]].map(([x, y, sx, sy], i) => (
                        <path key={i} d={`M${x} ${y + sy * 10} L${x} ${y} L${x + sx * 10} ${y}`} fill="none" stroke={RED} strokeWidth="1.2" />
                      ))}
                    </svg>
                    <div className="sweep" style={{
                      position: "absolute", inset: "6%", borderRadius: "50%",
                      background: `conic-gradient(from 0deg, ${RED}66 0deg, transparent 65deg)`,
                      maskImage: "radial-gradient(circle, black 96%, transparent 97%)",
                      WebkitMaskImage: "radial-gradient(circle, black 96%, transparent 97%)",
                    }} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10.5, letterSpacing: "0.14em", fontWeight: 700 }}>
                    <span style={{ color: MUTE }}>SIGNATURE<br /><span style={{ color: RED }}>KI: HIGH</span></span>
                    <span style={{ color: MUTE, textAlign: "right" }}>THREAT LVL<br /><span style={{ color: RED }}>7 · ELEVATED</span></span>
                  </div>
                </div>
              </Frame>
            </>
          )}

          {/* FOLDERS */}
          <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
            {FOLDERS.map((f) => {
              const off = hidden[f.id];
              const hot = f.id === "unsorted";
              return (
                <Frame key={f.id} accent={off ? "#2A3050" : hot ? RED : f.id === "projects" ? "#4D6BFF" : GOLDD} glow={!off && (hot || f.id === "projects")} pad={0}>
                  <button onClick={() => setHidden((h) => ({ ...h, [f.id]: !h[f.id] }))}
                    style={{
                      display: "flex", alignItems: "center", gap: 12, width: "100%",
                      background: "none", border: "none", color: off ? "#3D4560" : WHITE,
                      padding: "12px 14px", textAlign: "left",
                    }}>
                    <span style={{ opacity: off ? 0.3 : 1, display: "flex", filter: off ? "none" : `drop-shadow(0 0 6px ${f.color}99)` }}>
                      <FolderGlyph kind={f.id} color={f.color} />
                    </span>
                    <span style={{ fontFamily: "'Bungee', sans-serif", fontSize: 13.5, letterSpacing: "0.02em" }}>{f.label}</span>
                    <span style={{ fontSize: 13, color: off ? "#3D4560" : "#9AA6C8" }}>— {f.sub}</span>
                    <span style={{ marginLeft: "auto", fontSize: 14, fontWeight: 700, color: off ? "#3D4560" : "#5F7BFF" }}>{f.count}</span>
                  </button>
                </Frame>
              );
            })}
          </div>

          {/* BATTLE LOG */}
          <div style={{ padding: "2px 6px" }}>
            <div style={{ fontSize: 11, letterSpacing: "0.3em", color: MUTE, fontWeight: 700, marginBottom: 8 }}>BATTLE LOG</div>
            {AGENT_FEED.map((a, i) => (
              <div key={i} style={{ display: "flex", gap: 9, padding: "6px 0", fontSize: 13, alignItems: "baseline", borderBottom: i < AGENT_FEED.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
                <span className="blink" style={{ width: 7, height: 7, borderRadius: 99, background: GOLD, boxShadow: `0 0 7px ${GOLD}`, flexShrink: 0, alignSelf: "center", animationDelay: `${i * 0.4}s` }} />
                <span style={{ color: GOLD, fontWeight: 700, letterSpacing: "0.04em", flexShrink: 0 }}>{a.agent}</span>
                <span style={{ color: "#8B98C4", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.action}</span>
                <span style={{ marginLeft: "auto", color: MUTE, flexShrink: 0 }}>{a.t}</span>
              </div>
            ))}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, fontSize: 12.5, fontWeight: 700, letterSpacing: "0.08em" }}>
              <span className="blink" style={{ width: 8, height: 8, borderRadius: 99, background: GREEN, boxShadow: `0 0 9px ${GREEN}` }} />
              <span style={{ color: GREEN }}>VAULT SYNCED</span>
              <span style={{ color: "#8B98C4" }}>· memory-bank/ · git</span>
            </div>
            <div style={{ fontSize: 11.5, letterSpacing: "0.24em", color: MUTE, marginTop: 7, fontWeight: 700 }}>
              378 NOTES · 3 AGENTS CONNECTED
            </div>
          </div>
        </div>
      </Frame>
    </div>
  );
}

// compact graph pane for the GRAPH view toggle
function GraphPane({ graphRef, hidden, selected, setSelected }) {
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  const viewRef = useRef({ x: 0, y: 0, k: 1 });
  const dragRef = useRef(null);
  const pulseRef = useRef(0);
  const selRef = useRef(selected);
  useEffect(() => { selRef.current = selected; }, [selected]);

  useEffect(() => {
    const { nodes, edges } = graphRef.current;
    if (nodes[0].x == null) {
      const W = 1200, H = 1200;
      nodes.forEach((n) => { n.x = W / 2 + (Math.random() - 0.5) * W * 0.8; n.y = H / 2 + (Math.random() - 0.5) * H * 0.8; n.vx = 0; n.vy = 0; });
      for (let it = 0; it < 160; it++) {
        const cell = 60, grid = new Map();
        nodes.forEach((n) => { const k = ((n.x / cell) | 0) + "," + ((n.y / cell) | 0); if (!grid.has(k)) grid.set(k, []); grid.get(k).push(n); });
        nodes.forEach((n) => {
          const cx = (n.x / cell) | 0, cy = (n.y / cell) | 0;
          for (let gx = cx - 1; gx <= cx + 1; gx++) for (let gy = cy - 1; gy <= cy + 1; gy++) {
            const b = grid.get(gx + "," + gy); if (!b) continue;
            b.forEach((m) => {
              if (m === n) return;
              let dx = n.x - m.x, dy = n.y - m.y, d2 = dx * dx + dy * dy;
              if (d2 < 1) d2 = 1; if (d2 > 3600) return;
              const f = 220 / d2, d = Math.sqrt(d2);
              n.vx += (dx / d) * f; n.vy += (dy / d) * f;
            });
          }
        });
        edges.forEach(([a, b]) => {
          const na = nodes[a], nb = nodes[b];
          const dx = nb.x - na.x, dy = nb.y - na.y, d = Math.sqrt(dx * dx + dy * dy) || 1;
          const f = (d - 55) * 0.02;
          na.vx += (dx / d) * f; na.vy += (dy / d) * f;
          nb.vx -= (dx / d) * f; nb.vy -= (dy / d) * f;
        });
        nodes.forEach((n) => {
          n.vx += (600 - n.x) * 0.0015; n.vy += (600 - n.y) * 0.0015;
          n.vx *= 0.6; n.vy *= 0.6; n.x += n.vx; n.y += n.vy;
        });
      }
    }
    let raf;
    const loop = () => { pulseRef.current += 0.06; draw(); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current, wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const dpr = window.devicePixelRatio || 1;
    const w = wrap.clientWidth, h = wrap.clientHeight;
    if (canvas.width !== w * dpr) { canvas.width = w * dpr; canvas.style.width = w + "px"; }
    if (canvas.height !== h * dpr) { canvas.height = h * dpr; canvas.style.height = h + "px"; }
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = NAVY;
    ctx.fillRect(0, 0, w, h);
    const { nodes, edges } = graphRef.current;
    const view = viewRef.current;
    if (!view.init) {
      const xs = nodes.map((n) => n.x), ys = nodes.map((n) => n.y);
      const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
      const k = Math.min(w / (maxX - minX + 100), h / (maxY - minY + 100));
      view.k = k; view.x = w / 2 - ((minX + maxX) / 2) * k; view.y = h / 2 - ((minY + maxY) / 2) * k; view.init = true;
    }
    ctx.save(); ctx.translate(view.x, view.y); ctx.scale(view.k, view.k);
    const t = pulseRef.current;
    const vis = (n) => !hidden[n.folder];
    ctx.strokeStyle = "rgba(77,107,255,0.14)"; ctx.lineWidth = 0.6 / view.k; ctx.beginPath();
    edges.forEach(([a, b]) => { const na = nodes[a], nb = nodes[b]; if (!vis(na) || !vis(nb)) return; ctx.moveTo(na.x, na.y); ctx.lineTo(nb.x, nb.y); });
    ctx.stroke();
    nodes.forEach((n) => {
      if (!vis(n)) return;
      const hot = selRef.current === n.id;
      if (hot) {
        [{ len: 5.5, c: GOLD + "33" }, { len: 4, c: GOLD + "77" }, { len: 2.6, c: "#FFF3C4CC" }].forEach((L, li) => {
          ctx.beginPath();
          const S = n.spikes || 10, base = n.r * 2.2;
          for (let i = 0; i <= S * 2; i++) {
            const ang = (i / (S * 2)) * Math.PI * 2 - Math.PI / 2;
            const flick = Math.sin(t * 3 + n.seed + i * 1.7) * 0.35;
            const rad = i % 2 === 0 ? base * L.len * (1 + flick) : base * (1.1 + li * 0.2);
            const x = n.x + Math.cos(ang) * rad, y = n.y + Math.sin(ang) * rad * 1.15;
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
          }
          ctx.closePath(); ctx.fillStyle = L.c; ctx.fill();
        });
      }
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r * (hot ? 1.5 : 1), 0, Math.PI * 2);
      ctx.fillStyle = hot ? "#FFF" : n.color + (n.hub ? "" : "CC");
      ctx.fill();
      if (n.label && (hot || (n.hub && view.k > 0.9))) {
        ctx.font = `600 ${11 / view.k}px sans-serif`;
        ctx.fillStyle = hot ? GOLD : "rgba(220,230,255,0.6)";
        ctx.textAlign = "center";
        ctx.fillText(n.label.toUpperCase(), n.x, n.y + n.r + 20 / view.k);
      }
    });
    ctx.restore();
  }, [hidden]);

  const getPos = (e) => {
    const r = canvasRef.current.getBoundingClientRect();
    const t = e.touches ? e.touches[0] : e;
    return { x: t.clientX - r.left, y: t.clientY - r.top };
  };
  const toWorld = (px, py) => { const v = viewRef.current; return { x: (px - v.x) / v.k, y: (py - v.y) / v.k }; };
  const onDown = (e) => { const p = getPos(e); dragRef.current = { ...p, moved: false, vx: viewRef.current.x, vy: viewRef.current.y }; };
  const onMove = (e) => {
    if (!dragRef.current) return;
    const p = getPos(e), d = dragRef.current;
    if (Math.hypot(p.x - d.x, p.y - d.y) > 4) d.moved = true;
    if (d.moved) { viewRef.current.x = d.vx + (p.x - d.x); viewRef.current.y = d.vy + (p.y - d.y); }
  };
  const onUp = (e) => {
    const d = dragRef.current; dragRef.current = null;
    if (d && !d.moved) {
      const r = canvasRef.current.getBoundingClientRect();
      const t = e.changedTouches ? e.changedTouches[0] : e;
      const p = toWorld(t.clientX - r.left, t.clientY - r.top);
      const { nodes } = graphRef.current;
      let best = null, bd = 14 / viewRef.current.k;
      nodes.forEach((n) => {
        if (hidden[n.folder]) return;
        const dd = Math.hypot(n.x - p.x, n.y - p.y);
        if (dd < Math.max(n.r + 4, bd) && (!best || dd < bd)) { best = n; bd = dd; }
      });
      setSelected(best && best.label ? best.id : null);
    }
  };
  const onWheel = (e) => {
    e.preventDefault();
    const p = getPos(e), v = viewRef.current;
    const k2 = Math.max(0.2, Math.min(4, v.k * (e.deltaY < 0 ? 1.12 : 0.89)));
    const wpt = toWorld(p.x, p.y);
    v.k = k2; v.x = p.x - wpt.x * k2; v.y = p.y - wpt.y * k2;
  };

  return (
    <Frame accent={GOLDD} pad={0}>
      <div ref={wrapRef} style={{ height: "min(58vh, 480px)", position: "relative" }}>
        <canvas ref={canvasRef}
          onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp}
          onMouseLeave={() => (dragRef.current = null)}
          onTouchStart={onDown} onTouchMove={onMove} onTouchEnd={onUp}
          onWheel={onWheel}
          style={{ display: "block", touchAction: "none", cursor: "grab" }} />
        <div style={{ position: "absolute", top: 8, left: 10, fontSize: 10, letterSpacing: "0.16em", color: MUTE, fontWeight: 700, pointerEvents: "none" }}>
          SCROLL = ZOOM · DRAG = PAN · TAP = SCAN
        </div>
      </div>
    </Frame>
  );
}

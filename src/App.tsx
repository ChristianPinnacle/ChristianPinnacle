import { useEffect, useRef, useState } from 'react';
import { trpc } from './trpc';
import { GraphCanvas } from './components/GraphCanvas';
import { GraphLegend } from './components/GraphLegend';
import { NoteEditor, type NoteFormData } from './components/NoteEditor';

/* ── types ── */
interface VaultNote {
  path: string;
  title: string;
  folder: string;
  plScore?: number;
}
interface VaultMeta {
  path: string;
  title: string;
  folder: string;
  source: string;
  updated: string;
  plScore: number;
}
interface GraphData {
  nodes: Array<{ id: string; title: string; folder: string; plScore: number }>;
  edges: Array<{ source: string; target: string }>;
}
type View = 'hud' | 'graph' | 'notes';
type EditorMode = { mode: 'create' } | { mode: 'edit'; notePath: string };

const SERVER = import.meta.env.VITE_SERVER_URL ?? 'http://localhost:3001';

/* ── folder config ── */
const FOLDERS = [
  { key: 'projects',  rank: 'ELITE',        label: 'Current Projects', icon: '✦' },
  { key: 'areas',     rank: 'ROYAL',        label: 'Areas',            icon: '♛' },
  { key: 'resources', rank: 'CAPSULE',      label: 'Resources',        icon: '⬡' },
  { key: 'warroom',   rank: 'WAR ROOM',     label: 'Decisions',        icon: '⊕' },
  { key: 'archive',   rank: 'GRAVEYARD',    label: 'Archive',          icon: '✙' },
  { key: 'unsorted',  rank: 'SCOUTER ERROR',label: 'Unsorted',         icon: '⚡', error: true },
] as const;

const FOLDER_COLORS: Record<string, string> = {
  projects:  '#3C58D6',
  areas:     '#F5C542',
  resources: '#EDF1FA',
  warroom:   '#9AAFFF',
  archive:   '#556080',
  unsorted:  '#FF4D4D',
};

/* ── relative time ── */
function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr + 'T00:00:00Z').getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 2) return 'just now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

const SOURCE_LABELS: Record<string, string> = {
  manus: 'MANUS', 'claude-code': 'CLAUDE CODE', candice: 'CANDICE', import: 'IMPORT',
};

export function App() {
  const [notes, setNotes]           = useState<VaultNote[]>([]);
  const [meta, setMeta]             = useState<VaultMeta[]>([]);
  const [graph, setGraph]           = useState<GraphData | null>(null);
  const [view, setView]             = useState<View>('hud');
  const [editor, setEditor]         = useState<EditorMode | null>(null);
  const [selectedNote, setSelected] = useState<{ title: string; content: string } | null>(null);
  const [portraitUrl, setPortrait]  = useState<string | null>(null);
  const [scanning, setScanning]     = useState(false);
  const [plDisplay, setPlDisplay]   = useState(0);
  const [activeFolder, setFolder]   = useState<string | null>(null);
  const [chatDraft, setChatDraft]   = useState('');
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const scanRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reload = async () => {
    const [vaultNotes, vaultMeta, graphData] = await Promise.all([
      trpc.vault.list.query(),
      trpc.vault.meta.query(),
      trpc.graph.get.query(),
    ]);
    setNotes(vaultNotes);
    setMeta(vaultMeta);
    setGraph(graphData);
    const top = [...vaultMeta].sort((a, b) => b.plScore - a.plScore)[0];
    setPlDisplay(top?.plScore ?? 0);
  };

  useEffect(() => {
    reload()
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to connect'))
      .finally(() => setLoading(false));

    fetch(`${SERVER}/assets/portrait`)
      .then((r) => { if (r.ok) setPortrait(`${SERVER}/assets/portrait?t=${Date.now()}`); })
      .catch(() => null);
  }, []);

  /* portrait upload */
  const uploadPortrait = async (file: File) => {
    const res = await fetch(`${SERVER}/assets/portrait`, {
      method: 'POST',
      headers: { 'Content-Type': file.type, 'Content-Length': String(file.size) },
      body: file,
    });
    if (res.ok) setPortrait(`${SERVER}/assets/portrait?t=${Date.now()}`);
  };

  /* PL scan animation */
  const runScan = () => {
    setScanning(true);
    if (scanRef.current) clearTimeout(scanRef.current);
    scanRef.current = setTimeout(() => setScanning(false), 1800);
  };

  /* note tap */
  const openNote = async (notePath: string) => {
    const note = notes.find((n) => n.path === notePath);
    if (!note) return;
    try {
      const { content } = await trpc.vault.get.query({ path: notePath });
      setSelected({ title: note.title, content });
    } catch {
      setSelected({ title: note.title, content: '(Could not load)' });
    }
  };

  /* CRUD */
  const handleCreate = async (data: NoteFormData) => {
    await trpc.vault.create.mutate(data);
    await reload(); setEditor(null);
  };
  const handleUpdate = async (p: string, data: NoteFormData) => {
    await trpc.vault.update.mutate({ path: p, ...data });
    await reload(); setEditor(null); setSelected(null);
  };
  const handleDelete = async (p: string) => {
    await trpc.vault.delete.mutate({ path: p });
    await reload(); setEditor(null); setSelected(null);
  };

  /* derived */
  const topMeta   = [...meta].sort((a, b) => b.plScore - a.plScore)[0];
  const topPL     = topMeta?.plScore ?? 0;
  const totalPL   = meta.reduce((s, n) => s + n.plScore, 0);
  const plLabel   = totalPL >= 1_000_000
    ? `${(totalPL / 1_000_000).toFixed(1)}M`
    : totalPL >= 1000
    ? `${Math.round(totalPL / 1000)}K`
    : String(totalPL);

  const counts = new Map<string, number>();
  for (const n of notes) counts.set(n.folder, (counts.get(n.folder) ?? 0) + 1);

  const agentEntries = meta.filter((n) => n.source !== 'user');
  const linkCount   = graph?.edges.length ?? 0;
  const density     = notes.length > 0 ? Math.min(1, linkCount / (notes.length * 2)) : 0;
  const energyPct   = Math.round(density * 100);
  const energyLabel = density > 0.7 ? 'CRITICAL' : density > 0.4 ? 'ELEVATED' : density > 0.1 ? 'STABLE' : 'LOW';

  /* PL bar chart — 16 bars, normalised to topPL */
  const plBars = Array.from({ length: 16 }, (_, i) => {
    const t = i / 15;
    return Math.max(0.08, t * t);
  });

  /* energy bar — 12 segments */
  const energySegs = Array.from({ length: 12 }, (_, i) => i < Math.round(energyPct / 100 * 12));

  /* radar distance based on note count */
  const radarDist  = (5 + notes.length * 0.6).toFixed(1);
  const threatLvl  = Math.min(9, Math.floor(linkCount / 2) + 1);
  const kiLevel    = threatLvl >= 6 ? 'CRITICAL' : threatLvl >= 3 ? 'HIGH' : 'NORMAL';

  return (
    <div className="sa-root">
      {/* ── TOP HEADER ── */}
      <header className="sa-header">
        <div className="sa-logo">
          <span className="sa-logo-icon">⚔</span>
          <div className="sa-logo-text">
            <span className="sa-logo-main">SAIYAN</span>
            <span className="sa-logo-main">ARCHIVE</span>
          </div>
        </div>
        <div className="sa-header-right">
          <button className={`sa-tab ${view === 'graph' ? 'sa-tab-on' : ''}`} onClick={() => setView(view === 'graph' ? 'hud' : 'graph')}>GRAPH</button>
          <button className={`sa-tab ${view === 'notes' ? 'sa-tab-on' : ''}`} onClick={() => setView(view === 'notes' ? 'hud' : 'notes')}>SCROLL</button>
          <button className="sa-tab" onClick={() => setEditor({ mode: 'create' })}>＋</button>
        </div>
      </header>

      <div className="sa-subtitle">PRINCE OF ALL NOTES · PL {plLabel}</div>

      {loading && <p className="sa-loading">Powering up scouter…</p>}
      {error   && <p className="sa-error">SCOUTER ERROR: {error}</p>}

      {/* ── EDITOR OVERLAY ── */}
      {editor && (
        <div className="sa-overlay">
          {editor.mode === 'create'
            ? <NoteEditor onSave={handleCreate} onCancel={() => setEditor(null)} />
            : <NoteEditor
                notePath={editor.notePath}
                initial={(() => { const n = notes.find((x) => x.path === editor.notePath); return n ? { title: n.title, folder: n.folder as NoteFormData['folder'] } : undefined; })()}
                onSave={(d) => handleUpdate(editor.notePath, d)}
                onDelete={() => handleDelete(editor.notePath)}
                onCancel={() => setEditor(null)}
              />
          }
        </div>
      )}

      {/* ── NOTE READER OVERLAY ── */}
      {selectedNote && !editor && (
        <div className="sa-overlay">
          <div className="note-panel">
            <div className="note-panel-header">
              <span className="note-panel-title">{selectedNote.title}</span>
              <button className="edit-btn" onClick={() => { const n = notes.find((x) => x.title === selectedNote.title); if (n) setEditor({ mode: 'edit', notePath: n.path }); }}>✎</button>
              <button className="close-btn" onClick={() => setSelected(null)}>✕</button>
            </div>
            <pre className="note-content">{selectedNote.content}</pre>
          </div>
        </div>
      )}

      {/* ── GRAPH VIEW ── */}
      {view === 'graph' && graph && !loading && (
        <div className="sa-graph-view">
          <GraphLegend />
          <div className="graph-wrap">
            <GraphCanvas nodes={graph.nodes} edges={graph.edges} onNodeTap={(id) => void openNote(id)} />
          </div>
          <p className="graph-hint">Pinch to zoom · drag to pan · tap dot to read</p>
        </div>
      )}

      {/* ── NOTES LIST VIEW ── */}
      {view === 'notes' && !loading && (
        <div className="sa-notes-view">
          {notes.map((note) => (
            <div key={note.path} className="sa-note-row" onClick={() => void openNote(note.path)}>
              <span className="sa-note-folder" style={{ color: FOLDER_COLORS[note.folder] ?? '#fff' }}>{note.folder}</span>
              <span className="sa-note-title">{note.title}</span>
              {typeof note.plScore === 'number' && <span className="sa-note-pl">PL {note.plScore.toLocaleString()}</span>}
            </div>
          ))}
        </div>
      )}

      {/* ── MAIN HUD ── */}
      {view === 'hud' && !loading && !editor && (
        <div className="sa-hud">

          {/* LEFT COLUMN */}
          <div className="sa-left">
            {FOLDERS.map(({ key, rank, label, icon, error: isError }) => {
              const count = counts.get(key) ?? 0;
              const color = FOLDER_COLORS[key] ?? '#fff';
              return (
                <button
                  key={key}
                  className={`sa-folder-row ${activeFolder === key ? 'sa-folder-active' : ''} ${isError ? 'sa-folder-error' : ''}`}
                  style={{ '--fc': color } as React.CSSProperties}
                  onClick={() => setFolder((prev) => prev === key ? null : key)}
                >
                  <span className="sa-folder-icon" style={{ color }}>{icon}</span>
                  <div className="sa-folder-info">
                    <span className="sa-folder-rank" style={{ color }}>{rank}</span>
                    <span className="sa-folder-label">{label}</span>
                  </div>
                  <span className="sa-folder-count" style={{ color }}>{count}</span>
                </button>
              );
            })}

            {/* BATTLE LOG */}
            <div className="sa-battle-log">
              <div className="sa-battle-title">BATTLE LOG</div>
              {agentEntries.length === 0
                ? <div className="sa-battle-empty">No agent entries yet.</div>
                : agentEntries.slice(0, 5).map((e, i) => (
                    <div key={i} className="sa-battle-row">
                      <span className="sa-battle-source">{SOURCE_LABELS[e.source] ?? e.source}</span>
                      <span className="sa-battle-title-text">{e.title.slice(0, 18)}{e.title.length > 18 ? '…' : ''}</span>
                      <span className="sa-battle-time">{relativeTime(e.updated)}</span>
                    </div>
                  ))
              }
            </div>

            <div className="sa-footer">{notes.length} NOTES · {agentEntries.length} AGENTS CONNECTED</div>
          </div>

          {/* RIGHT COLUMN */}
          <div className="sa-right">
            {/* Portrait */}
            <div className="sa-portrait" onClick={() => { const el = document.createElement('input'); el.type = 'file'; el.accept = 'image/*'; el.onchange = (ev) => { const f = (ev.target as HTMLInputElement).files?.[0]; if (f) void uploadPortrait(f); }; el.click(); }}>
              {portraitUrl
                ? <img src={portraitUrl} alt="Portrait" className="sa-portrait-img" />
                : <div className="sa-portrait-placeholder">
                    <div className="sa-portrait-city">
                      {Array.from({ length: 12 }, (_, i) => (
                        <div key={i} className="sa-city-bar" style={{ height: `${20 + Math.sin(i * 1.3) * 18 + Math.sin(i * 0.7) * 12}%`, width: '6%' }} />
                      ))}
                    </div>
                    <span className="sa-portrait-label">YOUR ART</span>
                  </div>
              }
            </div>

            {/* PL Scan */}
            <div className="sa-pl-card" onClick={runScan}>
              <div className="sa-pl-header">
                <span className="sa-pl-label">POWER LEVEL SCAN</span>
                <span className={`sa-pl-dot ${scanning ? 'sa-pl-dot-scan' : ''}`} />
              </div>
              <div className="sa-pl-row">
                <span className="sa-pl-icon">⊙</span>
                <span className={`sa-pl-number ${scanning ? 'sa-pl-flicker' : ''}`}>
                  {scanning ? '???,???' : topPL.toLocaleString()}
                </span>
                <span className="sa-pl-badge">PL</span>
              </div>
              <div className="sa-pl-bars">
                {plBars.map((h, i) => (
                  <div key={i} className={`sa-pl-bar ${scanning ? 'sa-pl-bar-scan' : ''}`} style={{ height: `${h * 100}%`, animationDelay: `${i * 0.04}s` }} />
                ))}
              </div>
              <div className="sa-pl-footer">MAX OUTPUT</div>
            </div>

            {/* Energy Reading */}
            <div className="sa-energy-card">
              <div className="sa-energy-header">
                <span className="sa-energy-icon">⚡</span>
                <span className="sa-energy-label">ENERGY READING</span>
                <span className="sa-energy-pct">{energyPct}%</span>
                <span className="sa-energy-status">{energyLabel}</span>
              </div>
              <div className="sa-energy-segs">
                {energySegs.map((on, i) => (
                  <div key={i} className={`sa-energy-seg ${on ? 'sa-energy-seg-on' : ''}`} />
                ))}
              </div>
            </div>

            {/* Radar */}
            <div className="sa-radar-card">
              <div className="sa-radar-meta">
                <div><span className="sa-radar-key">TARGET</span><span className="sa-radar-val">MULTIPLE</span></div>
                <div className="sa-radar-right"><span className="sa-radar-key">DISTANCE</span><span className="sa-radar-val">{radarDist}km</span></div>
              </div>
              <div className="sa-radar-scope">
                <svg viewBox="0 0 120 120" className="sa-radar-svg">
                  {[40, 28, 16].map((r) => <circle key={r} cx="60" cy="60" r={r} fill="none" stroke="rgba(255,77,77,0.2)" strokeWidth="0.8" />)}
                  <line x1="60" y1="20" x2="60" y2="100" stroke="rgba(255,77,77,0.15)" strokeWidth="0.6" />
                  <line x1="20" y1="60" x2="100" y2="60" stroke="rgba(255,77,77,0.15)" strokeWidth="0.6" />
                  {/* sweep line */}
                  <line x1="60" y1="60" x2="100" y2="60" stroke="rgba(255,77,77,0.5)" strokeWidth="1" className="sa-radar-sweep" />
                  {/* target dots from graph nodes */}
                  {graph?.nodes.slice(0, 5).map((node, i) => {
                    const angle = (i / 5) * Math.PI * 2;
                    const dist = 12 + (i % 3) * 10;
                    return <circle key={node.id} cx={60 + Math.cos(angle) * dist} cy={60 + Math.sin(angle) * dist} r="2.5" fill="#FF4D4D" opacity="0.85" />;
                  })}
                  {/* centre reticle */}
                  <polygon points="60,52 64,60 60,68 56,60" fill="none" stroke="#FF4D4D" strokeWidth="1" />
                </svg>
              </div>
              <div className="sa-radar-meta sa-radar-bottom">
                <div><span className="sa-radar-key">SIGNATURE</span><span className="sa-radar-val sa-radar-ki">KI: {kiLevel}</span></div>
                <div className="sa-radar-right"><span className="sa-radar-key">THREAT LVL</span><span className="sa-radar-val sa-radar-threat">{threatLvl} {threatLvl >= 6 ? 'ELEVATED' : 'STABLE'}</span></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── FOLDER DRILL-DOWN ── */}
      {activeFolder && view === 'hud' && !editor && (
        <div className="sa-folder-notes">
          <div className="sa-folder-notes-header">
            <span>{activeFolder.toUpperCase()}</span>
            <button className="close-btn" onClick={() => setFolder(null)}>✕</button>
          </div>
          {notes.filter((n) => n.folder === activeFolder).map((note) => (
            <div key={note.path} className="sa-note-row" onClick={() => void openNote(note.path)}>
              <span className="sa-note-title">{note.title}</span>
              {typeof note.plScore === 'number' && <span className="sa-note-pl">PL {note.plScore.toLocaleString()}</span>}
            </div>
          ))}
        </div>
      )}

      {/* ── BOTTOM CHAT BAR ── */}
      <div className="sa-chat-bar">
        <button className="sa-chat-plus" onClick={() => setEditor({ mode: 'create' })}>＋</button>
        <input
          className="sa-chat-input"
          placeholder="REPLY TO CLAUDE…"
          value={chatDraft}
          onChange={(e) => setChatDraft(e.target.value)}
          readOnly
          title="AI chat coming in Phase 2"
        />
        <div className="sa-chat-model">FABLE 5 <span className="sa-chat-model-tier">MEDIUM</span></div>
        <button className="sa-chat-mic" title="Voice — Phase 2">🎤</button>
        <button className="sa-chat-wave" title="Audio — Phase 2">〜</button>
      </div>
    </div>
  );
}

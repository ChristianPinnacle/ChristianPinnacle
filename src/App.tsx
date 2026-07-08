import { useEffect, useRef, useState } from 'react';
import { trpc } from './trpc';
import { GraphCanvas } from './components/GraphCanvas';
import { GraphLegend } from './components/GraphLegend';
import { PortraitSlot } from './components/PortraitSlot';
import { PlScanner } from './components/PlScanner';
import { EnergyReading } from './components/EnergyReading';
import { RadarChart } from './components/RadarChart';
import { FolderCards } from './components/FolderCards';
import { BattleLog } from './components/BattleLog';

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

type View = 'hud' | 'graph' | 'list';

const SERVER = import.meta.env.VITE_SERVER_URL ?? 'http://localhost:3001';

export function App() {
  const [notes, setNotes] = useState<VaultNote[]>([]);
  const [meta, setMeta] = useState<VaultMeta[]>([]);
  const [graph, setGraph] = useState<GraphData | null>(null);
  const [view, setView] = useState<View>('hud');
  const [selectedNote, setSelectedNote] = useState<{ title: string; content: string } | null>(null);
  const [portraitUrl, setPortraitUrl] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeFolder, setActiveFolder] = useState<string | null>(null);
  const scanTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [vaultNotes, vaultMeta, graphData] = await Promise.all([
          trpc.vault.list.query(),
          trpc.vault.meta.query(),
          trpc.graph.get.query(),
        ]);
        setNotes(vaultNotes);
        setMeta(vaultMeta);
        setGraph(graphData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to connect');
      } finally {
        setLoading(false);
      }
    }
    void load();

    // check if portrait exists
    fetch(`${SERVER}/assets/portrait`)
      .then((r) => {
        if (r.ok) setPortraitUrl(`${SERVER}/assets/portrait?t=${Date.now()}`);
      })
      .catch(() => null);
  }, []);

  const handlePortraitUpload = async (file: File) => {
    const res = await fetch(`${SERVER}/assets/portrait`, {
      method: 'POST',
      headers: { 'Content-Type': file.type, 'Content-Length': String(file.size) },
      body: file,
    });
    if (res.ok) {
      setPortraitUrl(`${SERVER}/assets/portrait?t=${Date.now()}`);
    }
  };

  const handleNodeTap = async (nodeId: string) => {
    const note = notes.find((n) => n.path === nodeId);
    if (!note) return;
    try {
      const { content } = await trpc.vault.get.query({ path: nodeId });
      setSelectedNote({ title: note.title, content });
    } catch {
      setSelectedNote({ title: note.title, content: '(Could not load note content)' });
    }
  };

  const handlePlScan = () => {
    setScanning(true);
    if (scanTimerRef.current) clearTimeout(scanTimerRef.current);
    scanTimerRef.current = setTimeout(() => setScanning(false), 1800);
  };

  const topNote = [...meta].sort((a, b) => b.plScore - a.plScore)[0];
  const filteredNotes = activeFolder ? notes.filter((n) => n.folder === activeFolder) : notes;

  return (
    <div className="app">
      <header className="header">
        <h1 className="title">SAIYAN ARCHIVE</h1>
        <div className="tab-bar">
          <button className={`tab ${view === 'hud' ? 'tab-active' : ''}`} onClick={() => setView('hud')}>HUD</button>
          <button className={`tab ${view === 'graph' ? 'tab-active' : ''}`} onClick={() => setView('graph')}>GRAPH</button>
          <button className={`tab ${view === 'list' ? 'tab-active' : ''}`} onClick={() => setView('list')}>NOTES</button>
        </div>
      </header>

      <main className="main">
        {loading && <p className="status">Powering up scouter…</p>}
        {error && <p className="error">SCOUTER ERROR: {error}</p>}

        {selectedNote && (
          <div className="note-panel">
            <div className="note-panel-header">
              <span className="note-panel-title">{selectedNote.title}</span>
              <button className="close-btn" onClick={() => setSelectedNote(null)}>✕</button>
            </div>
            <pre className="note-content">{selectedNote.content}</pre>
          </div>
        )}

        {/* ── HUD VIEW ── */}
        {view === 'hud' && !loading && (
          <div className="hud">
            {/* Portrait + PL Scanner */}
            <div className="hud-top">
              <PortraitSlot portraitUrl={portraitUrl} onUpload={handlePortraitUpload} />
              <div className="hud-top-right">
                <button className="pl-scan-btn" onClick={handlePlScan}>POWER LEVEL SCAN</button>
                <PlScanner
                  topScore={topNote?.plScore ?? 0}
                  topTitle={topNote?.title ?? '—'}
                  scanning={scanning}
                />
              </div>
            </div>

            {/* Energy + Radar */}
            <div className="hud-mid">
              <EnergyReading noteCount={notes.length} linkCount={graph?.edges.length ?? 0} />
              {graph && <RadarChart nodes={graph.nodes} />}
            </div>

            {/* Folder cards */}
            <FolderCards
              notes={notes}
              onFolderTap={(folder) =>
                setActiveFolder((prev) => (prev === folder ? null : folder))
              }
            />

            {/* Active folder note list */}
            {activeFolder && (
              <div className="card">
                <h2 className="card-title">{activeFolder.toUpperCase()}</h2>
                <ul className="note-list">
                  {filteredNotes.map((note) => (
                    <li
                      key={note.path}
                      className="note-item clickable"
                      onClick={() => void handleNodeTap(note.path)}
                    >
                      <span className="note-title">{note.title}</span>
                      {typeof note.plScore === 'number' && (
                        <span className="pl-score">PL {note.plScore.toLocaleString()}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Battle log */}
            <BattleLog entries={meta} />
          </div>
        )}

        {/* ── GRAPH VIEW ── */}
        {view === 'graph' && graph && !loading && (
          <section className="graph-section">
            <GraphLegend />
            <div className="graph-wrap">
              <GraphCanvas nodes={graph.nodes} edges={graph.edges} onNodeTap={handleNodeTap} />
            </div>
            <p className="graph-hint">Pinch to zoom · drag to pan · tap a dot to read</p>
          </section>
        )}

        {/* ── LIST VIEW ── */}
        {view === 'list' && !loading && (
          <section className="card">
            <h2 className="card-title">VAULT NOTES</h2>
            <ul className="note-list">
              {notes.map((note) => (
                <li
                  key={note.path}
                  className="note-item clickable"
                  onClick={() => void handleNodeTap(note.path)}
                >
                  <span className="folder-tag">{note.folder}</span>
                  <span className="note-title">{note.title}</span>
                  {typeof note.plScore === 'number' && (
                    <span className="pl-score">PL {note.plScore.toLocaleString()}</span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </div>
  );
}

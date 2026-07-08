import { useEffect, useState } from 'react';
import { trpc } from './trpc';
import { GraphCanvas } from './components/GraphCanvas';
import { GraphLegend } from './components/GraphLegend';

interface HealthData {
  status: string;
  vaultNoteCount: number;
  indexedNoteCount: number | null;
  dbConfigured: boolean;
}

interface VaultNote {
  path: string;
  title: string;
  folder: string;
  plScore?: number;
}

interface GraphData {
  nodes: Array<{ id: string; title: string; folder: string; plScore: number }>;
  edges: Array<{ source: string; target: string }>;
}

type View = 'graph' | 'list';

export function App() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [notes, setNotes] = useState<VaultNote[]>([]);
  const [graph, setGraph] = useState<GraphData | null>(null);
  const [view, setView] = useState<View>('graph');
  const [selectedNote, setSelectedNote] = useState<{ title: string; content: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [healthData, vaultNotes, graphData] = await Promise.all([
          trpc.health.query(),
          trpc.vault.list.query(),
          trpc.graph.get.query(),
        ]);
        setHealth(healthData);
        setNotes(vaultNotes);
        setGraph(graphData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to connect to server');
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

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

  return (
    <div className="app">
      <header className="header">
        <h1 className="title">SAIYAN ARCHIVE</h1>
        <div className="tab-bar">
          <button
            className={`tab ${view === 'graph' ? 'tab-active' : ''}`}
            onClick={() => setView('graph')}
          >
            GRAPH
          </button>
          <button
            className={`tab ${view === 'list' ? 'tab-active' : ''}`}
            onClick={() => setView('list')}
          >
            NOTES
          </button>
        </div>
      </header>

      <main className="main">
        {loading && <p className="status">Powering up scouter…</p>}
        {error && <p className="error">SCOUTER ERROR: {error}</p>}

        {health && (
          <div className="status-bar">
            <span className="status-chip ok">{health.vaultNoteCount} NOTES</span>
            <span className="status-chip ok">
              {(graph?.edges.length ?? 0)} LINKS
            </span>
            <span className={`status-chip ${health.dbConfigured ? 'ok' : 'warn'}`}>
              DB {health.dbConfigured ? 'ON' : 'OFF'}
            </span>
          </div>
        )}

        {selectedNote && (
          <div className="note-panel">
            <div className="note-panel-header">
              <span className="note-panel-title">{selectedNote.title}</span>
              <button className="close-btn" onClick={() => setSelectedNote(null)}>✕</button>
            </div>
            <pre className="note-content">{selectedNote.content}</pre>
          </div>
        )}

        {view === 'graph' && graph && !loading && (
          <section className="graph-section">
            <GraphLegend />
            <div className="graph-wrap">
              <GraphCanvas
                nodes={graph.nodes}
                edges={graph.edges}
                onNodeTap={handleNodeTap}
              />
            </div>
            <p className="graph-hint">Pinch to zoom · drag to pan · tap a dot to read</p>
          </section>
        )}

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

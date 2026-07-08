import { useEffect, useState } from 'react';
import { trpc } from './trpc';

interface HealthData {
  status: string;
  vaultNoteCount: number;
  dbConfigured: boolean;
}

interface VaultNote {
  path: string;
  title: string;
  folder: string;
}

export function App() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [notes, setNotes] = useState<VaultNote[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [healthData, vaultNotes] = await Promise.all([
          trpc.health.query(),
          trpc.vault.list.query(),
        ]);
        setHealth(healthData);
        setNotes(vaultNotes);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to connect to server');
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, []);

  return (
    <div className="app">
      <header className="header">
        <h1 className="title">SAIYAN ARCHIVE</h1>
        <p className="subtitle">Vault + Graph — Phase 1 Scaffold</p>
      </header>

      <main className="main">
        {loading && <p className="status">Powering up scouter...</p>}
        {error && <p className="error">SCOUTER ERROR: {error}</p>}

        {health && (
          <section className="card">
            <h2 className="card-title">SYSTEM STATUS</h2>
            <ul className="status-list">
              <li>
                <span className="label">Server</span>
                <span className="value ok">{health.status.toUpperCase()}</span>
              </li>
              <li>
                <span className="label">Vault notes</span>
                <span className="value">{health.vaultNoteCount}</span>
              </li>
              <li>
                <span className="label">Database</span>
                <span className={`value ${health.dbConfigured ? 'ok' : 'warn'}`}>
                  {health.dbConfigured ? 'CONFIGURED' : 'NOT SET (OK FOR NOW)'}
                </span>
              </li>
            </ul>
          </section>
        )}

        {notes.length > 0 && (
          <section className="card">
            <h2 className="card-title">VAULT NOTES</h2>
            <ul className="note-list">
              {notes.map((note) => (
                <li key={note.path} className="note-item">
                  <span className="folder-tag">{note.folder}</span>
                  <span className="note-title">{note.title}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </div>
  );
}

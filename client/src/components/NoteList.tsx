import { trpc } from "../lib/trpc";
import { FOLDER_COLORS, FOLDER_LABELS } from "../theme";

type NoteListProps = {
  onOpen: (path: string) => void;
  onBack: () => void;
};

export default function NoteList({ onOpen, onBack }: NoteListProps) {
  const notes = trpc.vault.list.useQuery();

  return (
    <section className="note-screen">
      <div className="note-screen-header">
        <button type="button" className="ghost-btn" onClick={onBack}>
          ← BACK
        </button>
        <h2>VAULT NOTES</h2>
      </div>

      {notes.isLoading && <p className="status">Loading notes...</p>}
      {notes.error && <p className="status error">{notes.error.message}</p>}

      {notes.data && (
        <ul className="note-picker-list">
          {notes.data.map((note) => {
            const color = FOLDER_COLORS[note.folder] ?? FOLDER_COLORS.unsorted;
            const folderLabel = FOLDER_LABELS[note.folder] ?? note.folder;
            return (
              <li key={note.path}>
                <button type="button" className="note-picker-item" onClick={() => onOpen(note.path)}>
                  <span className="folder-dot" style={{ background: color }} />
                  <span className="note-picker-text">
                    <span className="note-picker-title">{note.title}</span>
                    <span className="note-picker-meta">
                      {folderLabel} · PL {note.plScore?.toLocaleString() ?? "—"}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

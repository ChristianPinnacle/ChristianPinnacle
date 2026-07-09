import Frame from "./Frame";
import { trpc } from "../lib/trpc";
import { FOLDER_LABELS } from "../theme";
import { renderMarkdownPreview } from "../lib/notes";

type NoteViewProps = {
  path: string;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

export default function NoteView({ path, onBack, onEdit, onDelete }: NoteViewProps) {
  const note = trpc.notes.get.useQuery({ path });

  return (
    <section className="note-screen">
      <div className="note-screen-header">
        <button type="button" className="ghost-btn" onClick={onBack}>
          ← BACK
        </button>
        <h2>{note.data?.title ?? "NOTE"}</h2>
      </div>

      {note.isLoading && <p className="status">Loading note...</p>}
      {note.error && <p className="status error">{note.error.message}</p>}

      {note.data && (
        <>
          <Frame accent="#4D6BFF">
            <div className="note-meta">
              <span>{FOLDER_LABELS[note.data.folder] ?? note.data.folder}</span>
              <span>PL from vault index on refresh</span>
              <span>Updated {note.data.updated}</span>
            </div>
            {note.data.summary && <p className="note-summary">{note.data.summary}</p>}
          </Frame>

          <Frame accent="#F5C542">
            <article
              className="note-preview note-preview-readonly"
              dangerouslySetInnerHTML={{ __html: renderMarkdownPreview(note.data.body) }}
            />
          </Frame>

          <div className="note-actions">
            <button type="button" className="primary-btn" onClick={onEdit}>
              EDIT
            </button>
            <button type="button" className="danger-btn" onClick={onDelete}>
              DELETE
            </button>
          </div>
        </>
      )}
    </section>
  );
}

import { useEffect, useState } from "react";
import Frame from "./Frame";
import { trpc } from "../lib/trpc";
import {
  formatTagsInput,
  parseTagsInput,
  renderMarkdownPreview,
  type NoteFolder,
  VALID_FOLDERS,
} from "../lib/notes";
import { FOLDER_LABELS } from "../theme";

type NoteEditorProps = {
  mode: "create" | "edit";
  path?: string;
  onSaved: (path: string) => void;
  onCancel: () => void;
};

export default function NoteEditor({ mode, path, onSaved, onCancel }: NoteEditorProps) {
  const utils = trpc.useUtils();
  const existing = trpc.notes.get.useQuery(
    { path: path ?? "" },
    { enabled: mode === "edit" && Boolean(path) },
  );

  const createNote = trpc.notes.create.useMutation({
    onSuccess: async (note) => {
      await invalidateAll(utils);
      onSaved(note.path);
    },
  });

  const updateNote = trpc.notes.update.useMutation({
    onSuccess: async (note) => {
      await invalidateAll(utils);
      onSaved(note.path);
    },
  });

  const [title, setTitle] = useState("");
  const [folder, setFolder] = useState<NoteFolder>("unsorted");
  const [summary, setSummary] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [body, setBody] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [loadedPath, setLoadedPath] = useState<string | null>(null);

  useEffect(() => {
    if (mode === "edit" && existing.data && existing.data.path !== loadedPath) {
      setTitle(existing.data.title);
      setFolder(existing.data.folder as NoteFolder);
      setSummary(existing.data.summary);
      setTagsInput(formatTagsInput(existing.data.tags));
      setBody(existing.data.body);
      setLoadedPath(existing.data.path);
    }
  }, [mode, existing.data, loadedPath]);

  const saving = createNote.isPending || updateNote.isPending;
  const error = createNote.error ?? updateNote.error ?? existing.error;

  const handleSave = (): void => {
    const payload = {
      title,
      folder,
      body,
      summary,
      tags: parseTagsInput(tagsInput),
    };

    if (mode === "create") {
      createNote.mutate(payload);
      return;
    }

    if (!path) return;
    updateNote.mutate({ path, ...payload });
  };

  return (
    <section className="note-screen">
      <div className="note-screen-header">
        <button type="button" className="ghost-btn" onClick={onCancel} disabled={saving}>
          ← CANCEL
        </button>
        <h2>{mode === "create" ? "NEW NOTE" : "EDIT NOTE"}</h2>
      </div>

      {mode === "edit" && existing.isLoading && <p className="status">Loading note...</p>}
      {error && <p className="status error">{error.message}</p>}

      {(mode === "create" || existing.data) && (
        <Frame accent="#F5C542">
          <div className="note-form">
            <label className="field">
              <span>Title</span>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Note title"
              />
            </label>

            <label className="field">
              <span>Folder</span>
              <select value={folder} onChange={(event) => setFolder(event.target.value as NoteFolder)}>
                {VALID_FOLDERS.map((folderId) => (
                  <option key={folderId} value={folderId}>
                    {FOLDER_LABELS[folderId]} ({folderId})
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Summary</span>
              <input
                value={summary}
                onChange={(event) => setSummary(event.target.value)}
                placeholder="One-line summary"
              />
            </label>

            <label className="field">
              <span>Tags (comma separated)</span>
              <input
                value={tagsInput}
                onChange={(event) => setTagsInput(event.target.value)}
                placeholder="marketing, vitaledge"
              />
            </label>

            <div className="editor-toggle">
              <button
                type="button"
                className={`ghost-btn${!showPreview ? " active" : ""}`}
                onClick={() => setShowPreview(false)}
              >
                WRITE
              </button>
              <button
                type="button"
                className={`ghost-btn${showPreview ? " active" : ""}`}
                onClick={() => setShowPreview(true)}
              >
                PREVIEW
              </button>
            </div>

            {showPreview ? (
              <article
                className="note-preview"
                dangerouslySetInnerHTML={{ __html: renderMarkdownPreview(body) }}
              />
            ) : (
              <label className="field">
                <span>Body (markdown)</span>
                <textarea
                  value={body}
                  onChange={(event) => setBody(event.target.value)}
                  rows={12}
                  placeholder="Write markdown. Use [[Note Title]] for links."
                />
              </label>
            )}

            <button type="button" className="primary-btn full-width" onClick={handleSave} disabled={saving}>
              {saving ? "SAVING..." : "SAVE NOTE"}
            </button>
          </div>
        </Frame>
      )}
    </section>
  );
}

async function invalidateAll(utils: ReturnType<typeof trpc.useUtils>): Promise<void> {
  await Promise.all([
    utils.vault.list.invalidate(),
    utils.graph.get.invalidate(),
    utils.hud.get.invalidate(),
    utils.health.invalidate(),
    utils.notes.get.invalidate(),
  ]);
}

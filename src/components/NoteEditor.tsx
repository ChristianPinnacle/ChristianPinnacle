import { useState } from 'react';

const VALID_FOLDERS = [
  'projects',
  'areas',
  'resources',
  'warroom',
  'archive',
  'unsorted',
] as const;

type Folder = (typeof VALID_FOLDERS)[number];

export interface NoteFormData {
  title: string;
  folder: Folder;
  tags: string[];
  summary: string;
  body: string;
}

interface NoteEditorProps {
  initial?: Partial<NoteFormData>;
  notePath?: string;
  onSave: (data: NoteFormData) => Promise<void>;
  onDelete?: () => Promise<void>;
  onCancel: () => void;
}

type EditorTab = 'write' | 'preview';

function renderPreview(body: string): string {
  return body
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/\[\[(.+?)(?:\|.+?)?\]\]/g, '<span class="wikilink">[[$1]]</span>')
    .replace(/\n/g, '<br/>');
}

export function NoteEditor({ initial, notePath, onSave, onDelete, onCancel }: NoteEditorProps) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [folder, setFolder] = useState<Folder>(initial?.folder ?? 'unsorted');
  const [tagsRaw, setTagsRaw] = useState((initial?.tags ?? []).join(', '));
  const [summary, setSummary] = useState(initial?.summary ?? '');
  const [body, setBody] = useState(initial?.body ?? '');
  const [tab, setTab] = useState<EditorTab>('write');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!title.trim()) { setError('Title is required'); return; }
    setError(null);
    setSaving(true);
    try {
      const tags = tagsRaw
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      await onSave({ title: title.trim(), folder, tags, summary: summary.trim(), body });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    if (!confirmDelete) { setConfirmDelete(true); return; }
    setDeleting(true);
    try {
      await onDelete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
      setDeleting(false);
    }
  };

  return (
    <div className="note-editor">
      <div className="editor-header">
        <span className="editor-title">{notePath ? 'EDIT NOTE' : 'NEW NOTE'}</span>
        <button className="close-btn" onClick={onCancel}>✕</button>
      </div>

      {error && <p className="editor-error">{error}</p>}

      <div className="editor-fields">
        <input
          className="editor-input"
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <select
          className="editor-select"
          value={folder}
          onChange={(e) => setFolder(e.target.value as Folder)}
        >
          {VALID_FOLDERS.map((f) => (
            <option key={f} value={f}>{f}</option>
          ))}
        </select>

        <input
          className="editor-input"
          placeholder="Tags (comma separated)"
          value={tagsRaw}
          onChange={(e) => setTagsRaw(e.target.value)}
        />

        <input
          className="editor-input"
          placeholder="One-line summary"
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
        />
      </div>

      <div className="editor-tab-bar">
        <button
          className={`editor-tab ${tab === 'write' ? 'editor-tab-active' : ''}`}
          onClick={() => setTab('write')}
        >WRITE</button>
        <button
          className={`editor-tab ${tab === 'preview' ? 'editor-tab-active' : ''}`}
          onClick={() => setTab('preview')}
        >PREVIEW</button>
      </div>

      {tab === 'write' ? (
        <textarea
          className="editor-textarea"
          placeholder="Write your note here. Use [[Note Title]] to link to other notes."
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={10}
        />
      ) : (
        <div
          className="editor-preview"
          dangerouslySetInnerHTML={{ __html: renderPreview(body) || '<em style="opacity:0.4">Nothing to preview yet.</em>' }}
        />
      )}

      <div className="editor-actions">
        <button className="editor-btn-save" onClick={() => void handleSave()} disabled={saving}>
          {saving ? 'SAVING…' : 'SAVE NOTE'}
        </button>
        {onDelete && (
          <button
            className={`editor-btn-delete ${confirmDelete ? 'editor-btn-confirm' : ''}`}
            onClick={() => void handleDelete()}
            disabled={deleting}
          >
            {deleting ? 'DELETING…' : confirmDelete ? 'CONFIRM?' : 'DELETE'}
          </button>
        )}
        <button className="editor-btn-cancel" onClick={onCancel}>CANCEL</button>
      </div>
    </div>
  );
}

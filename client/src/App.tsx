import { useEffect, useRef, useState, type CSSProperties } from "react";
import { GraphCanvas } from "./components/GraphCanvas";
import { GraphLegend } from "./components/GraphLegend";
import { NoteEditor, type NoteFormData } from "./components/NoteEditor";
import { trpc } from "./lib/trpc";

type View = "hud" | "graph" | "notes";
type EditorMode = { mode: "create" } | { mode: "edit"; notePath: string };
type ChatMode = "ask" | "create" | "decide";

const FOLDERS = [
  { key: "projects", rank: "ELITE", label: "Current Projects", icon: "✦" },
  { key: "areas", rank: "ROYAL", label: "Areas", icon: "♛" },
  { key: "resources", rank: "CAPSULE", label: "Resources", icon: "⬡" },
  { key: "warroom", rank: "WAR ROOM", label: "Decisions", icon: "⊕" },
  { key: "archive", rank: "GRAVEYARD", label: "Archive", icon: "✙" },
  { key: "unsorted", rank: "SCOUTER ERROR", label: "Unsorted", icon: "⚡", error: true },
] as const;

const FOLDER_COLORS: Record<string, string> = {
  projects: "#3C58D6",
  areas: "#F5C542",
  resources: "#EDF1FA",
  warroom: "#9AAFFF",
  archive: "#556080",
  unsorted: "#FF4D4D",
};

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("Could not read image"));
        return;
      }
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(new Error("Could not read image"));
    reader.readAsDataURL(file);
  });
}

export default function App() {
  const [view, setView] = useState<View>("hud");
  const [editor, setEditor] = useState<EditorMode | null>(null);
  const [editInitial, setEditInitial] = useState<Partial<NoteFormData> | undefined>();
  const [selectedNote, setSelected] = useState<{ path: string; title: string; content: string } | null>(null);
  const [scanning, setScanning] = useState(false);
  const [activeFolder, setFolder] = useState<string | null>(null);
  const [chatDraft, setChatDraft] = useState("");
  const [chatMode, setChatMode] = useState<ChatMode>("ask");
  const [chatAnswer, setChatAnswer] = useState<string | null>(null);
  const [chatError, setChatError] = useState<string | null>(null);
  const [createTitle, setCreateTitle] = useState<string | null>(null);
  const [chatScope, setChatScope] = useState<{ path: string; title: string } | null>(null);
  const [citations, setCitations] = useState<
    Array<{ path: string; title: string; score: number; excerpt: string }>
  >([]);
  const [ignitedPaths, setIgnitedPaths] = useState<string[]>([]);
  const scanRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);

  const utils = trpc.useUtils();
  const health = trpc.health.useQuery();
  const hud = trpc.hud.get.useQuery();
  const graph = trpc.graph.get.useQuery();
  const notes = trpc.vault.list.useQuery();

  const createNote = trpc.notes.create.useMutation();
  const updateNote = trpc.notes.update.useMutation();
  const deleteNote = trpc.notes.delete.useMutation();
  const askChat = trpc.chat.ask.useMutation();
  const createChat = trpc.chat.create.useMutation();
  const decideChat = trpc.chat.decide.useMutation();
  const pendingLinks = trpc.links.pending.useQuery(undefined, {
    refetchInterval: 8_000,
  });
  const orphans = trpc.orphans.list.useQuery();
  const quarantineOrphan = trpc.orphans.quarantine.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.orphans.list.invalidate(),
        utils.hud.get.invalidate(),
        utils.graph.get.invalidate(),
        utils.vault.list.invalidate(),
      ]);
    },
  });
  const acceptLink = trpc.links.accept.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.links.pending.invalidate(),
        utils.graph.get.invalidate(),
        utils.vault.list.invalidate(),
        utils.hud.get.invalidate(),
      ]);
    },
  });
  const rejectLink = trpc.links.reject.useMutation({
    onSuccess: async () => {
      await utils.links.pending.invalidate();
      await utils.graph.get.invalidate();
    },
  });
  const uploadPortrait = trpc.portrait.upload.useMutation({
    onSuccess: () => {
      void utils.hud.get.invalidate();
    },
  });

  const loading = health.isLoading || hud.isLoading || graph.isLoading || notes.isLoading;
  const error =
    health.error?.message ??
    hud.error?.message ??
    graph.error?.message ??
    notes.error?.message ??
    null;

  const invalidateAll = async (): Promise<void> => {
    await Promise.all([
      utils.hud.get.invalidate(),
      utils.graph.get.invalidate(),
      utils.vault.list.invalidate(),
      utils.health.invalidate(),
      utils.links.pending.invalidate(),
      utils.orphans.list.invalidate(),
    ]);
  };

  const runScan = (): void => {
    setScanning(true);
    if (scanRef.current) clearTimeout(scanRef.current);
    scanRef.current = setTimeout(() => setScanning(false), 1800);
  };

  useEffect(() => {
    return () => {
      if (scanRef.current) clearTimeout(scanRef.current);
    };
  }, []);

  const openNote = async (notePath: string): Promise<void> => {
    const note = notes.data?.find((n) => n.path === notePath);
    if (!note) return;
    try {
      const fetched = await utils.notes.get.fetch({ path: notePath });
      setSelected({ path: notePath, title: fetched.title, content: fetched.body });
    } catch {
      setSelected({ path: notePath, title: note.title, content: "(Could not load)" });
    }
  };

  const handleCreate = async (data: NoteFormData): Promise<void> => {
    await createNote.mutateAsync(data);
    await invalidateAll();
    setEditor(null);
  };

  const handleUpdate = async (notePath: string, data: NoteFormData): Promise<void> => {
    await updateNote.mutateAsync({ path: notePath, ...data });
    await invalidateAll();
    setEditor(null);
    setSelected(null);
    setEditInitial(undefined);
  };

  const handleDelete = async (notePath: string): Promise<void> => {
    await deleteNote.mutateAsync({ path: notePath });
    await invalidateAll();
    setEditor(null);
    setSelected(null);
    setEditInitial(undefined);
  };

  const startEdit = async (notePath: string): Promise<void> => {
    try {
      const fetched = await utils.notes.get.fetch({ path: notePath });
      setEditInitial({
        title: fetched.title,
        folder: fetched.folder as NoteFormData["folder"],
        tags: fetched.tags,
        summary: fetched.summary,
        body: fetched.body,
      });
    } catch {
      const n = notes.data?.find((x) => x.path === notePath);
      setEditInitial(
        n
          ? { title: n.title, folder: n.folder as NoteFormData["folder"] }
          : undefined,
      );
    }
    setEditor({ mode: "edit", notePath });
  };

  const handlePortraitClick = (): void => {
    const el = document.createElement("input");
    el.type = "file";
    el.accept = "image/png,image/jpeg,image/webp";
    el.onchange = () => {
      const file = el.files?.[0];
      if (!file) return;
      const mimeType = file.type as "image/png" | "image/jpeg" | "image/webp";
      if (!["image/png", "image/jpeg", "image/webp"].includes(mimeType)) return;
      void fileToBase64(file).then((dataBase64) => {
        uploadPortrait.mutate({ dataBase64, mimeType });
      });
    };
    el.click();
  };

  const scopeAskToNote = (note: { path: string; title: string }): void => {
    setChatScope({ path: note.path, title: note.title });
    setSelected(null);
    setChatDraft("");
    setChatError(null);
    requestAnimationFrame(() => chatInputRef.current?.focus());
  };

  const submitAsk = async (): Promise<void> => {
    const question = chatDraft.trim();
    const busy = askChat.isPending || createChat.isPending || decideChat.isPending;
    if (!question || busy) return;

    setChatError(null);
    setChatAnswer(null);
    setCreateTitle(null);
    try {
      if (chatMode === "create") {
        const result = await createChat.mutateAsync({ brief: question });
        setChatAnswer(result.draft);
        setCreateTitle(result.titleSuggestion);
        setCitations(result.citations);
        setIgnitedPaths(result.sourcePaths);
        if (result.sourcePaths.length > 0) setView("graph");
      } else if (chatMode === "decide") {
        const result = await decideChat.mutateAsync({ question });
        setChatAnswer(result.answer);
        setCitations(result.citations);
        setIgnitedPaths(result.sourcePaths);
        if (result.sourcePaths.length > 0) setView("graph");
      } else {
        const result = await askChat.mutateAsync({
          question,
          pathFilter: chatScope?.path,
        });
        setChatAnswer(result.answer);
        setCitations(result.citations);
        setIgnitedPaths(result.sourcePaths);
        if (result.sourcePaths.length > 0) setView("graph");
      }
    } catch (err) {
      setChatError(err instanceof Error ? err.message : "Scouter ask failed");
      setCitations([]);
      setIgnitedPaths([]);
      setCreateTitle(null);
    }
  };

  const saveCreateAsNote = (): void => {
    if (!chatAnswer) return;
    setEditInitial({
      title: createTitle ?? "Untitled draft",
      folder: "unsorted",
      tags: [],
      summary: "",
      body: chatAnswer,
    });
    setEditor({ mode: "create" });
    setChatAnswer(null);
    setCreateTitle(null);
    setCitations([]);
    setIgnitedPaths([]);
    setChatDraft("");
  };

  const noteList = notes.data ?? [];
  const totalPL = hud.data?.totalPl ?? graph.data?.totalPl ?? 0;
  const topPL = noteList.reduce((max, n) => Math.max(max, n.plScore ?? 0), 0);
  const plLabel =
    totalPL >= 1_000_000
      ? `${(totalPL / 1_000_000).toFixed(1)}M`
      : totalPL >= 1000
        ? `${Math.round(totalPL / 1000)}K`
        : String(totalPL);

  const energyPct = hud.data?.energyPercent ?? 0;
  const energyLabel = hud.data?.energyStatus ?? "LOW";
  const threatLvl = hud.data?.threatLevel ?? 1;
  const kiLevel = threatLvl >= 6 ? "CRITICAL" : threatLvl >= 3 ? "HIGH" : "NORMAL";
  const radarDist = (5 + noteList.length * 0.6).toFixed(1);
  const portraitUrl = hud.data?.portraitUrl
    ? `${hud.data.portraitUrl}?t=${hud.dataUpdatedAt}`
    : null;

  const plBars = Array.from({ length: 16 }, (_, i) => {
    const t = i / 15;
    return Math.max(0.08, t * t);
  });
  const energySegs = Array.from({ length: 12 }, (_, i) => i < Math.round((energyPct / 100) * 12));

  const folderCounts = new Map<string, number>();
  for (const folder of hud.data?.folders ?? []) {
    folderCounts.set(folder.id, folder.count);
  }

  return (
    <div className="sa-root">
      <header className="sa-header">
        <div className="sa-logo">
          <span className="sa-logo-icon">⚔</span>
          <div className="sa-logo-text">
            <span className="sa-logo-main">SAIYAN</span>
            <span className="sa-logo-main">ARCHIVE</span>
          </div>
        </div>
        <div className="sa-header-right">
          <button
            type="button"
            className={`sa-tab ${view === "graph" ? "sa-tab-on" : ""}`}
            onClick={() => setView(view === "graph" ? "hud" : "graph")}
          >
            GRAPH
          </button>
          <button
            type="button"
            className={`sa-tab ${view === "notes" ? "sa-tab-on" : ""}`}
            onClick={() => setView(view === "notes" ? "hud" : "notes")}
          >
            SCROLL
          </button>
          <button
            type="button"
            className="sa-tab"
            onClick={() => {
              setEditInitial(undefined);
              setEditor({ mode: "create" });
            }}
          >
            ＋
          </button>
        </div>
      </header>

      <div className="sa-subtitle">PRINCE OF ALL NOTES · PL {plLabel}</div>

      {loading && <p className="sa-loading">Powering up scouter…</p>}
      {error && <p className="sa-error">SCOUTER ERROR: {error}</p>}

      {editor && (
        <div className="sa-overlay">
          {editor.mode === "create" ? (
            <NoteEditor
              initial={editInitial}
              onSave={async (d) => {
                await handleCreate(d);
                setEditInitial(undefined);
              }}
              onCancel={() => {
                setEditor(null);
                setEditInitial(undefined);
              }}
            />
          ) : (
            <NoteEditor
              notePath={editor.notePath}
              initial={editInitial}
              onSave={(d) => handleUpdate(editor.notePath, d)}
              onDelete={() => handleDelete(editor.notePath)}
              onCancel={() => {
                setEditor(null);
                setEditInitial(undefined);
              }}
            />
          )}
        </div>
      )}

      {selectedNote && !editor && (
        <div className="sa-overlay">
          <div className="note-panel">
            <div className="note-panel-header">
              <span className="note-panel-title">{selectedNote.title}</span>
              <button
                type="button"
                className="ask-note-btn"
                onClick={() => scopeAskToNote(selectedNote)}
              >
                ASK
              </button>
              <button
                type="button"
                className="edit-btn"
                onClick={() => void startEdit(selectedNote.path)}
              >
                ✎
              </button>
              <button type="button" className="close-btn" onClick={() => setSelected(null)}>
                ✕
              </button>
            </div>
            <pre className="note-content">{selectedNote.content}</pre>
          </div>
        </div>
      )}

      {view === "graph" && graph.data && !loading && (
        <div className="sa-graph-view">
          <GraphLegend />
          <div className="graph-wrap">
            <GraphCanvas
              nodes={graph.data.nodes.map((n) => ({
                id: n.id,
                title: n.title,
                folder: n.folder,
                plScore: n.plScore,
              }))}
              edges={graph.data.edges}
              ignitedIds={ignitedPaths}
              onNodeTap={(id) => void openNote(id)}
            />
          </div>
          <p className="graph-hint">Pinch to zoom · drag to pan · tap dot to read</p>
        </div>
      )}

      {(pendingLinks.data?.length ?? 0) > 0 && (
        <div className="sa-link-proposals">
          <div className="sa-link-proposals-header">LINK PROPOSALS</div>
          {pendingLinks.data?.map((link) => (
            <div
              key={`${link.sourcePath}->${link.targetPath}`}
              className="sa-link-proposal"
            >
              <div className="sa-link-proposal-text">
                <span className="sa-link-proposal-from">{link.sourceTitle}</span>
                <span className="sa-link-proposal-arrow">→</span>
                <span className="sa-link-proposal-to">{link.targetTitle}</span>
                <span className="sa-link-proposal-score">
                  {Math.round(link.confidence * 100)}%
                </span>
              </div>
              <div className="sa-link-proposal-actions">
                <button
                  type="button"
                  className="sa-link-accept"
                  disabled={acceptLink.isPending || rejectLink.isPending}
                  onClick={() =>
                    void acceptLink.mutateAsync({
                      sourcePath: link.sourcePath,
                      targetPath: link.targetPath,
                    })
                  }
                >
                  ✓
                </button>
                <button
                  type="button"
                  className="sa-link-reject"
                  disabled={acceptLink.isPending || rejectLink.isPending}
                  onClick={() =>
                    void rejectLink.mutateAsync({
                      sourcePath: link.sourcePath,
                      targetPath: link.targetPath,
                    })
                  }
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {(orphans.data?.quarantine.length ?? 0) > 0 && (
        <div className="sa-orphan-panel">
          <div className="sa-orphan-header">SCOUTER ERROR — ORPHANS</div>
          <p className="sa-orphan-hint">No wiki links. Tap FILE to move into Unsorted.</p>
          {orphans.data?.quarantine.map((orphan) => (
            <div key={orphan.path} className="sa-orphan-row">
              <button
                type="button"
                className="sa-orphan-title"
                onClick={() => void openNote(orphan.path)}
              >
                {orphan.title}
                <span className="sa-orphan-folder">{orphan.folder}</span>
              </button>
              <button
                type="button"
                className="sa-orphan-file"
                disabled={quarantineOrphan.isPending}
                onClick={() => void quarantineOrphan.mutateAsync({ path: orphan.path })}
              >
                FILE
              </button>
            </div>
          ))}
        </div>
      )}

      {view === "notes" && !loading && (
        <div className="sa-notes-view">
          {noteList.map((note) => (
            <div key={note.path} className="sa-note-row" onClick={() => void openNote(note.path)}>
              <span className="sa-note-folder" style={{ color: FOLDER_COLORS[note.folder] ?? "#fff" }}>
                {note.folder}
              </span>
              <span className="sa-note-title">{note.title}</span>
              {typeof note.plScore === "number" && (
                <span className="sa-note-pl">PL {note.plScore.toLocaleString()}</span>
              )}
            </div>
          ))}
        </div>
      )}

      {view === "hud" && !loading && !editor && hud.data && (
        <div className="sa-hud">
          <div className="sa-left">
            {FOLDERS.map(({ key, rank, label, icon, error: isError }) => {
              const count = folderCounts.get(key) ?? 0;
              const color = FOLDER_COLORS[key] ?? "#fff";
              return (
                <button
                  key={key}
                  type="button"
                  className={`sa-folder-row ${activeFolder === key ? "sa-folder-active" : ""} ${isError ? "sa-folder-error" : ""}`}
                  style={{ "--fc": color } as CSSProperties}
                  onClick={() => setFolder((prev) => (prev === key ? null : key))}
                >
                  <span className="sa-folder-icon" style={{ color }}>
                    {icon}
                  </span>
                  <div className="sa-folder-info">
                    <span className="sa-folder-rank" style={{ color }}>
                      {rank}
                    </span>
                    <span className="sa-folder-label">{label}</span>
                  </div>
                  <span className="sa-folder-count" style={{ color }}>
                    {count}
                  </span>
                </button>
              );
            })}

            <div className="sa-battle-log">
              <div className="sa-battle-title">BATTLE LOG</div>
              {hud.data.battleLog.length === 0 ? (
                <div className="sa-battle-empty">No agent entries yet.</div>
              ) : (
                hud.data.battleLog.slice(0, 5).map((entry) => (
                  <div key={`${entry.path}-${entry.updated}`} className="sa-battle-row">
                    <span className="sa-battle-source">{entry.agent}</span>
                    <span className="sa-battle-title-text">
                      {entry.action.slice(0, 18)}
                      {entry.action.length > 18 ? "…" : ""}
                    </span>
                    <span className="sa-battle-time">{entry.timeAgo}</span>
                  </div>
                ))
              )}
            </div>

            <div className="sa-footer">
              {hud.data.noteCount} NOTES · {hud.data.agentCount} AGENTS
              {hud.data.orphanCount > 0
                ? ` · ${hud.data.orphanCount} ORPHAN${hud.data.orphanCount === 1 ? "" : "S"}`
                : ""}
            </div>
          </div>

          <div className="sa-right">
            <div className="sa-portrait" onClick={handlePortraitClick}>
              {portraitUrl ? (
                <img src={portraitUrl} alt="Portrait" className="sa-portrait-img" />
              ) : (
                <div className="sa-portrait-placeholder">
                  <div className="sa-portrait-city">
                    {Array.from({ length: 12 }, (_, i) => (
                      <div
                        key={i}
                        className="sa-city-bar"
                        style={{
                          height: `${20 + Math.sin(i * 1.3) * 18 + Math.sin(i * 0.7) * 12}%`,
                          width: "6%",
                        }}
                      />
                    ))}
                  </div>
                  <span className="sa-portrait-label">YOUR ART</span>
                </div>
              )}
            </div>

            <div className="sa-pl-card" onClick={runScan}>
              <div className="sa-pl-header">
                <span className="sa-pl-label">POWER LEVEL SCAN</span>
                <span className={`sa-pl-dot ${scanning ? "sa-pl-dot-scan" : ""}`} />
              </div>
              <div className="sa-pl-row">
                <span className="sa-pl-icon">⊙</span>
                <span className={`sa-pl-number ${scanning ? "sa-pl-flicker" : ""}`}>
                  {scanning ? "???,???" : topPL.toLocaleString()}
                </span>
                <span className="sa-pl-badge">PL</span>
              </div>
              <div className="sa-pl-bars">
                {plBars.map((h, i) => (
                  <div
                    key={i}
                    className={`sa-pl-bar ${scanning ? "sa-pl-bar-scan" : ""}`}
                    style={{ height: `${h * 100}%`, animationDelay: `${i * 0.04}s` }}
                  />
                ))}
              </div>
              <div className="sa-pl-footer">MAX OUTPUT</div>
            </div>

            <div className="sa-energy-card">
              <div className="sa-energy-header">
                <span className="sa-energy-icon">⚡</span>
                <span className="sa-energy-label">ENERGY READING</span>
                <span className="sa-energy-pct">{energyPct}%</span>
                <span className="sa-energy-status">{energyLabel}</span>
              </div>
              <div className="sa-energy-segs">
                {energySegs.map((on, i) => (
                  <div key={i} className={`sa-energy-seg ${on ? "sa-energy-seg-on" : ""}`} />
                ))}
              </div>
            </div>

            <div className="sa-radar-card">
              <div className="sa-radar-meta">
                <div>
                  <span className="sa-radar-key">TARGET</span>
                  <span className="sa-radar-val">MULTIPLE</span>
                </div>
                <div className="sa-radar-right">
                  <span className="sa-radar-key">DISTANCE</span>
                  <span className="sa-radar-val">{radarDist}km</span>
                </div>
              </div>
              <div className="sa-radar-scope">
                <svg viewBox="0 0 120 120" className="sa-radar-svg">
                  {[40, 28, 16].map((r) => (
                    <circle
                      key={r}
                      cx="60"
                      cy="60"
                      r={r}
                      fill="none"
                      stroke="rgba(255,77,77,0.2)"
                      strokeWidth="0.8"
                    />
                  ))}
                  <line x1="60" y1="20" x2="60" y2="100" stroke="rgba(255,77,77,0.15)" strokeWidth="0.6" />
                  <line x1="20" y1="60" x2="100" y2="60" stroke="rgba(255,77,77,0.15)" strokeWidth="0.6" />
                  <line
                    x1="60"
                    y1="60"
                    x2="100"
                    y2="60"
                    stroke="rgba(255,77,77,0.5)"
                    strokeWidth="1"
                    className="sa-radar-sweep"
                  />
                  {(hud.data.radarTargets.length > 0
                    ? hud.data.radarTargets.slice(0, 5)
                    : (graph.data?.nodes ?? []).slice(0, 5).map((node, i) => {
                        const angle = (i / 5) * Math.PI * 2;
                        const dist = 12 + (i % 3) * 10;
                        return {
                          id: node.id,
                          x: 50 + Math.cos(angle) * dist,
                          y: 50 + Math.sin(angle) * dist,
                        };
                      })
                  ).map((target) => (
                    <circle
                      key={target.id}
                      cx={60 + (target.x - 50) * 0.8}
                      cy={60 + (target.y - 50) * 0.8}
                      r="2.5"
                      fill="#FF4D4D"
                      opacity="0.85"
                    />
                  ))}
                  <polygon points="60,52 64,60 60,68 56,60" fill="none" stroke="#FF4D4D" strokeWidth="1" />
                </svg>
              </div>
              <div className="sa-radar-meta sa-radar-bottom">
                <div>
                  <span className="sa-radar-key">SIGNATURE</span>
                  <span className="sa-radar-val sa-radar-ki">KI: {kiLevel}</span>
                </div>
                <div className="sa-radar-right">
                  <span className="sa-radar-key">THREAT LVL</span>
                  <span className="sa-radar-val sa-radar-threat">
                    {threatLvl} {threatLvl >= 6 ? "ELEVATED" : "STABLE"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeFolder && view === "hud" && !editor && (
        <div className="sa-folder-notes">
          <div className="sa-folder-notes-header">
            <span>{activeFolder.toUpperCase()}</span>
            <button type="button" className="close-btn" onClick={() => setFolder(null)}>
              ✕
            </button>
          </div>
          {noteList
            .filter((n) => n.folder === activeFolder)
            .map((note) => (
              <div key={note.path} className="sa-note-row" onClick={() => void openNote(note.path)}>
                <span className="sa-note-title">{note.title}</span>
                {typeof note.plScore === "number" && (
                  <span className="sa-note-pl">PL {note.plScore.toLocaleString()}</span>
                )}
              </div>
            ))}
        </div>
      )}

      {(chatAnswer || chatError || citations.length > 0) && (
        <div className={`sa-chat-panel${chatScope ? " scoped" : ""}`}>
          <div className="sa-chat-panel-header">
            <span>
              {chatMode === "create"
                ? "CREATE DRAFT"
                : chatMode === "decide"
                  ? "WAR ROOM"
                  : "SCOUTER REPLY"}
            </span>
            <button
              type="button"
              className="close-btn"
              onClick={() => {
                setChatAnswer(null);
                setChatError(null);
                setCitations([]);
                setIgnitedPaths([]);
                setCreateTitle(null);
              }}
            >
              ✕
            </button>
          </div>
          {chatError && <p className="sa-error">{chatError}</p>}
          {createTitle && chatMode === "create" && (
            <p className="sa-create-title">{createTitle}</p>
          )}
          {chatAnswer && <p className="sa-chat-answer">{chatAnswer}</p>}
          {chatMode === "create" && chatAnswer && (
            <button type="button" className="sa-save-draft" onClick={saveCreateAsNote}>
              SAVE AS NOTE
            </button>
          )}
          {citations.length > 0 && (
            <div className="sa-citations">
              {citations.map((c) => (
                <button
                  key={c.path}
                  type="button"
                  className="sa-citation-chip"
                  onClick={() => void openNote(c.path)}
                  title={c.excerpt}
                >
                  {c.title}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {chatScope && chatMode === "ask" && (
        <div className="sa-chat-scope">
          <span className="sa-chat-scope-label">LOCKED ON</span>
          <span className="sa-chat-scope-title">{chatScope.title}</span>
          <button
            type="button"
            className="sa-chat-scope-clear"
            onClick={() => setChatScope(null)}
            aria-label="Clear note scope"
          >
            ✕
          </button>
        </div>
      )}

      <div className="sa-chat-modes">
        <button
          type="button"
          className={`sa-chat-mode${chatMode === "ask" ? " active" : ""}`}
          onClick={() => setChatMode("ask")}
        >
          ASK
        </button>
        <button
          type="button"
          className={`sa-chat-mode${chatMode === "create" ? " active" : ""}`}
          onClick={() => {
            setChatMode("create");
            setChatScope(null);
          }}
        >
          CREATE
        </button>
        <button
          type="button"
          className={`sa-chat-mode${chatMode === "decide" ? " active" : ""}`}
          onClick={() => {
            setChatMode("decide");
            setChatScope(null);
          }}
        >
          DECIDE
        </button>
      </div>

      <div className="sa-chat-bar">
        <button
          type="button"
          className="sa-chat-plus"
          onClick={() => {
            setEditInitial(undefined);
            setEditor({ mode: "create" });
          }}
        >
          ＋
        </button>
        <input
          ref={chatInputRef}
          className="sa-chat-input"
          placeholder={
            chatMode === "create"
              ? "What should I write…"
              : chatMode === "decide"
                ? "What did we decide about…"
                : chatScope
                  ? `Ask about ${chatScope.title}…`
                  : health.data && (!health.data.voyageConfigured || !health.data.anthropicConfigured)
                    ? "Add VOYAGE + ANTHROPIC keys to .env…"
                    : "ASK THE VAULT…"
          }
          value={chatDraft}
          onChange={(e) => setChatDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void submitAsk();
          }}
          disabled={askChat.isPending || createChat.isPending || decideChat.isPending}
        />
        <button
          type="button"
          className="sa-chat-send"
          onClick={() => void submitAsk()}
          disabled={
            askChat.isPending ||
            createChat.isPending ||
            decideChat.isPending ||
            !chatDraft.trim()
          }
        >
          {askChat.isPending || createChat.isPending || decideChat.isPending
            ? "…"
            : chatMode === "create"
              ? "WRITE"
              : chatMode === "decide"
                ? "DECIDE"
                : "ASK"}
        </button>
      </div>
    </div>
  );
}

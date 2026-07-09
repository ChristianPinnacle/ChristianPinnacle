import { useEffect, useMemo, useState } from "react";
import FolderCards from "./components/FolderCards";
import Frame from "./components/Frame";
import GraphPane from "./components/GraphPane";
import HudScreen from "./components/HudScreen";
import NoteEditor from "./components/NoteEditor";
import NoteList from "./components/NoteList";
import NoteView from "./components/NoteView";
import PowerLevelScan from "./components/PowerLevelScan";
import { trpc } from "./lib/trpc";
import { GOLD, notch } from "./theme";

type ViewMode = "hud" | "graph";

type NoteScreen =
  | { kind: "none" }
  | { kind: "list" }
  | { kind: "view"; path: string }
  | { kind: "create" }
  | { kind: "edit"; path: string };

function ArmourIcon({ size = 44 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 60 60" aria-hidden="true">
      <path d="M14 18 Q30 8 46 18 L46 44 Q30 54 14 44 Z" fill="#3C58D6" />
      <path
        d="M10 16 Q30 4 50 16 L50 28 Q42 24 38 30 L38 46 Q30 51 22 46 L22 30 Q18 24 10 28 Z"
        fill="#EDF1FA"
        stroke="#B9C2D8"
        strokeWidth="1.5"
      />
      <path d="M2 14 Q10 8 18 16 L14 30 Q6 26 2 20 Z" fill={GOLD} />
      <path d="M58 14 Q50 8 42 16 L46 30 Q54 26 58 20 Z" fill={GOLD} />
      <path d="M22 30 L30 40 L38 30 L38 36 L30 46 L22 36 Z" fill={GOLD} />
    </svg>
  );
}

export default function App() {
  const [view, setView] = useState<ViewMode>("hud");
  const [hidden, setHidden] = useState<Record<string, boolean>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [plDisplay, setPlDisplay] = useState(0);
  const [noteScreen, setNoteScreen] = useState<NoteScreen>({ kind: "none" });

  const utils = trpc.useUtils();
  const health = trpc.health.useQuery();
  const graph = trpc.graph.get.useQuery();
  const hud = trpc.hud.get.useQuery();
  const deleteNote = trpc.notes.delete.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.vault.list.invalidate(),
        utils.graph.get.invalidate(),
        utils.hud.get.invalidate(),
        utils.health.invalidate(),
      ]);
      setNoteScreen({ kind: "none" });
      setSelectedId(null);
    },
  });

  const selectedNode = useMemo(
    () => graph.data?.nodes.find((node) => node.id === selectedId) ?? null,
    [graph.data?.nodes, selectedId],
  );

  const graphScanPl = selectedNode ? plDisplay : (graph.data?.totalPl ?? 0);

  useEffect(() => {
    if (!selectedNode) {
      setPlDisplay(0);
      return;
    }

    const target = selectedNode.plScore;
    setPlDisplay(0);
    const start = performance.now();
    let frame = 0;

    const tick = (time: number): void => {
      const progress = Math.min(1, (time - start) / 900);
      setPlDisplay(Math.floor(target * (1 - Math.pow(1 - progress, 3))));
      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      }
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [selectedNode]);

  const toggleFolder = (folderId: string): void => {
    setHidden((current) => ({ ...current, [folderId]: !current[folderId] }));
  };

  const totalPl = hud.data?.totalPl ?? graph.data?.totalPl ?? 0;
  const inNoteFlow = noteScreen.kind !== "none";

  const handleDeleteNote = (path: string): void => {
    const confirmed = window.confirm("Delete this note permanently?");
    if (!confirmed) return;
    deleteNote.mutate({ path });
  };

  return (
    <div className="shell">
      <Frame accent={GOLD} pad={0} className="outer-frame">
        <div className="shell-inner">
          <header className="header">
            <ArmourIcon />
            <div className="header-text">
              <h1 className="dbz-title">
                SAIYAN
                <br />
                ARCHIVE
              </h1>
            </div>
            {!inNoteFlow && (
              <button
                type="button"
                className={`view-toggle${view === "graph" ? " active" : ""}`}
                style={{ clipPath: notch(6) }}
                onClick={() => setView(view === "hud" ? "graph" : "hud")}
              >
                {view === "hud" ? "GRAPH" : "HUD"}
              </button>
            )}
          </header>

          {health.isLoading && <p className="status">Connecting...</p>}
          {health.error && <p className="status error">Server unreachable: {health.error.message}</p>}

          {health.data && !inNoteFlow && (
            <p className="pl-banner">
              PRINCE OF ALL NOTES · <span>PL {Math.round(totalPl / 1000)}K</span>
            </p>
          )}

          <main className="main">
            {noteScreen.kind === "list" && (
              <NoteList
                onOpen={(path) => setNoteScreen({ kind: "view", path })}
                onBack={() => setNoteScreen({ kind: "none" })}
              />
            )}

            {noteScreen.kind === "view" && (
              <NoteView
                path={noteScreen.path}
                onBack={() => setNoteScreen({ kind: "list" })}
                onEdit={() => setNoteScreen({ kind: "edit", path: noteScreen.path })}
                onDelete={() => handleDeleteNote(noteScreen.path)}
              />
            )}

            {noteScreen.kind === "create" && (
              <NoteEditor
                mode="create"
                onSaved={(path) => setNoteScreen({ kind: "view", path })}
                onCancel={() => setNoteScreen({ kind: "none" })}
              />
            )}

            {noteScreen.kind === "edit" && (
              <NoteEditor
                mode="edit"
                path={noteScreen.path}
                onSaved={(path) => setNoteScreen({ kind: "view", path })}
                onCancel={() => setNoteScreen({ kind: "view", path: noteScreen.path })}
              />
            )}

            {noteScreen.kind === "none" && (
              <>
                {view === "graph" ? (
                  <>
                    {graph.isLoading && <p className="status">Loading graph...</p>}
                    {graph.error && <p className="status error">Graph failed: {graph.error.message}</p>}
                    {graph.data && (
                      <>
                        <PowerLevelScan
                          value={graphScanPl}
                          label={selectedNode ? selectedNode.title.toUpperCase() : "TOTAL VAULT OUTPUT"}
                        />
                        <GraphPane
                          nodes={graph.data.nodes}
                          edges={graph.data.edges}
                          hidden={hidden}
                          selectedId={selectedId}
                          onSelect={setSelectedId}
                        />
                        {selectedNode && (
                          <button
                            type="button"
                            className="primary-btn full-width"
                            onClick={() => setNoteScreen({ kind: "view", path: selectedNode.id })}
                          >
                            OPEN NOTE
                          </button>
                        )}
                      </>
                    )}
                  </>
                ) : (
                  <HudScreen
                    selectedTitle={selectedNode?.title ?? null}
                    selectedPl={selectedNode?.plScore ?? null}
                  />
                )}

                {hud.data && (
                  <FolderCards folders={hud.data.folders} hidden={hidden} onToggle={toggleFolder} />
                )}
              </>
            )}
          </main>

          {!inNoteFlow && (
            <div className="action-bar">
              <button type="button" className="action-btn" onClick={() => setNoteScreen({ kind: "list" })}>
                NOTES
              </button>
              <button type="button" className="action-btn action-btn-primary" onClick={() => setNoteScreen({ kind: "create" })}>
                + NEW
              </button>
            </div>
          )}
        </div>
      </Frame>
    </div>
  );
}

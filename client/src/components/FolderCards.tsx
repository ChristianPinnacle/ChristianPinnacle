import FolderGlyph from "./FolderGlyph";
import Frame from "./Frame";
import { GOLDD } from "../theme";

export type HudFolder = {
  id: string;
  label: string;
  sub: string;
  color: string;
  count: number;
};

type FolderCardsProps = {
  folders: HudFolder[];
  hidden: Record<string, boolean>;
  onToggle: (folderId: string) => void;
};

export default function FolderCards({ folders, hidden, onToggle }: FolderCardsProps) {
  return (
    <div className="folder-cards">
      {folders.map((folder) => {
        const off = hidden[folder.id];
        const hot = folder.id === "unsorted";
        const accent = off ? "#2A3050" : hot ? "#FF3B45" : folder.id === "projects" ? "#4D6BFF" : GOLDD;

        return (
          <Frame
            key={folder.id}
            pad={0}
            accent={accent}
            glow={!off && (hot || folder.id === "projects")}
          >
            <button
              type="button"
              className={`folder-card-btn${off ? " off" : ""}`}
              onClick={() => onToggle(folder.id)}
            >
              <span className="folder-glyph-wrap" style={{ opacity: off ? 0.3 : 1 }}>
                <FolderGlyph kind={folder.id} color={folder.color} />
              </span>
              <span className="folder-card-label">{folder.label}</span>
              <span className="folder-card-sub">— {folder.sub}</span>
              <span className="folder-card-count">{folder.count}</span>
            </button>
          </Frame>
        );
      })}
    </div>
  );
}

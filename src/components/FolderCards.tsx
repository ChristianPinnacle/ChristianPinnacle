import { getFolderColor } from '../lib/graphColors';

interface FolderNote {
  folder: string;
  title: string;
}

interface FolderCardsProps {
  notes: FolderNote[];
  onFolderTap: (folder: string) => void;
}

const FOLDER_RANKS: Record<string, string> = {
  projects: 'ELITE',
  areas: 'ROYAL',
  resources: 'GUARD',
  warroom: 'COMMAND',
  archive: 'VAULT',
  unsorted: 'RECON',
};

const ALL_FOLDERS = ['projects', 'areas', 'resources', 'warroom', 'archive', 'unsorted'];

export function FolderCards({ notes, onFolderTap }: FolderCardsProps) {
  const counts = new Map<string, number>();
  for (const note of notes) {
    counts.set(note.folder, (counts.get(note.folder) ?? 0) + 1);
  }

  return (
    <div className="folder-cards">
      {ALL_FOLDERS.map((folder) => {
        const count = counts.get(folder) ?? 0;
        return (
          <button
            key={folder}
            className="folder-card"
            style={{ borderColor: getFolderColor(folder) }}
            onClick={() => onFolderTap(folder)}
          >
            <span className="folder-card-rank" style={{ color: getFolderColor(folder) }}>
              {FOLDER_RANKS[folder]}
            </span>
            <span className="folder-card-name">{folder}</span>
            <span className="folder-card-count">{count}</span>
          </button>
        );
      })}
    </div>
  );
}

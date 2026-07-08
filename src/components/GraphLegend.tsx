import { getFolderColor } from '../lib/graphColors';

const FOLDERS = ['projects', 'areas', 'resources', 'warroom', 'archive', 'unsorted'] as const;

export function GraphLegend() {
  return (
    <div className="graph-legend">
      {FOLDERS.map((folder) => (
        <span key={folder} className="legend-item">
          <span
            className="legend-dot"
            style={{ background: getFolderColor(folder) }}
          />
          {folder}
        </span>
      ))}
    </div>
  );
}

interface BattleEntry {
  title: string;
  source: string;
  updated: string;
}

interface BattleLogProps {
  entries: BattleEntry[];
}

const SOURCE_LABELS: Record<string, string> = {
  manus: 'MANUS',
  'claude-code': 'CLAUDE CODE',
  candice: 'CANDICE',
  import: 'IMPORT',
};

export function BattleLog({ entries }: BattleLogProps) {
  const agentEntries = entries.filter((e) => e.source !== 'user');

  return (
    <div className="battle-log">
      <div className="battle-log-label">BATTLE LOG — AGENT WRITES</div>
      {agentEntries.length === 0 ? (
        <p className="battle-log-empty">No agent entries yet.</p>
      ) : (
        <ul className="battle-log-list">
          {agentEntries.slice(0, 5).map((entry, i) => (
            <li key={i} className="battle-log-entry">
              <span className="battle-agent">{SOURCE_LABELS[entry.source] ?? entry.source}</span>
              <span className="battle-title">{entry.title}</span>
              <span className="battle-date">{entry.updated}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

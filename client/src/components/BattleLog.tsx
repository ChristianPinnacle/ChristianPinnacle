type BattleLogEntry = {
  agent: string;
  action: string;
  timeAgo: string;
  path: string;
};

type BattleLogProps = {
  entries: BattleLogEntry[];
  noteCount: number;
  agentCount: number;
  dbConfigured: boolean;
};

export default function BattleLog({
  entries,
  noteCount,
  agentCount,
  dbConfigured,
}: BattleLogProps) {
  return (
    <div className="battle-log">
      <div className="battle-log-title">BATTLE LOG</div>

      {entries.length === 0 ? (
        <p className="battle-log-empty">No agent activity yet — only user notes in vault.</p>
      ) : (
        entries.map((entry, i) => (
          <div key={entry.path} className="battle-log-row">
            <span className="battle-log-dot" style={{ animationDelay: `${i * 0.4}s` }} />
            <span className="battle-log-agent">{entry.agent}</span>
            <span className="battle-log-action">{entry.action}</span>
            <span className="battle-log-time">{entry.timeAgo}</span>
          </div>
        ))
      )}

      <div className="battle-log-sync">
        <span className="sync-dot" />
        <span className="sync-label">VAULT SYNCED</span>
        <span className="sync-detail">· vault/ · {dbConfigured ? "mysql" : "file scan"}</span>
      </div>

      <div className="battle-log-footer">
        {noteCount} NOTES · {agentCount} AGENTS CONNECTED
      </div>
    </div>
  );
}

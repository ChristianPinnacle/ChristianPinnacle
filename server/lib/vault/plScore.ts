export function computePlScore(
  wordCount: number,
  inboundLinks: number,
  updated: string,
  now: Date = new Date(),
): number {
  const updatedDate = new Date(`${updated}T00:00:00Z`);
  const daysSinceUpdate = Math.max(
    0,
    (now.getTime() - updatedDate.getTime()) / (1000 * 60 * 60 * 24),
  );
  const recencyBonus = 3000 * Math.exp(-daysSinceUpdate / 30);

  return Math.round(
    500 + inboundLinks * 800 + Math.sqrt(wordCount) * 40 + recencyBonus,
  );
}

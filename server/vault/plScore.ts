export function computePlScore(
  inboundLinks: number,
  wordCount: number,
  updated: string,
  now: Date = new Date(),
): number {
  const updatedDate = new Date(updated);
  const daysSinceUpdate = Number.isNaN(updatedDate.getTime())
    ? 365
    : Math.max(0, (now.getTime() - updatedDate.getTime()) / (1000 * 60 * 60 * 24));

  const recencyBonus = 3000 * Math.exp(-daysSinceUpdate / 30);
  const linkScore = inboundLinks * 800;
  const wordScore = Math.sqrt(wordCount) * 40;

  return Math.round(500 + linkScore + wordScore + recencyBonus);
}

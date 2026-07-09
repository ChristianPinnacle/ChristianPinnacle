import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildIndexFromVault } from '../vault/indexer';
import { buildGraphPayload } from './buildGraph';

const VAULT_DIR = path.resolve(process.cwd(), 'vault');

describe('buildGraphPayload', () => {
  it('builds nodes and edges from the vault index', async () => {
    const index = await buildIndexFromVault(VAULT_DIR);
    const graph = buildGraphPayload(index);

    expect(graph.nodes).toHaveLength(index.notes.length);
    expect(graph.edges).toHaveLength(index.links.length);
    expect(graph.folders.length).toBeGreaterThan(0);
    expect(graph.totalPl).toBeGreaterThan(0);
  });

  it('marks hub nodes with inbound wiki links', async () => {
    const index = await buildIndexFromVault(VAULT_DIR);
    const graph = buildGraphPayload(index);

    const playbook = graph.nodes.find((node) => node.title === 'Marketing Playbook');
    expect(playbook?.hub).toBe(true);
    expect(playbook?.inboundLinks).toBeGreaterThan(0);
  });

  it('maps edges using note paths', async () => {
    const index = await buildIndexFromVault(VAULT_DIR);
    const graph = buildGraphPayload(index);

    const mfpEdge = graph.edges.find(
      (edge) => edge.source === 'projects/mfp-campaign.md',
    );
    expect(mfpEdge).toBeDefined();
    expect(graph.nodes.some((node) => node.id === mfpEdge?.target)).toBe(true);
  });
});

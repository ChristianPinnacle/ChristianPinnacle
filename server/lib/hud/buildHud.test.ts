import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildHudPayload } from './buildHud';
import { getBattleLog } from './battleLog';

const VAULT_DIR = path.resolve(process.cwd(), 'vault');

describe('getBattleLog', () => {
  it('returns agent-sourced vault notes only', async () => {
    const log = await getBattleLog(VAULT_DIR);

    expect(log.length).toBeGreaterThanOrEqual(3);
    expect(log.every((entry) => entry.agent !== 'USER')).toBe(true);
    expect(log.some((entry) => entry.agent === 'MANUS')).toBe(true);
    expect(log.some((entry) => entry.agent === 'CLAUDE CODE')).toBe(true);
    expect(log.some((entry) => entry.agent === 'CANDICE')).toBe(true);
  });
});

describe('buildHudPayload', () => {
  it('returns HUD data with folders, battle log, and radar targets', async () => {
    const hud = await buildHudPayload(VAULT_DIR);

    expect(hud.noteCount).toBeGreaterThanOrEqual(11);
    expect(hud.totalPl).toBeGreaterThan(0);
    expect(hud.folders).toHaveLength(6);
    expect(hud.folders.some((folder) => folder.count > 0)).toBe(true);
    expect(hud.battleLog.length).toBeGreaterThanOrEqual(3);
    expect(hud.radarTargets.length).toBeGreaterThan(0);
    expect(hud.energyPercent).toBeGreaterThan(0);
    expect(hud.energyPercent).toBeLessThanOrEqual(99);
  });
});

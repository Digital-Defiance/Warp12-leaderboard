import { callFunction } from './functions-client.js';

export type ActiveSectorsPulse = {
  ok: true;
  /** Warp Dominoes sectors (gameses in lobby / active / round-end). */
  active: number;
  /** Subspace Lattice rooms with both seats and no winner yet. */
  latticeActive?: number;
  scanned: number;
  latticeScanned?: number;
  cached: boolean;
  updatedAt: string;
};

export async function fetchActiveSectorCount(): Promise<ActiveSectorsPulse> {
  return callFunction<Record<string, never>, ActiveSectorsPulse>(
    'countActiveSectors',
    {},
  );
}

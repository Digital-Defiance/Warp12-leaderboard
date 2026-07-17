import { callFunction } from './functions-client.js';

export type ActiveSectorsPulse = {
  ok: true;
  active: number;
  scanned: number;
  cached: boolean;
  updatedAt: string;
};

export async function fetchActiveSectorCount(): Promise<ActiveSectorsPulse> {
  return callFunction<Record<string, never>, ActiveSectorsPulse>(
    'countActiveSectors',
    {}
  );
}

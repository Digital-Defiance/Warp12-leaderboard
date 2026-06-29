import { useCallback, useEffect, useState } from 'react';

import { isVerifiedUser } from './auth-actions.js';
import { getMyRoles } from './rated-match-service.js';
import type { WarpRole } from './rated-match-schema.js';
import { useFirebaseAuth } from './auth-context.js';

export function useWarpRoles() {
  const auth = useFirebaseAuth();
  const [roles, setRoles] = useState<WarpRole[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!auth.ready || !auth.configured || !isVerifiedUser(auth.user)) {
      setRoles([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      await auth.user!.getIdToken(true);
      const next = await getMyRoles();
      setRoles(next);
    } catch {
      setRoles([]);
    } finally {
      setLoading(false);
    }
  }, [auth.configured, auth.ready, auth.user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    roles,
    loading,
    refresh,
    isAdmin: roles.includes('admin'),
    isOfficial: roles.includes('match_official') || roles.includes('admin'),
  };
}

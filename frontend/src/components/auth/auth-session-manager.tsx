'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/store/auth-store';

export function AuthSessionManager() {
  const hydrated = useAuthStore((state) => state.hydrated);
  const expiresAt = useAuthStore((state) => state.expiresAt);
  const logout = useAuthStore((state) => state.logout);
  const migrateLegacySession = useAuthStore((state) => state.migrateLegacySession);

  useEffect(() => {
    if (hydrated) migrateLegacySession();
  }, [hydrated, migrateLegacySession]);

  useEffect(() => {
    if (!hydrated || !expiresAt) return;
    const remaining = expiresAt - Date.now();
    if (remaining <= 0) {
      logout();
      return;
    }
    const timer = window.setTimeout(logout, Math.min(remaining, 2_147_483_647));
    return () => window.clearTimeout(timer);
  }, [expiresAt, hydrated, logout]);

  return null;
}

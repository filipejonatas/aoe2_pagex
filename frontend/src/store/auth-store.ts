'use client';

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type SessionPlayer = {
  profileId: string;
  nickname: string;
  country: string | null;
  currentRating: number | null;
  currentGlobalRank: number | null;
  teamRating: number | null;
  teamGlobalRank: number | null;
  teamWins: number | null;
  teamLosses: number | null;
  teamGames: number | null;
  wins: number | null;
  losses: number | null;
  games: number | null;
};

export type SessionUser = {
  id?: string;
  email?: string;
  username: string;
  steamId?: string | null;
  steamVerifiedAt?: string | null;
  aoePlayer?: SessionPlayer | null;
};

type AuthState = {
  token: string | null;
  expiresAt: number | null;
  user: SessionUser | null;
  hydrated: boolean;
  setSession: (token: string, user?: SessionUser | null) => boolean;
  setUser: (user: SessionUser) => void;
  getValidToken: () => string | null;
  logout: () => void;
  migrateLegacySession: () => void;
  setHydrated: (hydrated: boolean) => void;
};

function tokenExpiration(token: string) {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = JSON.parse(atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '='))) as { exp?: unknown };
    return typeof decoded.exp === 'number' ? decoded.exp * 1_000 : null;
  } catch {
    return null;
  }
}

export const useAuthStore = create<AuthState>()(persist(
  (set, get) => ({
    token: null,
    expiresAt: null,
    user: null,
    hydrated: false,
    setSession: (token, user = null) => {
      const expiresAt = tokenExpiration(token);
      if (!expiresAt || expiresAt <= Date.now()) {
        set({ token: null, expiresAt: null, user: null });
        return false;
      }
      set({ token, expiresAt, user: user ?? get().user });
      return true;
    },
    setUser: (user) => set({ user }),
    getValidToken: () => {
      const { token, expiresAt } = get();
      if (!token || !expiresAt || expiresAt <= Date.now()) {
        set({ token: null, expiresAt: null, user: null });
        return null;
      }
      return token;
    },
    logout: () => set({ token: null, expiresAt: null, user: null }),
    migrateLegacySession: () => {
      if (get().token || typeof window === 'undefined') return;
      const legacyToken = localStorage.getItem('aoe-league-token');
      if (legacyToken) get().setSession(legacyToken);
      localStorage.removeItem('aoe-league-token');
    },
    setHydrated: (hydrated) => set({ hydrated }),
  }),
  {
    name: 'aoe-league-auth',
    storage: createJSONStorage(() => localStorage),
    partialize: ({ token, expiresAt, user }) => ({ token, expiresAt, user }),
    onRehydrateStorage: () => (state) => state?.setHydrated(true),
  },
));

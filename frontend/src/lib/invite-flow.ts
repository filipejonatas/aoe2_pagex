import type { SessionUser } from '@/store/auth-store';

const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333/api/v1';

export function normalizeInviteCode(value?: string | null) {
  const inviteCode = value?.trim() ?? '';
  return inviteCode.length >= 6 && inviteCode.length <= 128 && /^[A-Za-z0-9_-]+$/.test(inviteCode)
    ? inviteCode
    : null;
}

export function withInvite(path: string, inviteCode?: string | null) {
  const normalized = normalizeInviteCode(inviteCode);
  if (!normalized) return path;
  const separator = path.includes('?') ? '&' : '?';
  return `${path}${separator}invite=${encodeURIComponent(normalized)}`;
}

async function responseMessage(response: Response, fallback: string) {
  const body = await response.json().catch(() => ({})) as { message?: string | string[] };
  return Array.isArray(body.message) ? body.message[0] : body.message ?? fallback;
}

export async function getCurrentUser(token: string) {
  const response = await fetch(`${baseUrl}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!response.ok) throw new Error(await responseMessage(response, 'Could not load your account.'));
  return response.json() as Promise<SessionUser>;
}

export async function joinLeagueInvite(token: string, inviteCode: string) {
  const response = await fetch(`${baseUrl}/leagues/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ inviteCode }),
  });
  if (!response.ok) throw new Error(await responseMessage(response, 'Could not join the invited league.'));
  return response.json() as Promise<{ league: { id: string; slug: string; name: string }; joined: boolean }>;
}

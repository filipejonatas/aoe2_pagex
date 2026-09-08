import { describe, expect, it } from 'vitest';
import { normalizeInviteCode, withInvite } from './invite-flow';

describe('invite flow helpers', () => {
  it('keeps valid invite codes across authentication routes', () => {
    expect(withInvite('/login', 'league_invite-123')).toBe('/login?invite=league_invite-123');
    expect(withInvite('/onboarding/aoe?steam=linked', 'league_invite-123')).toBe('/onboarding/aoe?steam=linked&invite=league_invite-123');
  });

  it('rejects malformed invite values', () => {
    expect(normalizeInviteCode('bad invite')).toBeNull();
    expect(withInvite('/login', 'bad invite')).toBe('/login');
  });
});

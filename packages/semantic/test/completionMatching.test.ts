import { describe, expect, it } from 'vitest';
import { completionMatchRank } from '../src/completionMatching.js';

describe('completion name matching', () => {
  it('keeps exact names and leading text ahead of abbreviations and interior text', () => {
    expect(['getUserCount', 'generateUrlCode', 'countUsers', 'userCount'].map((name) => ({
      name, rank: completionMatchRank(name, 'guc'),
    })).filter((item) => item.rank !== undefined)).toEqual([
      { name: 'getUserCount', rank: 3 }, { name: 'generateUrlCode', rank: 3 },
    ]);
    expect(completionMatchRank('getUserCount', 'get')).toBeLessThan(completionMatchRank('forgetUserCount', 'get')!);
    expect(completionMatchRank('get_user_count', 'guc')).toBe(3);
    expect(completionMatchRank('getURLCode', 'guc')).toBe(3);
    expect(completionMatchRank('HTTPServer', 'hs')).toBe(3);
    expect(completionMatchRank('getUserCount', 'user')).toBe(4);
    expect(completionMatchRank('unrelated', 'u')).toBe(1);
    expect(completionMatchRank('countUsers', 'u')).toBeUndefined();
  });
});

import { describe, expect, it } from 'vitest';
import { detectAcquisitionSource } from './journey-tracker';

describe('detectAcquisitionSource', () => {
  it('detects invite links from query parameters', () => {
    expect(detectAcquisitionSource('?invite=JAIPUR-VIP', '')).toEqual({
      source: 'invite',
      inviteCode: 'JAIPUR-VIP',
    });
    expect(detectAcquisitionSource('?ref=broker42', 'https://google.com')).toEqual({
      source: 'invite',
      inviteCode: 'broker42',
    });
    expect(detectAcquisitionSource('?utm_source=invite&utm_campaign=launch', '')).toEqual({
      source: 'invite',
      inviteCode: 'launch',
    });
  });

  it('detects search engine referrers and on-site search', () => {
    expect(detectAcquisitionSource('', 'https://www.google.co.in/search?q=flats')).toEqual({
      source: 'search',
      searchEngine: 'Google',
    });
    expect(detectAcquisitionSource('', 'https://www.bing.com/')).toEqual({
      source: 'search',
      searchEngine: 'Bing',
    });
    expect(detectAcquisitionSource('?q=3bhk+vaishali', '', '/search')).toEqual({
      source: 'search',
      searchEngine: 'On-site search',
    });
  });

  it('detects social, other referrers, and direct visits', () => {
    expect(detectAcquisitionSource('', 'https://l.instagram.com/')).toEqual({
      source: 'social',
    });
    expect(detectAcquisitionSource('', 'https://example-blog.org/post')).toEqual({
      source: 'other',
    });
    expect(detectAcquisitionSource('', '', '/')).toEqual({
      source: 'direct',
    });
  });
});

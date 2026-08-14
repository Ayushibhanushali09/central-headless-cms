import { parseTokenTtlToSeconds } from './token-ttl';

describe('parseTokenTtlToSeconds', () => {
  it.each([
    ['15m', 900],
    ['1h', 3600],
    ['7d', 604800],
    ['30s', 30],
  ])('converts %s to seconds', (value, expected) => {
    expect(parseTokenTtlToSeconds(value)).toBe(
      expected,
    );
  });

  it('rejects invalid TTL', () => {
    expect(() =>
      parseTokenTtlToSeconds('forever'),
    ).toThrow('Invalid token TTL');
  });
});
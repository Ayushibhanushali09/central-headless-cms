const MULTIPLIERS = {
  s: 1,
  m: 60,
  h: 60 * 60,
  d: 24 * 60 * 60,
} as const;

export function parseTokenTtlToSeconds(
  value: string,
): number {
  const match = /^(\d+)([smhd])$/.exec(value);

  if (!match) {
    throw new Error(
      `Invalid token TTL '${value}'. Expected formats such as 15m, 1h or 7d.`,
    );
  }

  const amount = Number(match[1]);
  const unit = match[2] as keyof typeof MULTIPLIERS;

  return amount * MULTIPLIERS[unit];
}
function requireEnvironment(
  value: string | undefined,
  name: string,
): string {
  if (!value) {
    throw new Error(
      `${name} is missing. Check apps/admin/.env.local.`,
    );
  }

  return value.replace(/\/$/, '');
}

export function getControlApiUrl(): string {
  return requireEnvironment(
    process.env.NEXT_PUBLIC_CONTROL_API_URL,
    'NEXT_PUBLIC_CONTROL_API_URL',
  );
}

export function getDeliveryApiUrl(): string {
  return requireEnvironment(
    process.env.NEXT_PUBLIC_DELIVERY_API_URL,
    'NEXT_PUBLIC_DELIVERY_API_URL',
  );
}
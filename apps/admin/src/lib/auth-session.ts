import type { LoginResponse } from './types';
import { getControlApiUrl } from './environment';

let accessToken: string | null = null;
let refreshInFlight: Promise<LoginResponse | null> | null =
  null;

export function getAccessToken(): string | null {
  return accessToken;
}

export function setAccessToken(
  nextAccessToken: string,
): void {
  accessToken = nextAccessToken;
}

export function clearAccessToken(): void {
  accessToken = null;
}

export function refreshAccessToken(): Promise<LoginResponse | null> {
  if (refreshInFlight) {
    return refreshInFlight;
  }

  refreshInFlight = fetch(
    `${getControlApiUrl()}/auth/refresh`,
    {
      method: 'POST',
      credentials: 'include',
      headers: {
        Accept: 'application/json',
      },
      cache: 'no-store',
    },
  )
    .then(async (response) => {
      if (response.status === 401) {
        clearAccessToken();
        return null;
      }

      if (!response.ok) {
        throw new Error(
          `Session refresh failed with status ${response.status}.`,
        );
      }

      const session =
        (await response.json()) as LoginResponse;

      setAccessToken(session.accessToken);

      return session;
    })
    .finally(() => {
      refreshInFlight = null;
    });

  return refreshInFlight;
}
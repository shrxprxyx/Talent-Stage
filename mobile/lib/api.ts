import { useAuth } from '@clerk/expo';
import { useCallback } from 'react';

// Real phone: set EXPO_PUBLIC_API_URL to your PC's LAN IP (localhost points at the phone itself).
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1';

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export type Api = <T>(path: string, init?: { method?: string; body?: unknown }) => Promise<T>;

export function useApi(): Api {
  const { getToken } = useAuth();
  return useCallback(
    async <T,>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> => {
      const token = await getToken();
      const res = await fetch(`${API_URL}${path}`, {
        method: init.method ?? 'GET',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
      });
      const text = await res.text();
      const data = text ? JSON.parse(text) : null;
      if (!res.ok) {
        const msg = Array.isArray(data?.message) ? data.message.join('\n') : (data?.message ?? res.statusText);
        throw new ApiError(res.status, msg);
      }
      return data as T;
    },
    [getToken],
  );
}

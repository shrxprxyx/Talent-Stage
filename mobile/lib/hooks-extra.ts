import { useAuth } from '@clerk/expo';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { type Api, useApi } from './api';
import { useMe } from './hooks';

export type AppNotification = {
  id: string; type: string; title: string; body: string;
  data: { projectId?: string; proposalId?: string; contractId?: string } | null;
  readAt: string | null; createdAt: string;
};
export type NotificationPage = { items: AppNotification[]; total: number; unread: number; page: number; limit: number };
export type ClientProfile = { id: string; companyName: string | null; bio: string | null; ratingAvg: number; ratingCount: number };

function useAction<V, R = unknown>(run: (api: Api, v: V) => Promise<R>, invalidate: string[]) {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: V) => run(api, v),
    onSuccess: () => { invalidate.forEach((k) => qc.invalidateQueries({ queryKey: [k] })); },
  });
}

// ---------- notifications ----------
export function useNotifications() {
  const api = useApi();
  const { isSignedIn } = useAuth();
  return useQuery({
    queryKey: ['notifications', 'list'],
    queryFn: () => api<NotificationPage>('/notifications?limit=50'),
    enabled: !!isSignedIn,
    refetchInterval: 30_000,
  });
}

export function useUnreadCount() {
  const api = useApi();
  const { isSignedIn } = useAuth();
  const q = useQuery({
    queryKey: ['notifications', 'unread'],
    queryFn: () => api<{ unread: number }>('/notifications/unread-count'),
    enabled: !!isSignedIn,
    refetchInterval: 20_000,
  });
  return q.data?.unread ?? 0;
}

export const useMarkRead = () => useAction((api, id: string) => api(`/notifications/${id}/read`, { method: 'POST' }), ['notifications']);
export const useMarkAllRead = () => useAction((api, _: void) => api('/notifications/read-all', { method: 'POST' }), ['notifications']);

// ---------- profiles ----------
export function useMyClient() {
  const api = useApi();
  const enabled = !!useMe().data?.roles.includes('CLIENT');
  return useQuery({ queryKey: ['client', 'me'], queryFn: () => api<ClientProfile>('/clients/me'), enabled });
}

export type FreelancerPatch = { headline?: string; bio?: string; hourlyRate?: number; location?: string; available?: boolean };
export const useUpdateFreelancer = () => useAction((api, body: FreelancerPatch) => api('/freelancers/me', { method: 'PATCH', body }), ['freelancer']);
export const useSetSkills = () =>
  useAction((api, skills: { skillId: string; yearsExp?: number }[]) => api('/freelancers/me/skills', { method: 'PUT', body: { skills } }), ['freelancer']);
export const useUpdateClient = () =>
  useAction((api, body: { companyName?: string; bio?: string }) => api('/clients/me', { method: 'PATCH', body }), ['client']);

import { useAuth } from '@clerk/expo';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { type Api, useApi } from './api';
import type { FreelancerProfile, Me, Page, Project, Proposal, Role, Skill } from './types';

export type BrowseFilters = { q?: string; skillId?: string; minBudget?: string; maxBudget?: string; sort?: 'newest' | 'budget' };

export function useMe() {
  const api = useApi();
  const { isSignedIn } = useAuth();
  return useQuery({ queryKey: ['me'], queryFn: () => api<Me>('/users/me'), enabled: !!isSignedIn });
}

const useHasRole = (role: Role) => !!useMe().data?.roles.includes(role);

export function useSkills() {
  const api = useApi();
  const { isSignedIn } = useAuth();
  return useQuery({ queryKey: ['skills'], queryFn: () => api<Skill[]>('/skills'), enabled: !!isSignedIn, staleTime: 10 * 60_000 });
}

export function useBrowse(f: BrowseFilters) {
  const api = useApi();
  return useQuery({
    queryKey: ['projects', 'browse', f],
    queryFn: () => {
      const qs = new URLSearchParams({ limit: '30' });
      (Object.keys(f) as (keyof BrowseFilters)[]).forEach((k) => { if (f[k]) qs.set(k, String(f[k])); });
      return api<Page<Project>>(`/projects?${qs}`);
    },
  });
}

export const useMyProjects = () => {
  const api = useApi();
  return useQuery({ queryKey: ['projects', 'mine'], queryFn: () => api<Project[]>('/projects/mine'), enabled: useHasRole('CLIENT') });
};

export const useProject = (id: string) => {
  const api = useApi();
  return useQuery({ queryKey: ['projects', id], queryFn: () => api<Project>(`/projects/${id}`), enabled: !!id });
};

export const useMyProposals = () => {
  const api = useApi();
  return useQuery({ queryKey: ['proposals', 'mine'], queryFn: () => api<Proposal[]>('/proposals/mine'), enabled: useHasRole('FREELANCER') });
};

export const useProjectProposals = (projectId: string, enabled: boolean) => {
  const api = useApi();
  return useQuery({ queryKey: ['proposals', 'project', projectId], queryFn: () => api<Proposal[]>(`/projects/${projectId}/proposals`), enabled });
};

export const useMyFreelancer = () => {
  const api = useApi();
  return useQuery({ queryKey: ['freelancer', 'me'], queryFn: () => api<FreelancerProfile>('/freelancers/me'), enabled: useHasRole('FREELANCER') });
};

// Small factory: run a request, then refetch the affected lists.
function useAction<V, R = unknown>(run: (api: Api, v: V) => Promise<R>, invalidate: string[]) {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: V) => run(api, v),
    onSuccess: () => { invalidate.forEach((k) => qc.invalidateQueries({ queryKey: [k] })); },
  });
}

const ALL = ['me', 'projects', 'proposals', 'freelancer'];

export const useAddRole = () => useAction((api, role: Role) => api<Me>('/users/me/roles', { method: 'POST', body: { role } }), ALL);
export const useSetActiveRole = () => useAction((api, role: Role) => api<Me>('/users/me/active-role', { method: 'PATCH', body: { role } }), ALL);
export const useUpdateMe = () => useAction((api, body: { name?: string }) => api<Me>('/users/me', { method: 'PATCH', body }), ['me']);

export type NewProject = { title: string; description: string; budgetMin: number; budgetMax: number; deadline?: string; skillIds: string[]; publish: boolean };
export const useCreateProject = () => useAction((api, body: NewProject) => api<Project>('/projects', { method: 'POST', body }), ['projects']);
export const useProjectAction = () =>
  useAction((api, v: { id: string; action: 'publish' | 'cancel' }) => api<Project>(`/projects/${v.id}/${v.action}`, { method: 'POST' }), ['projects', 'proposals']);

export type NewProposal = { projectId: string; coverLetter: string; bidAmount: number; estimatedDays: number };
export const useSubmitProposal = () =>
  useAction((api, { projectId, ...body }: NewProposal) => api<Proposal>(`/projects/${projectId}/proposals`, { method: 'POST', body }), ['proposals', 'projects']);
export const useProposalAction = () =>
  useAction((api, v: { id: string; action: 'withdraw' | 'accept' | 'reject' }) => api<unknown>(`/proposals/${v.id}/${v.action}`, { method: 'POST' }), ['proposals', 'projects']);

export const useAddPortfolio = () =>
  useAction((api, body: { title: string; description?: string; link?: string }) => api('/freelancers/me/portfolio', { method: 'POST', body }), ['freelancer']);
export const useDeletePortfolio = () =>
  useAction((api, id: string) => api(`/freelancers/me/portfolio/${id}`, { method: 'DELETE' }), ['freelancer']);

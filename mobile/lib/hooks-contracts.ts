import { useAuth } from '@clerk/expo';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { type Api, useApi } from './api';
import type { Role } from './types';

export type ContractStatus = 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'DISPUTED';
export type MilestoneStatus = 'PENDING' | 'FUNDED' | 'SUBMITTED' | 'REVISION_REQUESTED' | 'APPROVED' | 'RELEASED' | 'CANCELLED';
export type PaymentStatus = 'REQUIRES_PAYMENT' | 'HELD' | 'RELEASED' | 'REFUNDED' | 'FAILED';

type UserBrief = { id: string; name: string; avatarUrl: string | null };

export type Deliverable = { id: string; note: string | null; fileKeys: string[]; feedback: string | null; submittedAt: string };

export type Milestone = {
  id: string; order: number; title: string; description: string | null; amount: string; dueDate: string | null;
  status: MilestoneStatus;
  payment: { status: PaymentStatus; amount: string; currency: string } | null;
  deliverables: Deliverable[];
};

export type Contract = {
  id: string; status: ContractStatus; totalAmount: string;
  startedAt: string | null; completedAt: string | null; createdAt: string;
  project: { id: string; title: string; status: string };
  client: { id: string; userId: string; companyName: string | null; user: UserBrief };
  freelancer: { id: string; userId: string; headline: string | null; user: UserBrief };
  milestones: Milestone[];
  myRole: Role;
};

export type ContractListItem = {
  id: string; status: ContractStatus; totalAmount: string;
  startedAt: string | null; completedAt: string | null; createdAt: string;
  project: { id: string; title: string };
  client: { userId: string; companyName: string | null; user: UserBrief };
  freelancer: { userId: string; user: UserBrief };
  myRole: Role;
  progress: { total: number; released: number };
};

export type MilestoneDetail = Omit<Milestone, never> & { contractId: string; contractStatus: ContractStatus; myRole: Role };
export type MilestoneInput = { title: string; description?: string; amount: number; dueDate?: string };

const KEYS = ['contracts', 'milestones', 'notifications', 'projects', 'proposals', 'freelancer'];

function useAction<V, R = unknown>(run: (api: Api, v: V) => Promise<R>) {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: V) => run(api, v),
    onSuccess: () => { KEYS.forEach((k) => qc.invalidateQueries({ queryKey: [k] })); },
  });
}

/* ------------------------------ queries ------------------------------ */

export function useContracts() {
  const api = useApi();
  const { isSignedIn } = useAuth();
  return useQuery({ queryKey: ['contracts', 'list'], queryFn: () => api<ContractListItem[]>('/contracts'), enabled: !!isSignedIn });
}

export function useContract(id: string) {
  const api = useApi();
  return useQuery({ queryKey: ['contracts', id], queryFn: () => api<Contract>(`/contracts/${id}`), enabled: !!id });
}

export function useMilestone(id: string) {
  const api = useApi();
  return useQuery({ queryKey: ['milestones', id], queryFn: () => api<MilestoneDetail>(`/milestones/${id}`), enabled: !!id });
}

/* ------------------------------ actions ------------------------------ */

export const useSetMilestones = () =>
  useAction((api, v: { contractId: string; milestones: MilestoneInput[] }) =>
    api<Contract>(`/contracts/${v.contractId}/milestones`, { method: 'PUT', body: { milestones: v.milestones } }));

export const useActivateContract = () => useAction((api, id: string) => api<Contract>(`/contracts/${id}/activate`, { method: 'POST' }));
export const useCancelContract = () => useAction((api, id: string) => api<Contract>(`/contracts/${id}/cancel`, { method: 'POST' }));

export const useFundMilestone = () => useAction((api, id: string) => api<MilestoneDetail>(`/milestones/${id}/fund`, { method: 'POST' }));
export const useSubmitWork = () =>
  useAction((api, v: { id: string; note: string }) => api<MilestoneDetail>(`/milestones/${v.id}/deliverables`, { method: 'POST', body: { note: v.note } }));
export const useApproveMilestone = () =>
  useAction((api, id: string) => api<MilestoneDetail & { contractCompleted: boolean }>(`/milestones/${id}/approve`, { method: 'POST' }));
export const useRequestRevision = () =>
  useAction((api, v: { id: string; feedback: string }) =>
    api<MilestoneDetail>(`/milestones/${v.id}/request-revision`, { method: 'POST', body: { feedback: v.feedback } }));

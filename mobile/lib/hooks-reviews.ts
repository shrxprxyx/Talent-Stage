import { useAuth } from '@clerk/expo';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApi } from './api';

type Reviewer = { id: string; name: string; avatarUrl: string | null };

export type Review = { id: string; rating: number; comment: string | null; createdAt: string; reviewerId: string; reviewer: Reviewer };
export type ContractReviews = { mine: Review | null; theirs: Review | null; canReview: boolean };
export type ReceivedReview = Review & { contract: { project: { id: string; title: string } } };
export type UserReviews = { items: ReceivedReview[]; total: number; average: number; page: number; limit: number };

export function useContractReviews(contractId: string) {
  const api = useApi();
  return useQuery({ queryKey: ['reviews', 'contract', contractId], queryFn: () => api<ContractReviews>(`/contracts/${contractId}/reviews`), enabled: !!contractId });
}

/** Reviews received by the signed-in user ("me") or another user, optionally as FREELANCER or CLIENT. */
export function useUserReviews(userId: string, role?: 'FREELANCER' | 'CLIENT') {
  const api = useApi();
  const { isSignedIn } = useAuth();
  return useQuery({
    queryKey: ['reviews', 'user', userId, role ?? 'all'],
    queryFn: () => api<UserReviews>(`/users/${userId}/reviews${role ? `?role=${role}` : ''}`),
    enabled: !!isSignedIn,
  });
}

export function useSubmitReview() {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { contractId: string; rating: number; comment?: string }) =>
      api<ContractReviews>(`/contracts/${v.contractId}/reviews`, { method: 'POST', body: { rating: v.rating, comment: v.comment } }),
    onSuccess: () => {
      ['reviews', 'notifications', 'freelancer', 'client', 'contracts'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
    },
  });
}

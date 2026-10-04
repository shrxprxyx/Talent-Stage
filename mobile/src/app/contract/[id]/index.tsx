import { router, useLocalSearchParams } from 'expo-router';
import { Alert, Pressable, View } from 'react-native';
import { ContractStatusChip, MilestoneStatusChip } from '../../../../components/contract-ui';
import { BackLink, Button, Card, ErrorBox, Meta, Screen, SectionLabel, T } from '../../../../components/ui';
import { fmtDate, money } from '../../../../lib/format';
import {
  type Milestone, useActivateContract, useCancelContract, useContract, useFundMilestone,
} from '../../../../lib/hooks-contracts';

export default function ContractDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const q = useContract(id);
  const activate = useActivateContract();
  const cancel = useCancelContract();
  const fund = useFundMilestone();

  if (q.isLoading) return <Screen><BackLink /><T className="py-8 text-center text-muted-foreground">Loading…</T></Screen>;
  if (q.error || !q.data) {
    return <Screen><BackLink /><ErrorBox message={q.error?.message ?? 'Contract not found'} onRetry={() => q.refetch()} /></Screen>;
  }

  const c = q.data;
  const isClient = c.myRole === 'CLIENT';
  const hasMilestones = c.milestones.length > 0;
  const other = isClient ? c.freelancer.user.name : (c.client.companyName ?? c.client.user.name);
  const fail = (title: string) => (e: Error) => Alert.alert(title, e.message);

  const confirmFund = (m: Milestone) =>
    Alert.alert('Fund this milestone?', `${money(m.amount)} will be held for "${m.title}". Payments are simulated for now, so no real money moves.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Fund', onPress: () => fund.mutate(m.id, { onError: fail('Could not fund') }) },
    ]);

  const confirmCancel = () =>
    Alert.alert('Cancel this contract?', 'This also cancels the project. It is only possible while no money is held or released.', [
      { text: 'Keep it', style: 'cancel' },
      { text: 'Cancel contract', style: 'destructive', onPress: () => cancel.mutate(c.id, { onError: fail('Could not cancel') }) },
    ]);

  return (
    <Screen onRefresh={() => q.refetch()} refreshing={q.isRefetching}>
      <BackLink />
      <ContractStatusChip status={c.status} />
      <T className="mt-2 font-display text-[28px] leading-[34px]">{c.project.title}</T>
      <T className="mt-1 text-sm text-muted-foreground">{isClient ? 'Freelancer' : 'Client'}: {other}</T>
      <View className="mt-4 flex-row flex-wrap gap-x-4 gap-y-1">
        <Meta icon="dollar-sign" text={`Total ${money(c.totalAmount)}`} />
        {c.startedAt ? <Meta icon="play" text={`Started ${fmtDate(c.startedAt)}`} /> : null}
        {c.completedAt ? <Meta icon="check-circle" text={`Completed ${fmtDate(c.completedAt)}`} /> : null}
      </View>

      {/* what happens next */}
      {c.status === 'DRAFT' && isClient ? (
        <Card className="mt-6">
          <T className="font-display text-lg">{hasMilestones ? 'Waiting for the freelancer' : 'Set up milestones'}</T>
          <T className="mt-1 text-sm text-muted-foreground">
            {hasMilestones
              ? 'The freelancer needs to review and accept the milestones. You can still edit them until then.'
              : 'Split the total into milestones. The freelancer reviews them and accepts the contract.'}
          </T>
          <Button title={hasMilestones ? 'Edit milestones' : 'Set milestones'} icon="list" onPress={() => router.push(`/contract/${c.id}/milestones`)} className="mt-3" />
        </Card>
      ) : null}

      {c.status === 'DRAFT' && !isClient ? (
        <Card className="mt-6">
          <T className="font-display text-lg">{hasMilestones ? 'Review and accept' : 'Waiting for the client'}</T>
          <T className="mt-1 text-sm text-muted-foreground">
            {hasMilestones
              ? 'Check the milestones below. Once you accept, the client can start funding them.'
              : 'The client has not set the milestones yet.'}
          </T>
          {hasMilestones ? (
            <Button title="Accept contract" icon="check" onPress={() => activate.mutate(c.id, { onError: fail('Could not accept') })} loading={activate.isPending} className="mt-3" />
          ) : null}
        </Card>
      ) : null}

      {c.status === 'ACTIVE' ? (
        <T className="mt-6 text-sm text-muted-foreground">
          {isClient ? 'Fund a milestone so the freelancer can start, then review the work they submit.' : 'Start work on any funded milestone, then submit it for review.'}
        </T>
      ) : null}
      {c.status === 'COMPLETED' ? <T className="mt-6 text-sm text-emerald-400">All milestones are paid. This contract is complete.</T> : null}
      {c.status === 'CANCELLED' ? <T className="mt-6 text-sm text-red-400">This contract was cancelled.</T> : null}

      <SectionLabel>Milestones</SectionLabel>
      {!hasMilestones ? <T className="text-sm text-muted-foreground">No milestones yet.</T> : null}
      {c.milestones.map((m) => (
        <Card key={m.id} className="mb-3">
          <Pressable onPress={() => router.push(`/milestone/${m.id}`)} className="active:opacity-80">
            <View className="flex-row items-start justify-between gap-3">
              <T className="flex-1 font-display text-lg">{m.order}. {m.title}</T>
              <MilestoneStatusChip status={m.status} />
            </View>
            {m.description ? <T numberOfLines={2} className="mt-1 text-sm text-muted-foreground">{m.description}</T> : null}
            <View className="mt-3 flex-row flex-wrap gap-x-4 gap-y-1">
              <Meta icon="dollar-sign" text={money(m.amount)} />
              {m.dueDate ? <Meta icon="calendar" text={`Due ${fmtDate(m.dueDate)}`} /> : null}
            </View>
          </Pressable>

          {c.status === 'ACTIVE' && isClient && m.status === 'PENDING' ? (
            <Button title={`Fund ${money(m.amount)}`} icon="credit-card" onPress={() => confirmFund(m)} loading={fund.isPending} className="mt-3" />
          ) : null}
          {c.status === 'ACTIVE' && isClient && m.status === 'SUBMITTED' ? (
            <Button title="Review work" icon="eye" onPress={() => router.push(`/milestone/${m.id}`)} className="mt-3" />
          ) : null}
          {c.status === 'ACTIVE' && !isClient && (m.status === 'FUNDED' || m.status === 'REVISION_REQUESTED') ? (
            <Button title="Submit work" icon="upload" onPress={() => router.push(`/milestone/${m.id}`)} className="mt-3" />
          ) : null}
        </Card>
      ))}

      <T className="mt-2 text-xs text-muted-foreground">Payments are simulated for now. Stripe test-mode funding comes next.</T>

      {c.status === 'DRAFT' || c.status === 'ACTIVE' ? (
        <View className="mt-8">
          <Button title="Cancel contract" variant="danger" onPress={confirmCancel} loading={cancel.isPending} />
        </View>
      ) : null}
    </Screen>
  );
}

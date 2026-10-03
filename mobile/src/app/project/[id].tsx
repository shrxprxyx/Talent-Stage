import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, View } from 'react-native';
import {
  BackLink, Button, Card, Chip, Empty, ErrorBox, Field, Meta, ProjectStatusChip, ProposalStatusChip, Screen, SectionLabel, T,
} from '../../../components/ui';
import { ago, budget, days, fmtDate, money } from '../../../lib/format';
import {
  useMe, useMyProposals, useProject, useProjectAction, useProjectProposals, useProposalAction, useSubmitProposal,
} from '../../../lib/hooks';
import type { Project, Proposal } from '../../../lib/types';

export default function ProjectDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const me = useMe();
  const project = useProject(id);

  if (project.isLoading) return <Screen><BackLink /><T className="py-8 text-center text-muted-foreground">Loading…</T></Screen>;
  if (project.error || !project.data) {
    return <Screen><BackLink /><ErrorBox message={project.error?.message ?? 'Project not found'} onRetry={() => project.refetch()} /></Screen>;
  }

  const p = project.data;
  const isOwner = me.data?.id === p.client.user.id;
  const isFreelancer = !isOwner && me.data?.activeRole === 'FREELANCER';
  const n = p._count.proposals;

  return (
    <Screen onRefresh={() => project.refetch()} refreshing={project.isRefetching}>
      <BackLink />
      <ProjectStatusChip status={p.status} />
      <T className="mt-2 font-display text-[28px] leading-[34px]">{p.title}</T>
      <T className="mt-1 text-sm text-muted-foreground">by {p.client.companyName ?? p.client.user.name} · posted {ago(p.createdAt)}</T>

      <View className="mt-4 flex-row flex-wrap gap-x-4 gap-y-1">
        <Meta icon="dollar-sign" text={budget(p.budgetMin, p.budgetMax)} />
        {p.deadline ? <Meta icon="clock" text={`Due ${fmtDate(p.deadline)}`} /> : null}
        <Meta icon="users" text={`${n} proposal${n === 1 ? '' : 's'}`} />
      </View>
      <View className="mt-4 flex-row flex-wrap gap-1.5">
        {p.skills.map((s) => <Chip key={s.skill.id} label={s.skill.name} tone="amber" />)}
      </View>

      <SectionLabel>About this project</SectionLabel>
      <T className="text-sm leading-6">{p.description}</T>

      {isOwner ? <OwnerSection p={p} /> : null}
      {isFreelancer ? <FreelancerSection p={p} /> : null}
    </Screen>
  );
}

/* ------------------------------ client side ------------------------------ */

function OwnerSection({ p }: { p: Project }) {
  const life = useProjectAction();
  const list = useProjectProposals(p.id, true);
  const decide = useProposalAction();

  const run = (action: 'publish' | 'cancel') => {
    const go = () => life.mutate({ id: p.id, action }, { onError: (e) => Alert.alert('Action failed', e.message) });
    if (action === 'publish') return go();
    Alert.alert('Cancel this project?', 'Freelancers will no longer be able to send proposals.', [
      { text: 'Keep it', style: 'cancel' },
      { text: 'Cancel project', style: 'destructive', onPress: go },
    ]);
  };

  const accept = (pr: Proposal) =>
    Alert.alert('Accept this proposal?', 'Other pending proposals will be rejected and a draft contract is created.', [
      { text: 'Not now', style: 'cancel' },
      { text: 'Accept', onPress: () => decide.mutate({ id: pr.id, action: 'accept' }, { onError: (e) => Alert.alert('Could not accept', e.message) }) },
    ]);
  const reject = (pr: Proposal) =>
    decide.mutate({ id: pr.id, action: 'reject' }, { onError: (e) => Alert.alert('Could not reject', e.message) });

  return (
    <View>
      {p.status === 'DRAFT' ? <Button title="Publish project" icon="upload" onPress={() => run('publish')} loading={life.isPending} className="mt-6" /> : null}
      {p.status === 'DRAFT' || p.status === 'OPEN' ? <Button title="Cancel project" variant="danger" onPress={() => run('cancel')} disabled={life.isPending} className="mt-3" /> : null}

      <SectionLabel>Proposals</SectionLabel>
      {list.isLoading ? <T className="text-sm text-muted-foreground">Loading proposals…</T> : null}
      {list.error ? <ErrorBox message={list.error.message} onRetry={() => list.refetch()} /> : null}
      {list.data && list.data.length === 0 ? <Empty title="No proposals yet" hint={p.status === 'DRAFT' ? 'Publish the project so freelancers can apply.' : 'Check back soon.'} /> : null}
      {list.data?.map((pr) => (
        <Card key={pr.id} className="mb-3">
          <View className="flex-row items-start justify-between gap-3">
            <View className="flex-1">
              <T className="font-display text-lg">{pr.freelancer.user.name}</T>
              {pr.freelancer.headline ? <T className="text-sm text-muted-foreground">{pr.freelancer.headline}</T> : null}
            </View>
            <ProposalStatusChip status={pr.status} />
          </View>
          <View className="mt-3 flex-row flex-wrap gap-x-4 gap-y-1">
            <Meta icon="dollar-sign" text={`Bid ${money(pr.bidAmount)}`} />
            <Meta icon="clock" text={days(pr.estimatedDays)} />
            <Meta icon="star" text={pr.freelancer.ratingCount > 0 ? `${pr.freelancer.ratingAvg.toFixed(1)} (${pr.freelancer.ratingCount})` : 'New'} />
            <Meta icon="check-circle" text={`${pr.freelancer.completedCount} completed`} />
          </View>
          <T className="mt-3 text-sm leading-6">{pr.coverLetter}</T>
          {pr.status === 'PENDING' && p.status === 'OPEN' ? (
            <View className="mt-4 flex-row gap-2">
              <Button title="Accept" icon="check" onPress={() => accept(pr)} disabled={decide.isPending} className="flex-1" />
              <Button title="Reject" variant="outline" onPress={() => reject(pr)} disabled={decide.isPending} className="flex-1" />
            </View>
          ) : null}
        </Card>
      ))}
    </View>
  );
}

/* ---------------------------- freelancer side ---------------------------- */

function FreelancerSection({ p }: { p: Project }) {
  const mine = useMyProposals();
  const act = useProposalAction();

  if (mine.isLoading) return <T className="mt-6 text-sm text-muted-foreground">Loading…</T>;
  const existing = mine.data?.find((x) => x.projectId === p.id);

  if (existing) {
    const withdraw = () =>
      Alert.alert('Withdraw proposal?', 'The client will no longer see it.', [
        { text: 'Keep it', style: 'cancel' },
        { text: 'Withdraw', style: 'destructive', onPress: () => act.mutate({ id: existing.id, action: 'withdraw' }, { onError: (e) => Alert.alert('Could not withdraw', e.message) }) },
      ]);
    return (
      <View>
        <SectionLabel>Your proposal</SectionLabel>
        <Card>
          <View className="flex-row items-center justify-between">
            <T className="font-display text-lg">{money(existing.bidAmount)} · {days(existing.estimatedDays)}</T>
            <ProposalStatusChip status={existing.status} />
          </View>
          <T className="mt-3 text-sm leading-6">{existing.coverLetter}</T>
          <T className="mt-2 text-xs text-muted-foreground">Sent {ago(existing.createdAt)}</T>
          {existing.status === 'PENDING' ? <Button title="Withdraw" variant="danger" onPress={withdraw} loading={act.isPending} className="mt-4" /> : null}
        </Card>
      </View>
    );
  }

  if (p.status !== 'OPEN') return <View className="mt-6"><Empty title="Closed to proposals" hint="This project is no longer accepting new proposals." /></View>;
  return <ProposalForm p={p} />;
}

function ProposalForm({ p }: { p: Project }) {
  const submit = useSubmitProposal();
  const [cover, setCover] = useState('');
  const [bid, setBid] = useState('');
  const [timeline, setTimeline] = useState('');

  const send = () => {
    const bidAmount = Number(bid);
    const estimatedDays = Number(timeline);
    if (cover.trim().length < 30) return Alert.alert('Cover letter too short', 'Write at least 30 characters about why you are a fit.');
    if (!Number.isFinite(bidAmount) || bidAmount < 1) return Alert.alert('Check your bid', 'Enter a bid of at least $1.');
    if (!Number.isInteger(estimatedDays) || estimatedDays < 1 || estimatedDays > 730) return Alert.alert('Check your timeline', 'Enter whole days between 1 and 730.');
    submit.mutate(
      { projectId: p.id, coverLetter: cover.trim(), bidAmount, estimatedDays },
      { onSuccess: () => Alert.alert('Proposal sent', 'The client has been notified.'), onError: (e) => Alert.alert('Could not send proposal', e.message) },
    );
  };

  return (
    <View>
      <SectionLabel>Send a proposal</SectionLabel>
      <Field label="Cover letter" required multiline value={cover} onChangeText={setCover} placeholder="Why are you the right person for this project?" hint={`${cover.trim().length}/30 characters minimum`} />
      <Field label="Your bid (USD)" required keyboardType="decimal-pad" value={bid} onChangeText={setBid} placeholder="500" hint={`Client budget: ${budget(p.budgetMin, p.budgetMax)}`} />
      <Field label="Timeline (days)" required keyboardType="number-pad" value={timeline} onChangeText={setTimeline} placeholder="14" />
      <Button title="Send proposal" icon="send" onPress={send} loading={submit.isPending} />
    </View>
  );
}

import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, View } from 'react-native';
import { MilestoneStatusChip } from '../../../components/contract-ui';
import { BackLink, Button, Card, ErrorBox, Field, Meta, Screen, SectionLabel, T } from '../../../components/ui';
import { ago, fmtDate, money } from '../../../lib/format';
import { useApproveMilestone, useFundMilestone, useMilestone, useRequestRevision, useSubmitWork } from '../../../lib/hooks-contracts';

export default function MilestoneDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const q = useMilestone(id);
  const fund = useFundMilestone();
  const submit = useSubmitWork();
  const approve = useApproveMilestone();
  const revise = useRequestRevision();
  const [note, setNote] = useState('');
  const [feedback, setFeedback] = useState('');

  if (q.isLoading) return <Screen><BackLink /><T className="py-8 text-center text-muted-foreground">Loading…</T></Screen>;
  if (q.error || !q.data) return <Screen><BackLink /><ErrorBox message={q.error?.message ?? 'Milestone not found'} onRetry={() => q.refetch()} /></Screen>;

  const m = q.data;
  const isClient = m.myRole === 'CLIENT';
  const active = m.contractStatus === 'ACTIVE';
  const fail = (title: string) => (e: Error) => Alert.alert(title, e.message);

  const confirmFund = () =>
    Alert.alert('Fund this milestone?', `${money(m.amount)} will be held. Payments are simulated for now, so no real money moves.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Fund', onPress: () => fund.mutate(m.id, { onError: fail('Could not fund') }) },
    ]);

  const confirmApprove = () =>
    Alert.alert('Approve and release payment?', `${money(m.amount)} will be released to the freelancer. Payments are simulated for now.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Approve',
        onPress: () => approve.mutate(m.id, {
          onSuccess: (res) => Alert.alert(res.contractCompleted ? 'Contract complete' : 'Payment released', res.contractCompleted ? 'All milestones are paid. Nice work.' : 'This milestone is marked as paid.'),
          onError: fail('Could not approve'),
        }),
      },
    ]);

  const sendWork = () => {
    if (note.trim().length < 10) return Alert.alert('Describe your work', 'Write at least 10 characters about what you delivered.');
    submit.mutate({ id: m.id, note: note.trim() }, {
      onSuccess: () => { setNote(''); Alert.alert('Submitted', 'The client has been notified.'); },
      onError: fail('Could not submit'),
    });
  };

  const sendRevision = () => {
    if (feedback.trim().length < 5) return Alert.alert('Add feedback', 'Tell the freelancer what to change (at least 5 characters).');
    revise.mutate({ id: m.id, feedback: feedback.trim() }, {
      onSuccess: () => { setFeedback(''); Alert.alert('Sent', 'The freelancer has been asked for changes.'); },
      onError: fail('Could not send feedback'),
    });
  };

  const waiting =
    !isClient && m.status === 'PENDING' ? 'Waiting for the client to fund this milestone.'
    : !isClient && m.status === 'SUBMITTED' ? 'Submitted. Waiting for the client to review your work.'
    : isClient && (m.status === 'FUNDED' || m.status === 'REVISION_REQUESTED') ? 'Funded. Waiting for the freelancer to submit work.'
    : m.status === 'RELEASED' ? 'This milestone is paid.'
    : m.status === 'CANCELLED' ? 'This milestone was cancelled.'
    : null;

  return (
    <Screen onRefresh={() => q.refetch()} refreshing={q.isRefetching}>
      <BackLink />
      <MilestoneStatusChip status={m.status} />
      <T className="mt-2 font-display text-[28px] leading-[34px]">{m.order}. {m.title}</T>
      <View className="mt-3 flex-row flex-wrap gap-x-4 gap-y-1">
        <Meta icon="dollar-sign" text={money(m.amount)} />
        {m.dueDate ? <Meta icon="calendar" text={`Due ${fmtDate(m.dueDate)}`} /> : null}
        {m.payment ? <Meta icon="credit-card" text={`Payment: ${m.payment.status.toLowerCase().replace('_', ' ')}`} /> : null}
      </View>
      {m.description ? <T className="mt-4 text-sm leading-6">{m.description}</T> : null}

      <SectionLabel>Submissions</SectionLabel>
      {m.deliverables.length === 0 ? <T className="text-sm text-muted-foreground">Nothing submitted yet.</T> : null}
      {m.deliverables.map((d) => (
        <Card key={d.id} className="mb-3">
          <T className="text-xs text-muted-foreground">Submitted {ago(d.submittedAt)}</T>
          {d.note ? <T className="mt-1 text-sm leading-6">{d.note}</T> : null}
          {d.fileKeys.length > 0 ? <T className="mt-1 text-xs text-muted-foreground">{d.fileKeys.length} file{d.fileKeys.length > 1 ? 's' : ''} attached</T> : null}
          {d.feedback ? (
            <View className="mt-3 rounded-xl border border-primary/30 bg-primary/10 p-3">
              <T className="text-xs text-primary">Client feedback</T>
              <T className="mt-1 text-sm">{d.feedback}</T>
            </View>
          ) : null}
        </Card>
      ))}

      {waiting ? <T className="mt-2 text-sm text-muted-foreground">{waiting}</T> : null}

      {/* client actions */}
      {isClient && active && m.status === 'PENDING' ? <Button title={`Fund ${money(m.amount)}`} icon="credit-card" onPress={confirmFund} loading={fund.isPending} className="mt-4" /> : null}
      {isClient && active && m.status === 'SUBMITTED' ? (
        <View className="mt-4">
          <Button title="Approve and release payment" icon="check" onPress={confirmApprove} loading={approve.isPending} />
          <SectionLabel>Or ask for changes</SectionLabel>
          <Field label="Feedback" multiline value={feedback} onChangeText={setFeedback} placeholder="What should the freelancer change?" />
          <Button title="Request changes" variant="outline" onPress={sendRevision} loading={revise.isPending} />
        </View>
      ) : null}

      {/* freelancer actions */}
      {!isClient && active && (m.status === 'FUNDED' || m.status === 'REVISION_REQUESTED') ? (
        <View className="mt-4">
          <SectionLabel>{m.status === 'REVISION_REQUESTED' ? 'Submit your changes' : 'Submit your work'}</SectionLabel>
          <Field label="What did you deliver?" required multiline value={note} onChangeText={setNote} placeholder="Describe the work and share links to files or designs." />
          <Button title="Submit for review" icon="upload" onPress={sendWork} loading={submit.isPending} />
        </View>
      ) : null}

      <T className="mt-8 text-xs text-muted-foreground">Payments are simulated for now. File uploads and Stripe test-mode payments come next.</T>
    </Screen>
  );
}

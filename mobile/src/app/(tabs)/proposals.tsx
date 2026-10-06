import { router } from 'expo-router';
import { Alert, Pressable, View } from 'react-native';
import { Button, Card, Display, Empty, ErrorBox, Meta, ProposalStatusChip, Screen, T } from '../../../components/ui';
import { ago, days, money } from '../../../lib/format';
import { useMyProposals, useProposalAction } from '../../../lib/hooks';

export default function Proposals() {
  const list = useMyProposals();
  const act = useProposalAction();

  const withdraw = (id: string) =>
    Alert.alert('Withdraw proposal?', 'The client will no longer see it.', [
      { text: 'Keep it', style: 'cancel' },
      { text: 'Withdraw', style: 'destructive', onPress: () => act.mutate({ id, action: 'withdraw' }, { onError: (e) => Alert.alert('Could not withdraw', e.message) }) },
    ]);

  return (
    <Screen onRefresh={() => list.refetch()} refreshing={list.isRefetching}>
      <Display lead="My" accent="Proposals" />
      <View className="mt-4">
        {list.isLoading ? <T className="py-8 text-center text-muted-foreground">Loading…</T> : null}
        {list.error ? <ErrorBox message={list.error.message} onRetry={() => list.refetch()} /> : null}
        {list.data && list.data.length === 0 ? <Empty title="No proposals yet" hint="Browse open projects and send your first proposal." /> : null}
        {list.data?.map((p) => (
          <Card key={p.id} className="mb-3">
            <Pressable onPress={() => router.push(`/project/${p.projectId}`)} className="active:opacity-80">
              <View className="flex-row items-start justify-between gap-3">
                <T className="flex-1 font-display text-lg">{p.project.title}</T>
                <ProposalStatusChip status={p.status} />
              </View>
              <T className="mt-0.5 text-xs text-muted-foreground">{p.project.client.companyName ?? p.project.client.user.name}</T>
              <T numberOfLines={2} className="mt-2 text-sm text-muted-foreground">{p.coverLetter}</T>
              {p.aiScore !== null && (
                <View className="mt-2 flex-row items-center gap-2 text-sm">
                  <Meta icon="sparkles" text={`AI Score: ${p.aiScore}`} />
                  {p.aiBreakdown && (
                    <T className="text-xs text-muted-foreground">
                      Skill:{p.aiBreakdown.skillFit} Clar:{p.aiBreakdown.clarity} Price:{p.aiBreakdown.pricing} Track:{p.aiBreakdown.track}
                    </T>
                  )}
                </View>
              )}
              <View className="mt-3 flex-row flex-wrap gap-x-4 gap-y-1">
                <Meta icon="dollar-sign" text={money(p.bidAmount)} />
                <Meta icon="clock" text={days(p.estimatedDays)} />
                <Meta icon="send" text={`Sent ${ago(p.createdAt)}`} />
              </View>
            </Pressable>
            {p.status === 'PENDING' ? <Button title="Withdraw" variant="danger" onPress={() => withdraw(p.id)} loading={act.isPending} className="mt-3" /> : null}
          </Card>
        ))}
      </View>
    </Screen>
  );
}

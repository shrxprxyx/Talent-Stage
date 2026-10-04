import { router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { Pressable, View } from 'react-native';
import { ContractStatusChip } from '../../../components/contract-ui';
import { Card, Display, Empty, ErrorBox, Meta, Screen, T } from '../../../components/ui';
import { fmtDate, money } from '../../../lib/format';
import { useContracts } from '../../../lib/hooks-contracts';

export default function Contracts() {
  const list = useContracts();
  const { refetch } = list;

  // accepted proposals create contracts elsewhere, so refresh whenever this tab is shown
  useFocusEffect(useCallback(() => { refetch(); }, [refetch]));

  return (
    <Screen onRefresh={() => list.refetch()} refreshing={list.isRefetching}>
      <Display lead="My" accent="Contracts" />
      <View className="mt-4">
        {list.isLoading ? <T className="py-8 text-center text-muted-foreground">Loading…</T> : null}
        {list.error ? <ErrorBox message={list.error.message} onRetry={() => list.refetch()} /> : null}
        {list.data && list.data.length === 0 ? <Empty title="No contracts yet" hint="When a client accepts a proposal, the contract shows up here." /> : null}
        {list.data?.map((c) => {
          const other = c.myRole === 'CLIENT' ? c.freelancer.user.name : (c.client.companyName ?? c.client.user.name);
          const pct = c.progress.total ? Math.round((c.progress.released / c.progress.total) * 100) : 0;
          return (
            <Pressable key={c.id} onPress={() => router.push(`/contract/${c.id}`)} className="active:opacity-80">
              <Card className="mb-3">
                <View className="flex-row items-start justify-between gap-3">
                  <T className="flex-1 font-display text-lg">{c.project.title}</T>
                  <ContractStatusChip status={c.status} />
                </View>
                <T className="mt-0.5 text-xs text-muted-foreground">{c.myRole === 'CLIENT' ? 'Freelancer' : 'Client'}: {other}</T>
                <View className="mt-3 flex-row flex-wrap gap-x-4 gap-y-1">
                  <Meta icon="dollar-sign" text={money(c.totalAmount)} />
                  <Meta icon="check-circle" text={`${c.progress.released}/${c.progress.total} milestones paid`} />
                  <Meta icon="calendar" text={`Created ${fmtDate(c.createdAt)}`} />
                </View>
                <View className="mt-3 h-1.5 overflow-hidden rounded-full bg-secondary">
                  <View className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                </View>
              </Card>
            </Pressable>
          );
        })}
      </View>
    </Screen>
  );
}

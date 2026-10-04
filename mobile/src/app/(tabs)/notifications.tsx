import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import { Button, Display, Empty, ErrorBox, Screen, T } from '../../../components/ui';
import { ago } from '../../../lib/format';
import { type AppNotification, useMarkAllRead, useMarkRead, useNotifications } from '../../../lib/hooks-extra';

export default function Notifications() {
  const list = useNotifications();
  const markRead = useMarkRead();
  const markAll = useMarkAllRead();

  const open = (n: AppNotification) => {
    if (!n.readAt) markRead.mutate(n.id);
    if (n.data?.milestoneId) router.push(`/milestone/${n.data.milestoneId}`);
    else if (n.data?.contractId) router.push(`/contract/${n.data.contractId}`);
    else if (n.data?.projectId) router.push(`/project/${n.data.projectId}`);
  };

  return (
    <Screen onRefresh={() => list.refetch()} refreshing={list.isRefetching}>
      <Display lead="Your" accent="Alerts" />
      {list.data && list.data.unread > 0 ? (
        <Button title={`Mark all read (${list.data.unread})`} variant="outline" onPress={() => markAll.mutate()} loading={markAll.isPending} className="mt-4" />
      ) : null}
      <View className="mt-4">
        {list.isLoading ? <T className="py-8 text-center text-muted-foreground">Loading…</T> : null}
        {list.error ? <ErrorBox message={list.error.message} onRetry={() => list.refetch()} /> : null}
        {list.data && list.data.items.length === 0 ? <Empty title="All caught up" hint="Proposal and contract updates will show up here." /> : null}
        {list.data?.items.map((n) => (
          <Pressable key={n.id} onPress={() => open(n)} className="mb-2 flex-row gap-3 rounded-2xl border border-border bg-card p-4 active:opacity-80">
            <View className={`mt-1.5 h-2 w-2 rounded-full ${n.readAt ? 'bg-transparent' : 'bg-primary'}`} />
            <View className="flex-1">
              <T className="font-sans-medium text-sm">{n.title}</T>
              <T className="mt-0.5 text-sm text-muted-foreground">{n.body}</T>
              <T className="mt-1 text-xs text-muted-foreground">{ago(n.createdAt)}</T>
            </View>
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}

import { useState } from 'react';
import { View } from 'react-native';
import { Stars } from '../../components/review-ui';
import { BackLink, Card, Chip, Display, Empty, ErrorBox, Screen, T } from '../../components/ui';
import { ago } from '../../lib/format';
import { useMe } from '../../lib/hooks';
import { useUserReviews } from '../../lib/hooks-reviews';

type Filter = 'FREELANCER' | 'CLIENT' | undefined;

export default function MyReviews() {
  const me = useMe();
  const [filter, setFilter] = useState<Filter>(undefined);
  const q = useUserReviews('me', filter);
  const both = !!me.data?.roles.includes('FREELANCER') && !!me.data?.roles.includes('CLIENT');

  return (
    <Screen onRefresh={() => q.refetch()} refreshing={q.isRefetching}>
      <BackLink />
      <Display lead="My" accent="Reviews" />

      {both ? (
        <View className="mt-4 flex-row gap-2">
          <Chip label="All" tone={!filter ? 'amber' : 'neutral'} onPress={() => setFilter(undefined)} />
          <Chip label="As freelancer" tone={filter === 'FREELANCER' ? 'amber' : 'neutral'} onPress={() => setFilter('FREELANCER')} />
          <Chip label="As client" tone={filter === 'CLIENT' ? 'amber' : 'neutral'} onPress={() => setFilter('CLIENT')} />
        </View>
      ) : null}

      {q.data && q.data.total > 0 ? (
        <Card className="mt-4 flex-row items-center gap-3">
          <T className="font-display text-3xl">{q.data.average.toFixed(1)}</T>
          <View>
            <Stars value={q.data.average} size="text-lg" />
            <T className="text-xs text-muted-foreground">{q.data.total} review{q.data.total === 1 ? '' : 's'}</T>
          </View>
        </Card>
      ) : null}

      <View className="mt-4">
        {q.isLoading ? <T className="py-8 text-center text-muted-foreground">Loading…</T> : null}
        {q.error ? <ErrorBox message={q.error.message} onRetry={() => q.refetch()} /> : null}
        {q.data && q.data.items.length === 0 ? <Empty title="No reviews yet" hint="Reviews appear here after you complete a contract." /> : null}
        {q.data?.items.map((r) => (
          <Card key={r.id} className="mb-3">
            <Stars value={r.rating} size="text-lg" />
            {r.comment ? <T className="mt-2 text-sm leading-6">{r.comment}</T> : null}
            <T className="mt-2 text-xs text-muted-foreground">{r.reviewer.name} · {r.contract.project.title} · {ago(r.createdAt)}</T>
          </Card>
        ))}
      </View>
    </Screen>
  );
}

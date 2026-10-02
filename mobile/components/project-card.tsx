import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import { ago, budget, fmtDate } from '../lib/format';
import { colors } from '../lib/theme';
import type { Project } from '../lib/types';
import { Chip, Meta, ProjectStatusChip, T } from './ui';

export function ProjectCard({ p, showStatus }: { p: Project; showStatus?: boolean }) {
  const n = p._count.proposals;
  return (
    <Pressable onPress={() => router.push(`/project/${p.id}`)} className="mb-3 rounded-2xl border border-border bg-card p-4 active:opacity-80">
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1 flex-row flex-wrap items-center gap-2">
          <T className="font-display text-lg">{p.title}</T>
          {showStatus ? <ProjectStatusChip status={p.status} /> : null}
        </View>
        <Feather name="arrow-up-right" size={16} color={colors.muted} />
      </View>
      <T numberOfLines={2} className="mt-1 text-sm text-muted-foreground">{p.description}</T>
      <View className="mt-3 flex-row flex-wrap gap-1.5">
        {p.skills.slice(0, 4).map((s) => <Chip key={s.skill.id} label={s.skill.name} tone="amber" />)}
      </View>
      <View className="mt-3 flex-row flex-wrap items-center gap-x-4 gap-y-1">
        <Meta icon="dollar-sign" text={budget(p.budgetMin, p.budgetMax)} />
        {p.deadline ? <Meta icon="clock" text={`Due ${fmtDate(p.deadline)}`} /> : null}
        <Meta icon="users" text={`${n} proposal${n === 1 ? '' : 's'}`} />
      </View>
      <T className="mt-2 text-xs text-muted-foreground">by {p.client.companyName ?? p.client.user.name} · posted {ago(p.createdAt)}</T>
    </Pressable>
  );
}

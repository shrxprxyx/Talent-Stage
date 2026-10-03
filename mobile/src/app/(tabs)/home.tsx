import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, TextInput, View } from 'react-native';
import { ProjectCard } from '../../../components/project-card';
import { Button, Chip, Display, Empty, ErrorBox, Screen, T } from '../../../components/ui';
import { useBrowse, useMe, useMyProjects, useSkills } from '../../../lib/hooks';
import { colors } from '../../../lib/theme';

export default function Home() {
  const me = useMe();
  return me.data?.activeRole === 'CLIENT' ? <ClientHome /> : <FreelancerHome />;
}

function FreelancerHome() {
  const [text, setText] = useState('');
  const [q, setQ] = useState('');
  const [skillId, setSkillId] = useState<string | undefined>();
  const [sort, setSort] = useState<'newest' | 'budget'>('newest');

  useEffect(() => {
    const t = setTimeout(() => setQ(text.trim()), 400);
    return () => clearTimeout(t);
  }, [text]);

  const skills = useSkills();
  const browse = useBrowse({ q: q || undefined, skillId, sort });

  return (
    <Screen onRefresh={() => browse.refetch()} refreshing={browse.isRefetching}>
      <Display lead="Browse" accent="Projects" />
      <T className="mb-4 mt-2 text-sm text-muted-foreground">Open projects looking for talent.</T>

      <View className="mb-3 flex-row items-center gap-2 rounded-xl border border-border bg-secondary px-3">
        <Feather name="search" size={16} color={colors.muted} />
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Search projects"
          placeholderTextColor={colors.muted}
          autoCapitalize="none"
          className="flex-1 py-3 font-sans text-foreground"
        />
      </View>

      <View className="mb-3 flex-row gap-2">
        <Chip label="Newest" tone={sort === 'newest' ? 'amber' : 'neutral'} onPress={() => setSort('newest')} />
        <Chip label="Highest budget" tone={sort === 'budget' ? 'amber' : 'neutral'} onPress={() => setSort('budget')} />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4" contentContainerClassName="gap-2">
        <Chip label="All skills" tone={!skillId ? 'amber' : 'neutral'} onPress={() => setSkillId(undefined)} />
        {(skills.data ?? []).slice(0, 30).map((s) => (
          <Chip key={s.id} label={s.name} tone={skillId === s.id ? 'amber' : 'neutral'} onPress={() => setSkillId(skillId === s.id ? undefined : s.id)} />
        ))}
      </ScrollView>

      {browse.isLoading ? <T className="py-8 text-center text-muted-foreground">Loading projects…</T> : null}
      {browse.error ? <ErrorBox message={browse.error.message} onRetry={() => browse.refetch()} /> : null}
      {browse.data && browse.data.items.length === 0 ? <Empty title="No projects found" hint="Try a different search or skill." /> : null}
      {browse.data?.items.map((p) => <ProjectCard key={p.id} p={p} />)}
    </Screen>
  );
}

function ClientHome() {
  const mine = useMyProjects();
  return (
    <Screen onRefresh={() => mine.refetch()} refreshing={mine.isRefetching}>
      <Display lead="My" accent="Projects" />
      <T className="mb-4 mt-2 text-sm text-muted-foreground">Post work and review proposals.</T>
      <Button title="Post a project" icon="plus" onPress={() => router.push('/project/new')} className="mb-5" />

      {mine.isLoading ? <T className="py-8 text-center text-muted-foreground">Loading…</T> : null}
      {mine.error ? <ErrorBox message={mine.error.message} onRetry={() => mine.refetch()} /> : null}
      {mine.data && mine.data.length === 0 ? <Empty title="No projects yet" hint="Post your first project to start getting proposals." /> : null}
      {mine.data?.map((p) => <ProjectCard key={p.id} p={p} showStatus />)}
    </Screen>
  );
}

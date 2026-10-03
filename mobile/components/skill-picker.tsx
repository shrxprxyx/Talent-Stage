import { useMemo } from 'react';
import { Alert, View } from 'react-native';
import { useSkills } from '../lib/hooks';
import type { Skill } from '../lib/types';
import { Chip, ErrorBox, T } from './ui';

/** Multi-select skill chips, grouped by category. */
export function SkillPicker({ selected, onChange, max = 15 }: { selected: string[]; onChange: (ids: string[]) => void; max?: number }) {
  const skills = useSkills();
  const groups = useMemo(() => {
    const m = new Map<string, Skill[]>();
    (skills.data ?? []).forEach((s) => m.set(s.category, [...(m.get(s.category) ?? []), s]));
    return Array.from(m.entries());
  }, [skills.data]);

  if (skills.isLoading) return <T className="text-sm text-muted-foreground">Loading skills…</T>;
  if (skills.error) return <ErrorBox message={skills.error.message} onRetry={() => skills.refetch()} />;

  const toggle = (id: string) => {
    if (selected.includes(id)) return onChange(selected.filter((x) => x !== id));
    if (selected.length >= max) return Alert.alert(`Pick up to ${max} skills`);
    onChange([...selected, id]);
  };

  return (
    <View>
      {groups.map(([category, list]) => (
        <View key={category} className="mb-3">
          <T className="mb-1.5 text-xs text-muted-foreground">{category}</T>
          <View className="flex-row flex-wrap gap-1.5">
            {list.map((s) => <Chip key={s.id} label={s.name} tone={selected.includes(s.id) ? 'amber' : 'neutral'} onPress={() => toggle(s.id)} />)}
          </View>
        </View>
      ))}
    </View>
  );
}

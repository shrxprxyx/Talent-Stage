import { Feather } from '@expo/vector-icons';
import { Alert, Pressable, View } from 'react-native';
import { useAddRole } from '../lib/hooks';
import { colors } from '../lib/theme';
import type { Role } from '../lib/types';
import { T } from './ui';

const OPTIONS: { role: Role; title: string; blurb: string; icon: keyof typeof Feather.glyphMap }[] = [
  { role: 'FREELANCER', title: 'Freelancer', blurb: 'Find projects, send proposals, get paid.', icon: 'briefcase' },
  { role: 'CLIENT', title: 'Client', blurb: 'Post projects and hire great talent.', icon: 'users' },
];

/** Pick a role to add. `exclude` hides roles the user already has. */
export function RolePicker({ exclude = [], onDone }: { exclude?: Role[]; onDone?: () => void }) {
  const add = useAddRole();
  const pick = (role: Role) => add.mutate(role, { onSuccess: onDone, onError: (e) => Alert.alert('Could not add role', e.message) });
  return (
    <View className="gap-3">
      {OPTIONS.filter((o) => !exclude.includes(o.role)).map((o) => (
        <Pressable key={o.role} disabled={add.isPending} onPress={() => pick(o.role)} className="flex-row items-center gap-4 rounded-2xl border border-border bg-card p-4 active:opacity-80">
          <View className="h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
            <Feather name={o.icon} size={20} color={colors.primary} />
          </View>
          <View className="flex-1">
            <T className="font-display text-lg">{o.title}</T>
            <T className="text-sm text-muted-foreground">{o.blurb}</T>
          </View>
          <Feather name="chevron-right" size={18} color={colors.muted} />
        </Pressable>
      ))}
    </View>
  );
}

import { useAuth } from '@clerk/expo';
import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Alert, View } from 'react-native';
import { Button, Card, Chip, Display, Screen, SectionLabel, T } from '../../../components/ui';
import { useAddRole, useMe, useSetActiveRole } from '../../../lib/hooks';
import type { Role } from '../../../lib/types';

const label: Record<Role, string> = { FREELANCER: 'Freelancer', CLIENT: 'Client' };

export default function Account() {
  const { signOut } = useAuth();
  const qc = useQueryClient();
  const me = useMe();
  const addRole = useAddRole();
  const setActive = useSetActiveRole();

  if (!me.data) return null;
  const u = me.data;
  const active = u.activeRole ?? u.roles[0];
  const other: Role = active === 'CLIENT' ? 'FREELANCER' : 'CLIENT';
  const hasOther = u.roles.includes(other);

  const fail = (title: string) => ({ onError: (e: Error) => Alert.alert(title, e.message) });

  const switchOrAdd = async () => {
    try {
      if (!hasOther) await addRole.mutateAsync(other);
      await setActive.mutateAsync(other);
    } catch (e) {
      Alert.alert('Could not switch role', e instanceof Error ? e.message : 'Try again');
    }
  };

  const logout = async () => {
    await signOut();
    qc.clear();
    router.replace('/');
  };

  return (
    <Screen>
      <Display lead="Your" accent="Account" />

      <Card className="mt-5 flex-row items-center gap-4">
        <View className="h-12 w-12 items-center justify-center rounded-full bg-primary/15">
          <T className="font-display text-xl text-primary">{u.name.trim().charAt(0).toUpperCase() || '?'}</T>
        </View>
        <View className="flex-1">
          <T className="font-display text-lg">{u.name}</T>
          <T className="text-sm text-muted-foreground">{u.email}</T>
        </View>
      </Card>

      <SectionLabel>Active role</SectionLabel>
      <View className="mb-3 flex-row gap-2">
        {u.roles.map((r) => (
          <Chip key={r} label={label[r]} tone={r === active ? 'amber' : 'neutral'} onPress={() => r !== active && setActive.mutate(r, fail('Could not switch role'))} />
        ))}
      </View>
      <Button
        title={hasOther ? `Switch to ${label[other]}` : `Also become a ${label[other]}`}
        variant="outline"
        icon="repeat"
        onPress={switchOrAdd}
        loading={addRole.isPending || setActive.isPending}
      />

      <SectionLabel>Profile</SectionLabel>
      <Button title="Edit profile" variant="outline" icon="edit-2" onPress={() => router.push('/profile')} />

      <View className="mt-8">
        <Button title="Sign out" variant="danger" icon="log-out" onPress={logout} />
      </View>
    </Screen>
  );
}

import { useAuth } from '@clerk/expo';
import { Feather } from '@expo/vector-icons';
import { Redirect, Tabs } from 'expo-router';
import { View } from 'react-native';
import { ErrorBox, Loading } from '../../../components/ui';
import { useMe } from '../../../lib/hooks';
import { useUnreadCount } from '../../../lib/hooks-extra';
import { colors } from '../../../lib/theme';

type IconName = keyof typeof Feather.glyphMap;
const icon = (name: IconName) => ({ color, size }: { color: string; size: number }) => <Feather name={name} size={size} color={color} />;

export default function TabsLayout() {
  const { isLoaded, isSignedIn } = useAuth();
  const me = useMe();
  const unread = useUnreadCount();

  if (!isLoaded || (isSignedIn && me.isLoading)) return <Loading />;
  if (!isSignedIn) return <Redirect href="/" />;
  if (me.error || !me.data) {
    return (
      <View className="flex-1 justify-center bg-background p-5">
        <ErrorBox message={me.error?.message ?? 'Could not load your account'} onRetry={() => me.refetch()} />
      </View>
    );
  }
  if (me.data.roles.length === 0) return <Redirect href="/select-role" />;

  const isFreelancer = (me.data.activeRole ?? me.data.roles[0]) === 'FREELANCER';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border },
        tabBarBadgeStyle: { backgroundColor: colors.primary, color: colors.bg },
      }}
    >
      <Tabs.Screen name="home" options={{ title: isFreelancer ? 'Browse' : 'Projects', tabBarIcon: icon(isFreelancer ? 'compass' : 'briefcase') }} />
      <Tabs.Screen name="proposals" options={{ title: 'Proposals', href: isFreelancer ? undefined : null, tabBarIcon: icon('send') }} />
      <Tabs.Screen name="notifications" options={{ title: 'Alerts', tabBarBadge: unread > 0 ? unread : undefined, tabBarIcon: icon('bell') }} />
      <Tabs.Screen name="account" options={{ title: 'Account', tabBarIcon: icon('user') }} />
    </Tabs>
  );
}

import { useAuth } from '@clerk/expo';
import { Redirect } from 'expo-router';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RolePicker } from '../../components/role-picker';
import { ErrorBox, Loading, T } from '../../components/ui';
import { useMe } from '../../lib/hooks';

export default function SelectRole() {
  const { isLoaded, isSignedIn } = useAuth();
  const me = useMe();

  if (!isLoaded || (isSignedIn && me.isLoading)) return <Loading />;
  if (!isSignedIn) return <Redirect href="/" />;
  if (me.error) {
    return (
      <View className="flex-1 justify-center bg-background p-5">
        <ErrorBox message={me.error.message} onRetry={() => me.refetch()} />
      </View>
    );
  }
  // Once the role is added the query refetches and this redirect fires.
  if (me.data && me.data.roles.length > 0) return <Redirect href="/home" />;

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 justify-center px-5">
        <T className="font-display text-[34px] leading-[40px]">How will you use</T>
        <T className="font-display-italic text-[34px] leading-[40px] text-primary">TalentStage?</T>
        <T className="mb-6 mt-3 text-sm text-muted-foreground">Pick one to start. You can add the other role any time from your account.</T>
        <RolePicker />
      </View>
    </SafeAreaView>
  );
}

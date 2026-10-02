import { useAuth } from '@clerk/expo';
import { Feather } from '@expo/vector-icons';
import { Redirect, router } from 'expo-router';
import { Pressable, SafeAreaView, View } from 'react-native';
import { Loading, T } from '../../components/ui';
import { colors } from '../../lib/theme';

export default function Landing() {
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded) return <Loading />;
  if (isSignedIn) return <Redirect href="/home" />;

  return (
    <SafeAreaView className="flex-1 bg-[#242424]">
      <View className="flex-1 justify-center px-8">
        <T className="font-display text-[52px] leading-[58px]">Your talent,</T>
        <T className="font-display-italic text-[52px] leading-[58px] text-primary">centre stage.</T>
        <T className="mt-6 text-base leading-6 text-muted-foreground">A marketplace where creative and technical freelancers get discovered by clients.</T>
        <View className="mt-8 flex-row items-center gap-3">
          <Pressable onPress={() => router.push('/sign-up')} className="flex-row items-center gap-2 rounded-full bg-primary px-6 py-3 active:opacity-80">
            <T className="font-sans-medium text-sm text-primary-foreground">Get Started</T>
            <Feather name="arrow-right" size={15} color={colors.bg} />
          </Pressable>
          <Pressable onPress={() => router.push('/sign-in')} className="rounded-full border border-border px-6 py-3 active:opacity-80">
            <T className="font-sans-medium text-sm text-muted-foreground">Sign In</T>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

import { useAuth } from '@clerk/expo';
import { Redirect, Stack } from 'expo-router';
import { colors } from '../../../lib/theme';

export default function AuthLayout() {
  const { isLoaded, isSignedIn } = useAuth();
  if (isLoaded && isSignedIn) return <Redirect href="/home" />;
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }} />;
}
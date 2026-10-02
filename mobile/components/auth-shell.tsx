import { isClerkAPIResponseError, useSSO } from '@clerk/expo';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState, type ReactNode } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, T } from './ui';

WebBrowser.maybeCompleteAuthSession();

export const clerkMessage = (e: unknown) =>
  isClerkAPIResponseError(e) ? (e.errors[0]?.longMessage ?? e.errors[0]?.message ?? 'Something went wrong') : e instanceof Error ? e.message : 'Something went wrong';

/** Shared card layout + social buttons for sign-in and sign-up. */
export function AuthShell({ title, subtitle, children, footer }: { title: string; subtitle: string; children: ReactNode; footer: ReactNode }) {
  const { startSSOFlow } = useSSO();
  const [busy, setBusy] = useState<string | null>(null);

  const social = async (strategy: 'oauth_google' | 'oauth_github') => {
    setBusy(strategy);
    try {
      const { createdSessionId, setActive } = await startSSOFlow({ strategy });
      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });
        router.replace('/home');
      }
    } catch (e) {
      Alert.alert('Sign-in failed', clerkMessage(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
        <ScrollView contentContainerClassName="flex-grow justify-center px-5 py-8" keyboardShouldPersistTaps="handled">
          <T className="mb-6 text-center font-display text-2xl text-primary">TalentStage</T>
          <View className="rounded-3xl border border-border bg-card p-6">
            <T className="text-center font-display text-2xl">{title}</T>
            <T className="mb-5 mt-1 text-center text-sm text-muted-foreground">{subtitle}</T>
            <Button variant="outline" title="Continue with Google" onPress={() => social('oauth_google')} loading={busy === 'oauth_google'} icon="globe" />
            <Button variant="outline" title="Continue with GitHub" onPress={() => social('oauth_github')} loading={busy === 'oauth_github'} icon="github" className="mt-2" />
            <View className="my-5 flex-row items-center gap-3">
              <View className="h-px flex-1 bg-border" />
              <T className="text-xs text-muted-foreground">or</T>
              <View className="h-px flex-1 bg-border" />
            </View>
            {children}
          </View>
          <View className="mt-5 flex-row items-center justify-center gap-1">{footer}</View>
          <View className="mt-6 flex-row items-center justify-center gap-1.5">
            <Feather name="lock" size={11} color="#7f8794" />
            <T className="text-xs text-muted-foreground">Secured by Clerk</T>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

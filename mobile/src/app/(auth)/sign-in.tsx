import { useSignIn } from '@clerk/expo/legacy';
import { Link } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';
import { AuthShell, clerkMessage } from '../../../components/auth-shell';
import { Button, Field, T } from '../../../components/ui';

export default function SignIn() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!isLoaded || !email.trim() || !password) return;
    setBusy(true);
    try {
      const res = await signIn.create({ identifier: email.trim(), password });
      //console.log('[signin] status:', res.status, 'session:', res.createdSessionId);
      if (res.status === 'complete') {
        await setActive({ session: res.createdSessionId });
      } else {
        Alert.alert('Extra step required', 'This account needs another verification step that the app does not support yet.');
      }
    } catch (e) {
      Alert.alert('Sign-in failed', clerkMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to continue to TalentStage"
      footer={
        <>
          <T className="text-sm text-muted-foreground">Don't have an account?</T>
          <Link href="/sign-up"><T className="font-sans-medium text-sm">Sign up</T></Link>
        </>
      }
    >
      <Field label="Email address" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" placeholder="you@example.com" />
      <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" placeholder="Your password" />
      <Button title="Continue" onPress={submit} loading={busy} />
    </AuthShell>
  );
}

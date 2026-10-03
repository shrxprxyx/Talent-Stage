import { useSignUp } from '@clerk/expo/legacy';
import { Link } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';
import { AuthShell, clerkMessage } from '../../../components/auth-shell';
import { Button, Field, T } from '../../../components/ui';

export default function SignUp() {
  const { signUp, setActive, isLoaded } = useSignUp();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [busy, setBusy] = useState(false);

  const start = async () => {
    if (!isLoaded || !name.trim() || !email.trim() || password.length < 8) {
      Alert.alert('Check your details', 'Enter your name, a valid email and a password of at least 8 characters.');
      return;
    }
    setBusy(true);
    try {
      const [firstName, ...rest] = name.trim().split(/\s+/);
      await signUp.create({ emailAddress: email.trim(), password, firstName, lastName: rest.join(' ') || undefined });
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      setVerifying(true);
    } catch (e) {
      Alert.alert('Sign-up failed', clerkMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    if (!isLoaded || !code.trim()) return;
    setBusy(true);
    try {
      const res = await signUp.attemptEmailAddressVerification({ code: code.trim() });
      console.log('[signup] status:', res.status, 'session:', res.createdSessionId);
      if (res.status === 'complete') {
        await setActive({ session: res.createdSessionId });
      } else {
        Alert.alert('Not finished', 'Verification is incomplete. Check the code and try again.');
      }
    } catch (e) {
      Alert.alert('Verification failed', clerkMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell
      title={verifying ? 'Check your email' : 'Create your account'}
      subtitle={verifying ? `We sent a 6-digit code to ${email}` : 'Join TalentStage in a minute'}
      footer={
        <>
          <T className="text-sm text-muted-foreground">Already have an account?</T>
          <Link href="/sign-in"><T className="font-sans-medium text-sm">Sign in</T></Link>
        </>
      }
    >
      {verifying ? (
        <>
          <Field label="Verification code" value={code} onChangeText={setCode} keyboardType="number-pad" placeholder="123456" />
          <Button title="Verify and continue" onPress={verify} loading={busy} />
        </>
      ) : (
        <>
          <Field label="Full name" value={name} onChangeText={setName} placeholder="Ada Lovelace" autoComplete="name" />
          <Field label="Email address" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" placeholder="you@example.com" />
          <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" placeholder="At least 8 characters" />
          <Button title="Continue" onPress={start} loading={busy} />
        </>
      )}
    </AuthShell>
  );
}

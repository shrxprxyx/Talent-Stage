import { router } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';
import { SkillPicker } from '../../../components/skill-picker';
import { BackLink, Button, Display, Empty, Field, Screen, SectionLabel, T } from '../../../components/ui';
import { parseDMY } from '../../../lib/format';
import { useCreateProject, useMe } from '../../../lib/hooks';

export default function NewProject() {
  const me = useMe();
  const create = useCreateProject();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [min, setMin] = useState('');
  const [max, setMax] = useState('');
  const [deadline, setDeadline] = useState('');
  const [skillIds, setSkillIds] = useState<string[]>([]);

  if (me.data && !me.data.roles.includes('CLIENT')) {
    return <Screen><BackLink /><Empty title="Clients only" hint="Add the Client role from your account to post projects." /></Screen>;
  }

  const submit = (publish: boolean) => {
    const budgetMin = Number(min);
    const budgetMax = Number(max);
    if (title.trim().length < 5) return Alert.alert('Title too short', 'Use at least 5 characters.');
    if (description.trim().length < 20) return Alert.alert('Description too short', 'Describe the work in at least 20 characters.');
    if (!Number.isFinite(budgetMin) || budgetMin < 1 || !Number.isFinite(budgetMax) || budgetMax < 1) return Alert.alert('Check your budget', 'Enter a minimum and maximum of at least $1.');
    if (budgetMin > budgetMax) return Alert.alert('Check your budget', 'Minimum cannot be higher than maximum.');
    if (skillIds.length < 1) return Alert.alert('Pick skills', 'Choose at least one required skill.');

    let iso: string | undefined;
    if (deadline.trim()) {
      const parsed = parseDMY(deadline);
      if (!parsed) return Alert.alert('Check the deadline', 'Use the format dd-mm-yyyy, for example 31-12-2026.');
      if (new Date(parsed).getTime() < Date.now()) return Alert.alert('Check the deadline', 'The deadline must be in the future.');
      iso = parsed;
    }

    create.mutate(
      { title: title.trim(), description: description.trim(), budgetMin, budgetMax, deadline: iso, skillIds, publish },
      { onSuccess: (p) => router.replace(`/project/${p.id}`), onError: (e) => Alert.alert('Could not create project', e.message) },
    );
  };

  return (
    <Screen>
      <BackLink />
      <Display lead="Post a" accent="Project" />
      <T className="mb-5 mt-2 text-sm text-muted-foreground">Tell freelancers what you need.</T>

      <Field label="Title" required value={title} onChangeText={setTitle} placeholder="e.g. Design a mobile onboarding flow" maxLength={140} />
      <Field label="Description" required multiline value={description} onChangeText={setDescription} placeholder="What needs to be built, and what does success look like?" />
      <Field label="Minimum budget (USD)" required keyboardType="decimal-pad" value={min} onChangeText={setMin} placeholder="300" />
      <Field label="Maximum budget (USD)" required keyboardType="decimal-pad" value={max} onChangeText={setMax} placeholder="800" />
      <Field label="Deadline" value={deadline} onChangeText={setDeadline} placeholder="dd-mm-yyyy" hint="Optional" keyboardType="numbers-and-punctuation" />

      <SectionLabel>Required skills</SectionLabel>
      <SkillPicker selected={skillIds} onChange={setSkillIds} max={15} />

      <Button title="Publish now" icon="upload" onPress={() => submit(true)} loading={create.isPending} className="mt-6" />
      <Button title="Save as draft" variant="outline" onPress={() => submit(false)} disabled={create.isPending} className="mt-3" />
    </Screen>
  );
}

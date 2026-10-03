import { useState } from 'react';
import { Alert, View } from 'react-native';
import { SkillPicker } from '../../components/skill-picker';
import { BackLink, Button, Card, Display, ErrorBox, Field, Loading, Screen, SectionLabel, T } from '../../components/ui';
import { useAddPortfolio, useDeletePortfolio, useMe, useMyFreelancer, useUpdateMe } from '../../lib/hooks';
import { useMyClient, useSetSkills, useUpdateClient, useUpdateFreelancer } from '../../lib/hooks-extra';
import type { FreelancerProfile } from '../../lib/types';

export default function EditProfile() {
  const me = useMe();
  if (!me.data) return <Loading />;
  const { roles, name } = me.data;

  return (
    <Screen>
      <BackLink />
      <Display lead="Edit" accent="Profile" />
      <NameForm name={name} />
      {roles.includes('FREELANCER') ? <FreelancerSection /> : null}
      {roles.includes('CLIENT') ? <ClientSection /> : null}
    </Screen>
  );
}

const saved = () => Alert.alert('Saved');
const failed = (title: string) => (e: Error) => Alert.alert(title, e.message);

function NameForm({ name }: { name: string }) {
  const update = useUpdateMe();
  const [value, setValue] = useState(name);
  const save = () => {
    if (!value.trim() || value.trim().length > 80) return Alert.alert('Check your name', 'Use between 1 and 80 characters.');
    update.mutate({ name: value.trim() }, { onSuccess: saved, onError: failed('Could not save') });
  };
  return (
    <View className="mt-6">
      <Field label="Display name" value={value} onChangeText={setValue} maxLength={80} />
      <Button title="Save name" variant="outline" onPress={save} loading={update.isPending} />
    </View>
  );
}

/* -------------------------------- freelancer -------------------------------- */

function FreelancerSection() {
  const fp = useMyFreelancer();
  if (fp.isLoading) return <T className="mt-8 text-sm text-muted-foreground">Loading freelancer profile…</T>;
  if (fp.error || !fp.data) return <View className="mt-8"><ErrorBox message={fp.error?.message ?? 'Could not load profile'} onRetry={() => fp.refetch()} /></View>;
  return <FreelancerForm p={fp.data} />;
}

function FreelancerForm({ p }: { p: FreelancerProfile }) {
  const update = useUpdateFreelancer();
  const setSkills = useSetSkills();
  const [headline, setHeadline] = useState(p.headline ?? '');
  const [bio, setBio] = useState(p.bio ?? '');
  const [rate, setRate] = useState(p.hourlyRate ? String(Number(p.hourlyRate)) : '');
  const [location, setLocation] = useState(p.location ?? '');
  const [skillIds, setSkillIds] = useState<string[]>(p.skills.map((s) => s.skill.id));

  const saveProfile = () => {
    const hourlyRate = rate.trim() ? Number(rate) : undefined;
    if (hourlyRate !== undefined && (!Number.isFinite(hourlyRate) || hourlyRate < 0 || hourlyRate > 100000)) {
      return Alert.alert('Check your rate', 'Enter an hourly rate between 0 and 100000.');
    }
    update.mutate(
      { headline: headline.trim(), bio: bio.trim(), location: location.trim(), ...(hourlyRate !== undefined ? { hourlyRate } : {}) },
      { onSuccess: saved, onError: failed('Could not save profile') },
    );
  };

  const saveSkills = () => {
    const years = new Map(p.skills.map((s) => [s.skill.id, s.yearsExp]));
    setSkills.mutate(skillIds.map((skillId) => ({ skillId, yearsExp: years.get(skillId) ?? 0 })), { onSuccess: saved, onError: failed('Could not save skills') });
  };

  return (
    <View>
      <SectionLabel>Freelancer profile</SectionLabel>
      <Field label="Headline" value={headline} onChangeText={setHeadline} placeholder="e.g. Full-stack developer · React Native" maxLength={120} />
      <Field label="About you" multiline value={bio} onChangeText={setBio} placeholder="Tell clients about your experience." />
      <Field label="Hourly rate (USD)" keyboardType="decimal-pad" value={rate} onChangeText={setRate} placeholder="40" />
      <Field label="Location" value={location} onChangeText={setLocation} placeholder="City, Country" maxLength={120} />
      <Button title="Save profile" onPress={saveProfile} loading={update.isPending} />

      <SectionLabel>Skills</SectionLabel>
      <SkillPicker selected={skillIds} onChange={setSkillIds} max={30} />
      <Button title={`Save skills (${skillIds.length})`} variant="outline" onPress={saveSkills} loading={setSkills.isPending} />

      <PortfolioSection items={p.portfolio} />
    </View>
  );
}

function PortfolioSection({ items }: { items: FreelancerProfile['portfolio'] }) {
  const add = useAddPortfolio();
  const del = useDeletePortfolio();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [link, setLink] = useState('');

  const submit = () => {
    if (!title.trim()) return Alert.alert('Add a title', 'Give your portfolio item a name.');
    add.mutate(
      { title: title.trim(), ...(description.trim() ? { description: description.trim() } : {}), ...(link.trim() ? { link: link.trim() } : {}) },
      { onSuccess: () => { setTitle(''); setDescription(''); setLink(''); }, onError: failed('Could not add item') },
    );
  };

  const remove = (id: string, name: string) =>
    Alert.alert('Delete item?', name, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => del.mutate(id, { onError: failed('Could not delete') }) },
    ]);

  return (
    <View>
      <SectionLabel>Portfolio</SectionLabel>
      {items.map((it) => (
        <Card key={it.id} className="mb-3">
          <T className="font-display text-lg">{it.title}</T>
          {it.description ? <T className="mt-1 text-sm text-muted-foreground">{it.description}</T> : null}
          {it.link ? <T selectable className="mt-1 text-xs text-primary">{it.link}</T> : null}
          <Button title="Delete" variant="danger" onPress={() => remove(it.id, it.title)} disabled={del.isPending} className="mt-3" />
        </Card>
      ))}
      <Field label="New item title" value={title} onChangeText={setTitle} maxLength={120} />
      <Field label="Description" multiline value={description} onChangeText={setDescription} />
      <Field label="Link" value={link} onChangeText={setLink} placeholder="https://" autoCapitalize="none" keyboardType="url" />
      <Button title="Add to portfolio" icon="plus" variant="outline" onPress={submit} loading={add.isPending} />
    </View>
  );
}

/* ---------------------------------- client ---------------------------------- */

function ClientSection() {
  const client = useMyClient();
  if (client.isLoading) return <T className="mt-8 text-sm text-muted-foreground">Loading client profile…</T>;
  if (client.error || !client.data) return <View className="mt-8"><ErrorBox message={client.error?.message ?? 'Could not load profile'} onRetry={() => client.refetch()} /></View>;
  return <ClientForm companyName={client.data.companyName ?? ''} bio={client.data.bio ?? ''} />;
}

function ClientForm(init: { companyName: string; bio: string }) {
  const update = useUpdateClient();
  const [companyName, setCompanyName] = useState(init.companyName);
  const [bio, setBio] = useState(init.bio);
  return (
    <View>
      <SectionLabel>Client profile</SectionLabel>
      <Field label="Company name" value={companyName} onChangeText={setCompanyName} maxLength={120} />
      <Field label="About" multiline value={bio} onChangeText={setBio} placeholder="What does your company do?" />
      <Button title="Save client profile" onPress={() => update.mutate({ companyName: companyName.trim(), bio: bio.trim() }, { onSuccess: saved, onError: failed('Could not save') })} loading={update.isPending} />
    </View>
  );
}

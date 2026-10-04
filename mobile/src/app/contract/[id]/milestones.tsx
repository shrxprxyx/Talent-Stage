import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, View } from 'react-native';
import { BackLink, Button, Card, Chip, Display, Empty, ErrorBox, Field, Screen, T } from '../../../../components/ui';
import { money, parseDMY } from '../../../../lib/format';
import { type Contract, type MilestoneInput, useContract, useSetMilestones } from '../../../../lib/hooks-contracts';

type Row = { key: number; title: string; amount: string; due: string };
let nextKey = 1;

const toDMY = (iso: string) => {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getUTCDate())}-${p(d.getUTCMonth() + 1)}-${d.getUTCFullYear()}`;
};

export default function MilestoneEditorScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const q = useContract(id);

  if (q.isLoading) return <Screen><BackLink /><T className="py-8 text-center text-muted-foreground">Loading…</T></Screen>;
  if (q.error || !q.data) return <Screen><BackLink /><ErrorBox message={q.error?.message ?? 'Contract not found'} onRetry={() => q.refetch()} /></Screen>;
  if (q.data.myRole !== 'CLIENT' || q.data.status !== 'DRAFT') {
    return <Screen><BackLink /><Empty title="Milestones are locked" hint="Only the client can edit milestones, and only before the freelancer accepts the contract." /></Screen>;
  }
  return <Editor c={q.data} />;
}

function Editor({ c }: { c: Contract }) {
  const save = useSetMilestones();
  const totalCents = Math.round(Number(c.totalAmount) * 100);

  const [rows, setRows] = useState<Row[]>(() =>
    c.milestones.length
      ? c.milestones.map((m) => ({ key: nextKey++, title: m.title, amount: String(Number(m.amount)), due: m.dueDate ? toDMY(m.dueDate) : '' }))
      : [{ key: nextKey++, title: '', amount: String(Number(c.totalAmount)), due: '' }],
  );

  const patch = (key: number, p: Partial<Row>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...p } : r)));
  const allocated = rows.reduce((s, r) => s + Math.round((Number(r.amount) || 0) * 100), 0);
  const diff = totalCents - allocated;

  const splitEvenly = () => {
    const n = rows.length;
    const base = Math.floor(totalCents / n);
    const rest = totalCents - base * n;
    setRows(rows.map((r, i) => ({ ...r, amount: ((base + (i === n - 1 ? rest : 0)) / 100).toFixed(2) })));
  };

  const submit = () => {
    const out: MilestoneInput[] = [];
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const label = `Milestone ${i + 1}`;
      if (r.title.trim().length < 3) return Alert.alert(label, 'Give it a title of at least 3 characters.');
      const amount = Number(r.amount);
      if (!Number.isFinite(amount) || amount < 1 || Math.round(amount * 100) / 100 !== amount) {
        return Alert.alert(label, 'Enter an amount of at least $1 with up to 2 decimals.');
      }
      let dueDate: string | undefined;
      if (r.due.trim()) {
        const parsed = parseDMY(r.due);
        if (!parsed) return Alert.alert(label, 'Use the due date format dd-mm-yyyy.');
        dueDate = parsed;
      }
      out.push({ title: r.title.trim(), amount, dueDate });
    }
    if (allocated !== totalCents) {
      return Alert.alert('Amounts do not add up', `The milestones must add up to ${money(totalCents / 100)}. Right now they add up to ${money(allocated / 100)}.`);
    }
    save.mutate({ contractId: c.id, milestones: out }, {
      onSuccess: () => router.back(),
      onError: (e) => Alert.alert('Could not save milestones', e.message),
    });
  };

  return (
    <Screen>
      <BackLink />
      <Display lead="Set" accent="Milestones" />
      <T className="mb-4 mt-2 text-sm text-muted-foreground">{c.project.title}</T>

      <Card className="mb-4">
        <T className="text-sm">Allocated {money(allocated / 100)} of {money(totalCents / 100)}</T>
        <T className={`mt-0.5 text-xs ${diff === 0 ? 'text-emerald-400' : diff > 0 ? 'text-primary' : 'text-red-400'}`}>
          {diff === 0 ? 'Everything is allocated' : diff > 0 ? `${money(diff / 100)} left to allocate` : `${money(-diff / 100)} over the total`}
        </T>
      </Card>

      {rows.map((r, i) => (
        <Card key={r.key} className="mb-3">
          <View className="mb-2 flex-row items-center justify-between">
            <T className="font-sans-medium text-sm">Milestone {i + 1}</T>
            {rows.length > 1 ? <Chip label="Remove" tone="red" onPress={() => setRows(rows.filter((x) => x.key !== r.key))} /> : null}
          </View>
          <Field label="Title" value={r.title} onChangeText={(v) => patch(r.key, { title: v })} placeholder="e.g. Design mockups" maxLength={120} />
          <Field label="Amount (USD)" keyboardType="decimal-pad" value={r.amount} onChangeText={(v) => patch(r.key, { amount: v })} placeholder="250" />
          <Field label="Due date" value={r.due} onChangeText={(v) => patch(r.key, { due: v })} placeholder="dd-mm-yyyy" hint="Optional" keyboardType="numbers-and-punctuation" />
        </Card>
      ))}

      {rows.length < 10 ? (
        <Button title="Add milestone" icon="plus" variant="outline" onPress={() => setRows([...rows, { key: nextKey++, title: '', amount: '', due: '' }])} className="mb-3" />
      ) : null}
      {rows.length > 1 ? <Button title="Split total evenly" icon="divide" variant="outline" onPress={splitEvenly} className="mb-3" /> : null}
      <Button title="Save milestones" icon="check" onPress={submit} loading={save.isPending} className="mt-2" />
    </Screen>
  );
}

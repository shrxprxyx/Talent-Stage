import { router } from 'expo-router';
import type { ComponentProps } from 'react';
import { money } from '../lib/format';
import { type ContractStatus, type MilestoneStatus, useContracts } from '../lib/hooks-contracts';
import { Button, Card, Chip, T } from './ui';
import { View } from 'react-native';

type Tone = NonNullable<ComponentProps<typeof Chip>['tone']>;

const contractTone: Record<ContractStatus, [Tone, string]> = {
  DRAFT: ['neutral', 'Draft'], ACTIVE: ['amber', 'Active'], COMPLETED: ['green', 'Completed'], CANCELLED: ['red', 'Cancelled'], DISPUTED: ['red', 'Disputed'],
};
const milestoneTone: Record<MilestoneStatus, [Tone, string]> = {
  PENDING: ['neutral', 'Awaiting funding'], FUNDED: ['amber', 'Funded'], SUBMITTED: ['amber', 'In review'],
  REVISION_REQUESTED: ['red', 'Changes requested'], APPROVED: ['green', 'Approved'], RELEASED: ['green', 'Paid'], CANCELLED: ['red', 'Cancelled'],
};

export const ContractStatusChip = ({ status }: { status: ContractStatus }) => <Chip label={contractTone[status][1]} tone={contractTone[status][0]} />;
export const MilestoneStatusChip = ({ status }: { status: MilestoneStatus }) => <Chip label={milestoneTone[status][1]} tone={milestoneTone[status][0]} />;

/** Shown on the project page once a proposal has been accepted. */
export function ContractLink({ projectId }: { projectId: string }) {
  const list = useContracts();
  const c = list.data?.find((x) => x.project.id === projectId);
  if (!c) return null;
  return (
    <Card className="mt-6">
      <View className="flex-row items-center justify-between">
        <T className="font-display text-lg">Contract</T>
        <ContractStatusChip status={c.status} />
      </View>
      <T className="mt-1 text-sm text-muted-foreground">{money(c.totalAmount)} · {c.progress.released}/{c.progress.total} milestones paid</T>
      <Button title="Open contract" icon="file-text" onPress={() => router.push(`/contract/${c.id}`)} className="mt-3" />
    </Card>
  );
}

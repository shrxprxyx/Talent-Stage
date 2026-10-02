import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import {
  ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, TextInput, View,
  type TextInputProps, type TextProps,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMe } from '../lib/hooks';
import { colors } from '../lib/theme';
import type { ProjectStatus, ProposalStatus } from '../lib/types';

type FeatherName = keyof typeof Feather.glyphMap;

/** Text with the app font + colour defaults (skipped when the caller sets its own font-/text- colour). */
export function T({ className = '', ...p }: TextProps & { className?: string }) {
  const font = /(^|\s)font-/.test(className) ? '' : 'font-sans ';
  const color = /(^|\s)text-(foreground|muted-foreground|primary|destructive|emerald|red|amber|white)/.test(className) ? '' : 'text-foreground ';
  return <Text className={`${font}${color}${className}`} {...p} />;
}

/** Serif heading with an italic amber word, e.g. Browse *Projects* */
export function Display({ lead, accent }: { lead: string; accent: string }) {
  return (
    <T className="font-display text-[38px] leading-[44px]">
      {lead} <Text className="font-display-italic text-primary">{accent}</Text>
    </T>
  );
}

export function AppHeader() {
  const me = useMe();
  const initial = (me.data?.name ?? '?').trim().charAt(0).toUpperCase() || '?';
  return (
    <View className="flex-row items-center justify-between px-5 py-3">
      <T className="font-display text-xl text-primary">TalentStage</T>
      <Pressable onPress={() => router.push('/account')} className="h-8 w-8 items-center justify-center rounded-full bg-[#ee588a] active:opacity-80">
        <T className="font-sans-bold text-sm text-white">{initial}</T>
      </Pressable>
    </View>
  );
}

export function Screen({ children, onRefresh, refreshing = false }: { children: ReactNode; onRefresh?: () => void; refreshing?: boolean }) {
  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <AppHeader />
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 pb-10 pt-3"
        keyboardShouldPersistTaps="handled"
        refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} /> : undefined}
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

export function BackLink() {
  return (
    <Pressable onPress={() => router.back()} className="mb-4 flex-row items-center gap-1.5 self-start active:opacity-70">
      <Feather name="arrow-left" size={14} color={colors.muted} />
      <T className="text-sm text-muted-foreground">Back</T>
    </Pressable>
  );
}

export function SectionLabel({ children }: { children: string }) {
  return <T className="mb-3 mt-7 text-xs uppercase tracking-[2px] text-muted-foreground">{children}</T>;
}

type Variant = 'primary' | 'outline' | 'ghost' | 'danger';
const btnBox: Record<Variant, string> = {
  primary: 'bg-primary',
  outline: 'border border-border bg-card',
  ghost: '',
  danger: 'border border-destructive/40 bg-destructive/10',
};
const btnText: Record<Variant, string> = {
  primary: 'text-primary-foreground',
  outline: 'text-foreground',
  ghost: 'text-muted-foreground',
  danger: 'text-destructive',
};

export function Button({
  title, onPress, variant = 'primary', loading, disabled, icon, className = '',
}: { title: string; onPress: () => void; variant?: Variant; loading?: boolean; disabled?: boolean; icon?: FeatherName; className?: string }) {
  const off = disabled || loading;
  return (
    <Pressable onPress={onPress} disabled={off} className={`flex-row items-center justify-center gap-2 rounded-xl px-4 py-3.5 active:opacity-80 ${btnBox[variant]} ${off ? 'opacity-50' : ''} ${className}`}>
      {loading ? <ActivityIndicator size="small" color={variant === 'primary' ? colors.bg : colors.foreground} /> : null}
      {icon && !loading ? <Feather name={icon} size={16} color={variant === 'primary' ? colors.bg : variant === 'danger' ? colors.danger : colors.foreground} /> : null}
      <T className={`font-sans-medium text-sm ${btnText[variant]}`}>{title}</T>
    </Pressable>
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <View className={`rounded-2xl border border-border bg-card p-4 ${className}`}>{children}</View>;
}

type Tone = 'neutral' | 'amber' | 'green' | 'red';
const toneBox: Record<Tone, string> = {
  neutral: 'border-border bg-secondary',
  amber: 'border-primary/30 bg-primary/10',
  green: 'border-emerald-500/30 bg-emerald-500/10',
  red: 'border-red-500/30 bg-red-500/10',
};
const toneText: Record<Tone, string> = {
  neutral: 'text-muted-foreground', amber: 'text-primary', green: 'text-emerald-400', red: 'text-red-400',
};
export function Chip({ label, tone = 'neutral', onPress, onRemove }: { label: string; tone?: Tone; onPress?: () => void; onRemove?: () => void }) {
  const body = (
    <View className={`flex-row items-center gap-1 rounded-md border px-2 py-0.5 ${toneBox[tone]}`}>
      <T className={`text-[11px] ${toneText[tone]}`}>{label}</T>
      {onRemove ? <Feather name="x" size={11} color={colors.muted} onPress={onRemove} /> : null}
    </View>
  );
  return onPress ? <Pressable onPress={onPress} className="active:opacity-70">{body}</Pressable> : body;
}

const projectTone: Record<ProjectStatus, [Tone, string]> = {
  DRAFT: ['neutral', 'Draft'], OPEN: ['green', 'Open'], IN_PROGRESS: ['amber', 'In progress'], COMPLETED: ['green', 'Completed'], CANCELLED: ['red', 'Cancelled'],
};
const proposalTone: Record<ProposalStatus, [Tone, string]> = {
  PENDING: ['amber', 'Pending'], ACCEPTED: ['green', 'Accepted'], REJECTED: ['red', 'Rejected'], WITHDRAWN: ['neutral', 'Withdrawn'],
};
export const ProjectStatusChip = ({ status }: { status: ProjectStatus }) => <Chip label={projectTone[status][1]} tone={projectTone[status][0]} />;
export const ProposalStatusChip = ({ status }: { status: ProposalStatus }) => <Chip label={proposalTone[status][1]} tone={proposalTone[status][0]} />;

export function Field({ label, required, hint, multiline, ...p }: TextInputProps & { label: string; required?: boolean; hint?: string }) {
  return (
    <View className="mb-4">
      <T className="mb-1.5 font-sans-medium text-sm">
        {label}
        {required ? <Text className="text-primary"> *</Text> : null}
      </T>
      <TextInput
        placeholderTextColor={colors.muted}
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
        className={`rounded-xl border border-border bg-secondary px-3 py-3 font-sans text-foreground ${multiline ? 'min-h-[110px]' : ''}`}
        {...p}
      />
      {hint ? <T className="mt-1 text-xs text-muted-foreground">{hint}</T> : null}
    </View>
  );
}

export function StatTile({ icon, value, label }: { icon: FeatherName; value: string | number; label: string }) {
  return (
    <View className="w-[48.5%] rounded-2xl border border-border bg-card p-4">
      <View className="mb-3 h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
        <Feather name={icon} size={15} color={colors.primary} />
      </View>
      <T className="font-display text-2xl">{value}</T>
      <T className="mt-0.5 text-xs text-muted-foreground">{label}</T>
    </View>
  );
}

export function Meta({ icon, text }: { icon: FeatherName; text: string }) {
  return (
    <View className="flex-row items-center gap-1">
      <Feather name={icon} size={12} color={colors.muted} />
      <T className="text-xs text-muted-foreground">{text}</T>
    </View>
  );
}

export function Loading() {
  return <View className="flex-1 items-center justify-center bg-background"><ActivityIndicator color={colors.primary} /></View>;
}

export function Empty({ title, hint }: { title: string; hint?: string }) {
  return (
    <View className="items-center rounded-2xl border border-dashed border-border px-6 py-10">
      <T className="font-display text-lg">{title}</T>
      {hint ? <T className="mt-1 text-center text-sm text-muted-foreground">{hint}</T> : null}
    </View>
  );
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <Card className="items-center">
      <T className="text-center text-sm text-destructive">{message}</T>
      {onRetry ? <Button title="Retry" variant="outline" onPress={onRetry} className="mt-3" /> : null}
    </Card>
  );
}

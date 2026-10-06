import { useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { ago } from '../lib/format';
import { type Review, useContractReviews, useSubmitReview } from '../lib/hooks-reviews';
import { Button, Card, ErrorBox, Field, SectionLabel, T } from './ui';

export function Stars({ value, size = 'text-sm' }: { value: number; size?: string }) {
  const full = Math.round(value);
  return <T className={`${size} text-primary`}>{'★'.repeat(full)}{'☆'.repeat(Math.max(0, 5 - full))}</T>;
}

function StarPicker({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <View className="mb-4 flex-row gap-2">
      {[1, 2, 3, 4, 5].map((n) => (
        <Pressable key={n} onPress={() => onChange(n)} hitSlop={6} className="active:opacity-70">
          <T className={`text-4xl ${n <= value ? 'text-primary' : 'text-muted-foreground'}`}>{n <= value ? '★' : '☆'}</T>
        </Pressable>
      ))}
    </View>
  );
}

export function ReviewCard({ title, r }: { title: string; r: Review }) {
  return (
    <Card className="mb-3">
      <T className="text-xs text-muted-foreground">{title} · {ago(r.createdAt)}</T>
      <View className="mt-1"><Stars value={r.rating} size="text-lg" /></View>
      {r.comment ? <T className="mt-2 text-sm leading-6">{r.comment}</T> : null}
    </Card>
  );
}

/** Shown on a completed contract: leave your review and see the other party's. */
export function ReviewSection({ contractId, otherName }: { contractId: string; otherName: string }) {
  const q = useContractReviews(contractId);
  const submit = useSubmitReview();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');

  if (q.isLoading) return null;
  if (q.error || !q.data) return <View className="mt-6"><ErrorBox message={q.error?.message ?? 'Could not load reviews'} onRetry={() => q.refetch()} /></View>;
  const { mine, theirs } = q.data;

  const send = () => {
    if (rating < 1) return Alert.alert('Pick a rating', 'Tap a star from 1 to 5.');
    submit.mutate({ contractId, rating, comment: comment.trim() || undefined }, {
      onSuccess: () => { setRating(0); setComment(''); },
      onError: (e) => Alert.alert('Could not save review', e.message),
    });
  };

  return (
    <View>
      <SectionLabel>Reviews</SectionLabel>
      {mine ? (
        <ReviewCard title="Your review" r={mine} />
      ) : (
        <Card className="mb-3">
          <T className="mb-3 font-display text-lg">How was working with {otherName}?</T>
          <StarPicker value={rating} onChange={setRating} />
          <Field label="Comment" multiline value={comment} onChangeText={setComment} placeholder="Optional. Share what went well." maxLength={1000} />
          <Button title="Submit review" icon="star" onPress={send} loading={submit.isPending} />
        </Card>
      )}
      {theirs ? <ReviewCard title={`${otherName}'s review`} r={theirs} /> : <T className="text-sm text-muted-foreground">{otherName} has not left a review yet.</T>}
    </View>
  );
}

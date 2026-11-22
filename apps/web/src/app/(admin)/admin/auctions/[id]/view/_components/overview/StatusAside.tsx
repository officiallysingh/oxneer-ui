import { Check, ChevronRight, CircleHelp, TriangleAlert } from 'lucide-react';
import { Button, Card, Skeleton, cn } from '@oxneer/ui';
import type { GlossaryTerm } from '../../_lib/facts';
import type { ComingUpEvent } from '../../_lib/now';
import { activeCount, type PeopleCounts } from '../../_lib/people';
import type { Phrase } from '../../_lib/phrase';
import { PhraseText } from '../PhraseText';

const CARD = 'flex flex-col gap-3 rounded-none p-4 shadow-none sm:px-5';

export function AttentionCard({ items, onSeeWho }: { items: Phrase[]; onSeeWho: () => void }) {
  if (items.length === 0) return null;
  return (
    <Card className={cn(CARD, 'border-warning/50')}>
      <div className="flex items-center gap-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-warning/15 text-warning">
          <TriangleAlert className="h-4 w-4" aria-hidden />
        </span>
        <h2 className="text-base font-semibold text-foreground">Needs your attention</h2>
      </div>
      <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
        {items.map((item, index) => (
          <li key={index}>
            <PhraseText phrase={item} />
          </li>
        ))}
      </ul>
      <Button variant="outline" size="sm" onClick={onSeeWho} className="self-start">
        See who
        <ChevronRight />
      </Button>
    </Card>
  );
}

const SEGMENTS: { key: 'ready' | 'pending' | 'no-reply'; label: string; bar: string }[] = [
  { key: 'ready', label: 'Ready, every step done', bar: 'bg-success' },
  { key: 'pending', label: 'Still finishing steps', bar: 'bg-warning' },
  { key: 'no-reply', label: 'Not responded', bar: 'bg-muted-foreground/40' },
];

export function ReadinessCard({
  counts,
  minimum,
  loading,
}: {
  counts: PeopleCounts;
  /** The minimum-participants rule, when the auction has one. */
  minimum: number | null;
  loading: boolean;
}) {
  const total = activeCount(counts);
  const values = {
    ready: counts.ready,
    pending: counts['in-progress'] + counts.review,
    'no-reply': counts['no-reply'],
  };
  const summary = SEGMENTS.map(
    (segment) => `${values[segment.key]} ${segment.label.toLowerCase()}`,
  ).join(', ');

  return (
    <Card className={CARD}>
      <h2 className="text-base font-semibold text-foreground">Who is ready to bid</h2>
      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-2.5 w-full" />
        </div>
      ) : total === 0 ? (
        <p className="text-sm text-muted-foreground">Nobody has been invited yet.</p>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            <span className="font-display text-3xl font-semibold tabular-nums text-foreground">
              {counts.ready}
            </span>{' '}
            of {total} invited
          </p>
          <div
            role="img"
            aria-label={summary}
            className="flex h-2.5 gap-0.5 overflow-hidden rounded-full bg-muted"
          >
            {SEGMENTS.map((segment) =>
              values[segment.key] > 0 ? (
                <span
                  key={segment.key}
                  className={segment.bar}
                  style={{ flexGrow: values[segment.key] }}
                />
              ) : null,
            )}
          </div>
          <ul className="space-y-1.5 text-sm">
            {SEGMENTS.map((segment) => (
              <li key={segment.key} className="flex items-center justify-between gap-3">
                <span className="inline-flex items-center gap-2 text-muted-foreground">
                  <span className={cn('h-2.5 w-2.5 rounded-sm', segment.bar)} aria-hidden />
                  {segment.label}
                </span>
                <span className="font-semibold tabular-nums text-foreground">
                  {values[segment.key]}
                </span>
              </li>
            ))}
          </ul>
          {minimum !== null && (
            <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
              {counts.ready >= minimum ? (
                <>
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" aria-hidden />
                  The minimum of {minimum} is already met, so the auction will go ahead.
                </>
              ) : (
                <>
                  <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" aria-hidden />
                  {minimum - counts.ready} more needed to reach the minimum of {minimum}.
                </>
              )}
            </p>
          )}
        </>
      )}
    </Card>
  );
}

const weekday = (date: Date) => date.toLocaleDateString(undefined, { weekday: 'short' });
const dayOfMonth = (date: Date) => date.toLocaleDateString(undefined, { day: 'numeric' });
const clock = (date: Date) =>
  // 24-hour, like every other time the auction screens show.
  date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false });

export function ComingUpCard({
  events,
  onSeeAll,
}: {
  events: ComingUpEvent[];
  onSeeAll: () => void;
}) {
  if (events.length === 0) return null;
  return (
    <Card className={cn(CARD, 'gap-2')}>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-base font-semibold text-foreground">Coming up</h2>
        <Button variant="link" size="sm" onClick={onSeeAll} className="h-auto px-0">
          All dates
        </Button>
      </div>
      <ul className="divide-y divide-border/60">
        {events.map((event) => (
          <li key={event.key} className="flex gap-3 py-2.5">
            <span className="w-12 shrink-0 text-center">
              <span className="block text-xs font-semibold uppercase text-muted-foreground">
                {weekday(event.at)}
              </span>
              <span className="font-display text-lg font-semibold tabular-nums text-foreground">
                {dayOfMonth(event.at)}
              </span>
            </span>
            <span className="text-sm">
              <span className="block font-semibold text-foreground">{event.title}</span>
              <span className="text-xs text-muted-foreground">
                <span className="tabular-nums">{clock(event.at)}</span> · {event.note}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

export function GlossaryCard({ terms }: { terms: GlossaryTerm[] }) {
  if (terms.length === 0) return null;
  return (
    <Card className={cn(CARD, 'bg-muted/30')}>
      <div className="flex items-center gap-2">
        <CircleHelp className="h-4 w-4 text-muted-foreground" aria-hidden />
        <h2 className="text-base font-semibold text-foreground">New to auctions?</h2>
      </div>
      <dl className="space-y-2 text-sm">
        {terms.map((term) => (
          <div key={term.term}>
            <dt className="font-semibold text-foreground">{term.term}</dt>
            <dd className="text-muted-foreground">{term.meaning}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}

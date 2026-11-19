import { ChevronRight } from 'lucide-react';
import { Button, Card } from '@repo/ui';
import type { KeyAmount, SummaryLine } from '../../_lib/facts';
import { PhraseText } from '../PhraseText';
import { AMOUNT_ICON, SUMMARY_ICON } from '../viewIcons';

export function PlainWordsCard({
  lines,
  onShowRules,
}: {
  lines: SummaryLine[];
  onShowRules: () => void;
}) {
  return (
    <Card aria-labelledby="plain-heading" className="rounded-none p-4 shadow-none sm:px-6 sm:py-5">
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <h2 id="plain-heading" className="text-base font-semibold text-foreground">
          This auction in plain words
        </h2>
        <Button variant="link" size="sm" onClick={onShowRules} className="h-auto gap-0.5 px-0">
          All rules
          <ChevronRight />
        </Button>
      </div>
      <ul className="divide-y divide-border/60">
        {lines.map((line) => {
          const Icon = SUMMARY_ICON[line.key];
          return (
            <li key={line.key} className="flex items-start gap-3 py-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="h-4 w-4" aria-hidden />
              </span>
              <p className="pt-1.5 text-sm text-muted-foreground">
                <PhraseText phrase={line.phrase} />
              </p>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

export function KeyAmounts({ amounts }: { amounts: KeyAmount[] }) {
  return (
    <section aria-label="Key amounts" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {amounts.map((amount) => {
        const Icon = AMOUNT_ICON[amount.key];
        return (
          <Card key={amount.key} className="flex flex-col gap-1.5 rounded-none p-4 shadow-none">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <Icon className="h-3.5 w-3.5" aria-hidden />
              </span>
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {amount.label}
              </span>
            </div>
            <p className="font-display text-xl font-semibold tabular-nums text-foreground sm:text-2xl">
              {amount.value}
            </p>
            <p className="text-xs text-muted-foreground">{amount.note}</p>
          </Card>
        );
      })}
    </section>
  );
}

'use client';

import { useId, useState } from 'react';
import { Check, Lock, X } from 'lucide-react';
import { Card, Checkbox, Label } from '@repo/ui';
import { Pill } from '@/components/common/admin/Pill';
import type { EndTrack, ExampleBid, RuleCard } from '../_lib/rules';
import { PhraseText } from './PhraseText';
import { RULE_ICON } from './viewIcons';

function ExampleBids({ bids }: { bids: ExampleBid[] }) {
  return (
    <div className="space-y-2 rounded-md bg-muted/50 px-3.5 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Example</p>
      <ul className="space-y-1.5">
        {bids.map((bid, index) => (
          <li
            key={index}
            className="grid grid-cols-[4rem_6rem] items-center gap-x-3 gap-y-1 text-sm sm:grid-cols-[4rem_6rem_auto]"
          >
            <span className="text-muted-foreground">{bid.who}</span>
            <span className="font-semibold tabular-nums text-foreground">{bid.amount}</span>
            <Pill
              tone={bid.accepted ? 'success' : 'destructive'}
              className="col-span-2 justify-self-start sm:col-span-1"
            >
              {bid.accepted ? (
                <Check className="h-3 w-3" aria-hidden />
              ) : (
                <X className="h-3 w-3" aria-hidden />
              )}
              {bid.note}
            </Pill>
          </li>
        ))}
      </ul>
    </div>
  );
}

function EndTrackBar({ track }: { track: EndTrack }) {
  const label = `Bidding ${track.start} to ${track.plannedEnd}. Each late bid adds ${track.extensionMinutes} minutes, up to ${track.extensions} times, so it ends by ${track.latestEnd} at the latest.`;
  return (
    <div className="space-y-2 rounded-md bg-muted/50 px-3.5 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        How the end time can move
      </p>
      <div
        role="img"
        aria-label={label}
        className="flex h-7 overflow-hidden rounded-sm text-xs font-semibold"
      >
        <span className="flex flex-[6] items-center bg-muted pl-2 text-foreground">
          Bidding {track.start} – {track.plannedEnd}
        </span>
        {Array.from({ length: Math.min(track.extensions, 5) }, (_, index) => (
          <span
            key={index}
            className="flex flex-1 items-center justify-center border-l border-card bg-policy-raise text-policy-foreground"
          >
            +{track.extensionMinutes}
          </span>
        ))}
      </div>
      <div className="flex justify-between gap-2 text-xs tabular-nums text-muted-foreground">
        <span>{track.start}</span>
        <span>Planned end {track.plannedEnd}</span>
        <span className="font-semibold text-foreground">Latest end {track.latestEnd}</span>
      </div>
    </div>
  );
}

function RuleCardView({ card, showTech }: { card: RuleCard; showTech: boolean }) {
  const Icon = RULE_ICON[card.icon];
  return (
    <Card className="flex flex-col gap-3 rounded-none p-4 shadow-none sm:px-5 sm:py-5">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-4 w-4" aria-hidden />
        </span>
        <h3 className="text-base font-semibold text-foreground">{card.title}</h3>
      </div>

      <div className="space-y-2 text-sm text-muted-foreground">
        {card.paragraphs.map((paragraph, index) => (
          <p key={index}>
            <PhraseText phrase={paragraph} />
          </p>
        ))}
        {card.list && (
          <ol className="list-decimal space-y-1 pl-5">
            {card.list.map((item, index) => (
              <li key={index}>
                <PhraseText phrase={item} />
              </li>
            ))}
          </ol>
        )}
        {card.note && <p>{card.note}</p>}
      </div>

      {card.examples && <ExampleBids bids={card.examples} />}
      {card.endTrack && <EndTrackBar track={card.endTrack} />}
      {card.exampleText && (
        <div className="space-y-1 rounded-md bg-muted/50 px-3.5 py-3 text-sm text-muted-foreground">
          <p className="text-xs font-semibold uppercase tracking-wide">Example</p>
          {card.exampleText.map((line, index) => (
            <p key={index}>
              <PhraseText phrase={line} />
            </p>
          ))}
        </div>
      )}
      {card.status && (
        <Pill tone={card.status.ok ? 'success' : 'warning'} className="self-start">
          {card.status.text}
        </Pill>
      )}

      {showTech && card.tech.length > 0 && (
        <div className="mt-auto flex flex-wrap items-center gap-1.5 border-t border-dashed border-border pt-3">
          <span className="text-xs text-muted-foreground">Set by:</span>
          {card.tech.map((name) => (
            <code
              key={name}
              className="rounded-sm bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground"
            >
              {name}
            </code>
          ))}
        </div>
      )}
    </Card>
  );
}

export function RulesTab({ cards, locked }: { cards: RuleCard[]; locked: boolean }) {
  const [showTech, setShowTech] = useState(false);
  const toggleId = useId();

  return (
    <div className="space-y-4">
      <Card className="flex flex-wrap items-center justify-between gap-3 rounded-none px-4 py-3 shadow-none sm:px-5">
        <div className="flex max-w-3xl items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <Lock className="h-4 w-4" aria-hidden />
          </span>
          <p className="text-sm text-muted-foreground">
            {locked ? (
              <>
                These are the rules every bidder agrees to. They were{' '}
                <strong className="font-semibold text-foreground">locked when you published</strong>
                , so they can’t change while people take part.
              </>
            ) : (
              <>
                These are the rules bidders will agree to. They{' '}
                <strong className="font-semibold text-foreground">lock when you publish</strong>.
              </>
            )}
          </p>
        </div>
        <div className="flex min-h-11 items-center gap-2">
          <Checkbox
            id={toggleId}
            checked={showTech}
            onCheckedChange={(value) => setShowTech(value === true)}
          />
          <Label htmlFor={toggleId} className="cursor-pointer text-sm font-normal">
            Show technical policy names
          </Label>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {cards.map((card) => (
          <RuleCardView key={card.key} card={card} showTech={showTech} />
        ))}
      </div>
    </div>
  );
}

import { Check } from 'lucide-react';
import { Card, cn } from '@repo/ui';
import { Pill, type PillTone } from '@/components/common/admin/Pill';
import type { StepActor, StepRow, StepSection, StepState } from '../_lib/steps';
import { ACTOR_META } from './viewIcons';

const ACTOR_TONE: Record<StepActor, PillTone> = {
  you: 'outline',
  participants: 'info',
  winner: 'success',
  automatic: 'muted',
};

const STATE_PILL: Record<StepState, { label: string; tone: PillTone }> = {
  done: { label: 'Done', tone: 'success' },
  current: { label: 'In progress', tone: 'warning' },
  upcoming: { label: 'Upcoming', tone: 'muted' },
};

function ActorPill({ actor }: { actor: StepActor }) {
  const { label, icon: Icon } = ACTOR_META[actor];
  return (
    <Pill tone={ACTOR_TONE[actor]}>
      <Icon className="h-3 w-3" aria-hidden />
      {label}
    </Pill>
  );
}

function RowMarker({ row }: { row: StepRow }) {
  const Icon = ACTOR_META[row.actor].icon;
  if (row.state === 'done') {
    return (
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-success text-background">
        <Check className="h-4 w-4" strokeWidth={3} aria-hidden />
      </span>
    );
  }
  return (
    <span
      className={cn(
        'flex h-8 w-8 items-center justify-center rounded-full',
        row.state === 'current'
          ? 'bg-primary text-primary-foreground ring-4 ring-primary/20'
          : 'border-2 border-input bg-card text-muted-foreground',
      )}
    >
      <Icon className="h-4 w-4" aria-hidden />
    </span>
  );
}

function ProgressBar({ done, total }: { done: number; total: number }) {
  const share = total ? Math.round((done / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2.5">
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={done}
        aria-label={`${done} of ${total} done`}
        className="h-2 max-w-60 flex-1 overflow-hidden rounded-full bg-muted"
      >
        <span className="block h-full bg-success" style={{ width: `${share}%` }} />
      </div>
      <span className="text-xs font-semibold tabular-nums text-foreground">
        {done} of {total} done
      </span>
    </div>
  );
}

function StepItem({ row }: { row: StepRow }) {
  const status = STATE_PILL[row.state];
  return (
    <li className="grid grid-cols-[32px_minmax(0,1fr)] gap-3 sm:grid-cols-[140px_32px_minmax(0,1fr)] sm:gap-4">
      <div className="hidden pt-1.5 text-right sm:block">
        <p className="text-sm font-semibold tabular-nums text-foreground">{row.whenMain}</p>
        {row.whenSub && <p className="text-xs text-muted-foreground">{row.whenSub}</p>}
      </div>
      <div className="flex justify-center">
        <RowMarker row={row} />
      </div>
      <Card
        className={cn(
          'flex flex-col gap-2 rounded-none px-4 py-3 shadow-none',
          row.state === 'current' && 'border-policy-border',
        )}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-foreground">{row.title}</h3>
          <div className="flex flex-wrap gap-1.5">
            <ActorPill actor={row.actor} />
            <Pill tone={status.tone}>{status.label}</Pill>
          </div>
        </div>
        {row.whenMain && (
          <p className="text-xs tabular-nums text-muted-foreground sm:hidden">
            {row.whenMain}
            {row.whenSub ? ` · ${row.whenSub}` : ''}
          </p>
        )}
        <p className="text-sm text-muted-foreground">{row.description}</p>
        {row.progress && row.progress.total > 0 && (
          <ProgressBar done={row.progress.done} total={row.progress.total} />
        )}
      </Card>
    </li>
  );
}

function SectionHeading({ section }: { section: Pick<StepSection, 'title' | 'subtitle'> }) {
  return (
    <li className="grid grid-cols-[32px_minmax(0,1fr)] gap-3 pt-2 sm:grid-cols-[140px_32px_minmax(0,1fr)] sm:gap-4">
      <span className="hidden sm:block" />
      <span />
      <div>
        <h2 className="text-xs font-bold uppercase tracking-widest text-foreground">
          {section.title}
        </h2>
        <p className="text-xs text-muted-foreground">{section.subtitle}</p>
      </div>
    </li>
  );
}

const LEGEND: StepActor[] = ['you', 'participants', 'winner', 'automatic'];

export function StepsTab({ published, sections }: { published: StepRow; sections: StepSection[] }) {
  return (
    <div className="space-y-4">
      <Card className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 rounded-none px-4 py-3 shadow-none sm:px-5">
        <p className="max-w-2xl text-sm text-muted-foreground">
          Everything that has to happen, in order. Each step shows{' '}
          <strong className="font-semibold text-foreground">who does it</strong> and{' '}
          <strong className="font-semibold text-foreground">by when</strong>.
        </p>
        <div className="flex flex-wrap gap-1.5" aria-label="Who does each step">
          {LEGEND.map((actor) => (
            <ActorPill key={actor} actor={actor} />
          ))}
        </div>
      </Card>

      <ol className="space-y-3.5">
        <StepItem row={published} />
        {sections.map((section) =>
          section.rows.length === 0 ? null : (
            <li key={section.id}>
              <ol className="space-y-3.5">
                <SectionHeading section={section} />
                {section.rows.map((row) => (
                  <StepItem key={row.key} row={row} />
                ))}
              </ol>
            </li>
          ),
        )}
      </ol>
    </div>
  );
}

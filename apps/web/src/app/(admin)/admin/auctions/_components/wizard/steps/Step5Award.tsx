'use client';

import { useCallback, useState } from 'react';
import { Button } from '@repo/ui';
import type { PolicyHeadRQ } from '@repo/api';
import type { AwardState, OfferVisibilityChoice } from '../../../_lib/wizard/types';
import { MutedBadge, OptionRow } from '../ui/wizard-ui';
import { formatMoney, formatTime } from '../../../_lib/wizard/summary';
import { awardNeedsReserve } from '../../../_lib/wizard/validation';
import { paymentTotalNote } from '../../../_lib/wizard/workflow';
import { PolicyCard } from '../award/PolicyCard';
import { ExampleTable, buildExample } from '../award/ExampleTable';
import { AwardSettings } from '../award/AwardSettings';
import { PostAuctionSteps } from '../award/PostAuctionSteps';

export function Step5Award({
  auctionId,
  form,
  onChange,
  direction,
  mechanism,
  offerVisibility,
  reserveEnabled,
  reserveAmount,
  openingPrice,
  currencyUnit,
  endTime,
  latestClose,
  onGoToBasics,
  onPostWorkflowCountChange,
}: {
  auctionId: string;
  form: AwardState;
  onChange: (patch: Partial<AwardState>) => void;
  direction: 'FORWARD' | 'REVERSE';
  mechanism: 'OPEN' | 'CLOCK' | 'SEALED';
  offerVisibility: OfferVisibilityChoice;
  reserveEnabled: boolean;
  reserveAmount: string;
  openingPrice: string;
  currencyUnit: string;
  endTime: string;
  latestClose: string;
  onGoToBasics: () => void;
  onPostWorkflowCountChange: (count: number) => void;
}) {
  const [expanded, setExpanded] = useState<'winner' | 'ties' | 'price' | null>('winner');
  const [paymentHeads, setPaymentHeads] = useState<PolicyHeadRQ[]>([]);

  const latestCloseLabel = latestClose || endTime;
  const closeLabel = latestCloseLabel
    ? `${formatTime(endTime)}${
        latestCloseLabel !== endTime ? ` (${formatTime(latestCloseLabel)} at latest)` : ''
      }`
    : 'At close';

  const forward = direction === 'FORWARD';
  const bidWord = forward ? 'bid' : 'ask';
  const bestWord = forward ? 'highest' : 'lowest';
  const who = forward ? 'bidders' : 'suppliers';
  const Who = forward ? 'Bidders' : 'Suppliers';
  const one = forward ? 'bidder' : 'supplier';
  const One = forward ? 'Bidder' : 'Supplier';
  const owes = forward ? 'owes' : 'is paid';
  const ordinal = (rank: number) => (rank === 2 ? '2nd' : rank === 3 ? '3rd' : `${rank}th`);
  const secondPriceHint = `Second price. ${Who} can ${bidWord} what it’s truly worth to them. Needs a reserve.`;

  const kth = parseInt(form.winnerKth, 10) || 1;
  const priceKth = parseInt(form.winnerPriceKth, 10) || 1;
  const showTie = offerVisibility === 'NOTHING' || mechanism === 'SEALED' || kth > 1;
  const winningLabel =
    mechanism === 'CLOCK'
      ? 'the clock price'
      : priceKth === 1
        ? `the winning ${bidWord}`
        : `the ${ordinal(priceKth)}-${bestWord} ${bidWord}`;
  const reserve = reserveEnabled ? parseFloat(reserveAmount) || 0 : 0;

  const winnerExample = buildExample(
    openingPrice,
    direction,
    { winnerKth: kth, showTie },
    currencyUnit,
  );
  const priceExample = buildExample(
    openingPrice,
    direction,
    { winnerKth: kth, showTie },
    currencyUnit,
  );
  const winnerRow = priceExample.rows[Math.max(0, kth - 1)]!;
  // The price comes from the bid `priceKth - 1` places below the winner.
  const priceRow = priceExample.rows[Math.min(3, kth - 1 + priceKth - 1)] ?? priceExample.rows[1]!;
  const rawOwed = mechanism === 'CLOCK' || priceKth === 1 ? winnerRow.bid : priceRow.bid;
  // A 2nd/3rd-price rule never goes past the reserve.
  const owed =
    priceKth !== 1 && reserve > 0
      ? forward
        ? Math.max(rawOwed, reserve)
        : Math.min(rawOwed, reserve)
      : rawOwed;
  const tieExample = buildExample(
    openingPrice,
    direction,
    { winnerKth: kth, showTie: true },
    currencyUnit,
  );
  const noSaleOutcome =
    form.noSale === 'REAUCTION'
      ? 'the unit is re-auctioned'
      : form.noSale === 'ACCEPT_BEST' && reserveEnabled
        ? 'you decide whether to accept it'
        : forward
          ? 'the unit is marked unsold'
          : 'nothing is awarded';
  const meetsReserve =
    !(reserve > 0) || (forward ? winnerRow.bid >= reserve : winnerRow.bid <= reserve);
  const totalDue = paymentHeads.reduce(
    (sum, head) =>
      sum +
      (head.basis === 'PERCENTAGE_BASED'
        ? (owed * (Number(head.value) || 0)) / 100
        : Number(head.value) || 0),
    0,
  );
  const paymentSuffix = paymentHeads.length
    ? ` The “Winning payment” step charges ${paymentTotalNote(
        paymentHeads,
        winningLabel,
        currencyUnit,
      )}, so in this example the winner pays ${formatMoney(totalDue, currencyUnit)}.`
    : '';

  const reserveIssue = awardNeedsReserve(form) && !reserveEnabled;

  const tieSummary =
    form.ties === 'RANDOM'
      ? 'Picked at random'
      : form.ties === 'REBID'
        ? `Tied ${who} ${bidWord} again`
        : `Earliest ${bidWord} wins`;

  const handleWorkflowChange = useCallback(
    (count: number, heads: PolicyHeadRQ[]) => {
      setPaymentHeads(heads);
      onPostWorkflowCountChange(count);
    },
    [onPostWorkflowCountChange],
  );

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-start">
        <div className="space-y-3">
          <PolicyCard
            title="Who wins"
            subtitle={
              mechanism === 'CLOCK'
                ? `Last ${one} left in`
                : kth === 1
                  ? `The ${bestWord} ${bidWord}`
                  : `The ${ordinal(kth)}-${bestWord} ${bidWord}`
            }
            timing="Runs first at the close"
            right={
              <span className="hidden text-right sm:block">
                <span className="block text-[10px] font-semibold text-policy-foreground">
                  At close
                </span>
                <span className="block text-[10px] text-policy-foreground/60">{closeLabel}</span>
              </span>
            }
            open={expanded === 'winner'}
            onToggle={() => setExpanded(expanded === 'winner' ? null : 'winner')}
          >
            <div className="grid gap-4 px-4 py-4 md:grid-cols-[168px_minmax(0,1fr)]">
              <div>
                <p className="text-xs font-semibold text-foreground">The winner is</p>
                <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                  {mechanism === 'CLOCK'
                    ? `In a clock auction the last ${one} left in wins.`
                    : forward
                      ? 'Forward auction: higher bids are better.'
                      : 'Reverse auction: lower asks are better.'}
                </p>
              </div>
              <div className="space-y-2">
                {mechanism === 'CLOCK' ? (
                  <>
                    <OptionRow
                      title={`The last ${one} left in`}
                      description="Everyone else has dropped out."
                      selected
                      onClick={() => onChange({ winnerKth: '1' })}
                    />
                    <OptionRow
                      title={`The 2nd-${bestWord} ${bidWord}`}
                      description="Rare. Used in some sealed-bid formats."
                      selected={false}
                      disabled
                      badge={<MutedBadge>Not for clock</MutedBadge>}
                      onClick={() => undefined}
                    />
                    <OptionRow
                      title={`The 3rd-${bestWord} ${bidWord}`}
                      description="Rare."
                      selected={false}
                      disabled
                      badge={<MutedBadge>Not for clock</MutedBadge>}
                      onClick={() => undefined}
                    />
                  </>
                ) : (
                  <>
                    <OptionRow
                      title={`The ${bestWord} ${bidWord}`}
                      description="Standard. The best offer wins."
                      selected={form.winnerKth === '1'}
                      onClick={() => onChange({ winnerKth: '1' })}
                    />
                    <OptionRow
                      title={`The 2nd-${bestWord} ${bidWord}`}
                      description="Rare. Used in some sealed-bid formats."
                      selected={form.winnerKth === '2'}
                      onClick={() => onChange({ winnerKth: '2' })}
                    />
                    <OptionRow
                      title={`The 3rd-${bestWord} ${bidWord}`}
                      description="Rare."
                      selected={form.winnerKth === '3'}
                      onClick={() => onChange({ winnerKth: '3' })}
                    />
                  </>
                )}
              </div>
            </div>
            {mechanism !== 'CLOCK' && (
              <ExampleTable
                rows={winnerExample.rows}
                note={
                  meetsReserve
                    ? winnerExample.note
                    : `${winnerExample.note} But that misses the reserve of ${formatMoney(
                        reserve,
                        currencyUnit,
                      )}, so ${noSaleOutcome}.`
                }
                direction={direction}
                currency={currencyUnit}
              />
            )}
          </PolicyCard>

          <PolicyCard
            title="Ties"
            subtitle={tieSummary}
            timing="Runs right after Who wins"
            right={
              <span className="hidden text-right sm:block">
                <span className="block text-[10px] font-semibold text-policy-foreground">
                  At close
                </span>
                <span className="block text-[10px] text-policy-foreground/60">
                  right after Who wins
                </span>
              </span>
            }
            open={expanded === 'ties'}
            onToggle={() => setExpanded(expanded === 'ties' ? null : 'ties')}
          >
            <div className="grid gap-4 px-4 py-4 md:grid-cols-[168px_minmax(0,1fr)]">
              <div>
                <p className="text-xs font-semibold text-foreground">
                  If the winning {bidWord}s tie
                </p>
                <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                  Pick how to break it.
                </p>
              </div>
              <div className="space-y-2">
                <OptionRow
                  title={`The earliest ${bidWord} wins`}
                  description="Rewards whoever committed first. Most common."
                  selected={form.ties === 'EARLIEST'}
                  onClick={() => onChange({ ties: 'EARLIEST' })}
                />
                <OptionRow
                  title="Pick one at random"
                  description={`Every tied ${one} has the same chance.`}
                  selected={form.ties === 'RANDOM'}
                  onClick={() => onChange({ ties: 'RANDOM' })}
                />
                <OptionRow
                  title={`Tied ${who} ${bidWord} again`}
                  description="A short extra round just for them."
                  selected={form.ties === 'REBID'}
                  disabled
                  badge={<MutedBadge>Needs MULTI_ROUND</MutedBadge>}
                  onClick={() => undefined}
                />
                <p className="flex items-start gap-2 rounded-md border border-info/30 bg-info/10 px-3 py-2 text-[11px] leading-snug text-foreground">
                  <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-info" aria-hidden />
                  {mechanism === 'CLOCK'
                    ? `In a clock auction this decides the winner if the last ${who} drop out on the same tick.`
                    : showTie
                      ? mechanism === 'SEALED'
                        ? `Ties are possible here, because sealed ${bidWord}s are hidden from each other.`
                        : `Ties are possible here, because ${who} can’t see the best price.`
                      : `Every ${bidWord} must beat the best price on show, so two ${bidWord}s can’t be equal. This rule only matters if you change what ${who} see.`}
                </p>
              </div>
            </div>
            {showTie && (
              <ExampleTable
                rows={tieExample.rows}
                note={
                  form.ties === 'RANDOM'
                    ? `${One} B or C is picked at random, each with a 50% chance.`
                    : `${One} B ${forward ? 'bid' : 'asked'} ${formatMoney(
                        tieExample.rows[1]!.bid,
                        currencyUnit,
                      )} at ${tieExample.rows[1]!.placed}, before C, so B wins the tie.`
                }
                direction={direction}
                currency={currencyUnit}
              />
            )}
          </PolicyCard>

          <PolicyCard
            title="Winning price"
            subtitle={
              mechanism === 'CLOCK'
                ? 'The clock price'
                : priceKth === 1
                  ? `Their own winning ${bidWord}`
                  : `The ${ordinal(priceKth)}-${bestWord} ${bidWord}`
            }
            timing="Runs after Who wins"
            right={
              <span className="hidden text-right sm:block">
                <span className="block text-[10px] font-semibold text-policy-foreground">
                  At close
                </span>
                <span className="block text-[10px] text-policy-foreground/60">
                  once the winner is known
                </span>
              </span>
            }
            open={expanded === 'price'}
            onToggle={() => setExpanded(expanded === 'price' ? null : 'price')}
          >
            <div className="grid gap-4 px-4 py-4 md:grid-cols-[168px_minmax(0,1fr)]">
              <div>
                <p className="text-xs font-semibold text-foreground">
                  {forward ? 'The winner owes' : 'The winner is paid'}
                </p>
                <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                  This becomes the winning price.
                </p>
              </div>
              <div className="space-y-2">
                {mechanism === 'CLOCK' ? (
                  <>
                    <OptionRow
                      title="The clock price"
                      description="Where the clock stands when the last rival drops out."
                      selected
                      onClick={() => onChange({ winnerPriceKth: '1' })}
                    />
                    <OptionRow
                      title={`The 2nd-${bestWord} ${bidWord}`}
                      description={secondPriceHint}
                      selected={false}
                      disabled
                      badge={<MutedBadge>Not for clock</MutedBadge>}
                      onClick={() => undefined}
                    />
                    <OptionRow
                      title={`The 3rd-${bestWord} ${bidWord}`}
                      description="Rare. Needs a reserve."
                      selected={false}
                      disabled
                      badge={<MutedBadge>Not for clock</MutedBadge>}
                      onClick={() => undefined}
                    />
                  </>
                ) : (
                  <>
                    <OptionRow
                      title={`Their own winning ${bidWord}`}
                      description={
                        forward
                          ? 'First price. What they bid is what they pay.'
                          : 'First price. What they ask is what they’re paid.'
                      }
                      selected={form.winnerPriceKth === '1'}
                      onClick={() => onChange({ winnerPriceKth: '1' })}
                    />
                    <OptionRow
                      title={`The 2nd-${bestWord} ${bidWord}`}
                      description={secondPriceHint}
                      selected={form.winnerPriceKth === '2'}
                      onClick={() => onChange({ winnerPriceKth: '2' })}
                    />
                    <OptionRow
                      title={`The 3rd-${bestWord} ${bidWord}`}
                      description="Rare. Needs a reserve."
                      selected={form.winnerPriceKth === '3'}
                      onClick={() => onChange({ winnerPriceKth: '3' })}
                    />
                  </>
                )}
                {reserveIssue && (
                  <div className="flex flex-wrap items-center gap-2 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-[11px] text-foreground">
                    <span className="flex-1">
                      This rule needs a reserve price. Without one, a weak runner-up would set a
                      very low price.
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-6 px-2 text-[11px]"
                      onClick={onGoToBasics}
                    >
                      Set a reserve
                    </Button>
                  </div>
                )}
              </div>
            </div>
            {mechanism !== 'CLOCK' && (
              <ExampleTable
                rows={priceExample.rows}
                note={`${One} ${String.fromCharCode(
                  65 + Math.max(0, kth - 1),
                )} wins and ${owes} ${formatMoney(owed, currencyUnit)} — ${
                  priceKth === 1
                    ? `their own ${bidWord}.`
                    : `the ${ordinal(Math.min(4, kth + priceKth - 1))}-${bestWord} ${bidWord}${
                        owed !== rawOwed
                          ? forward
                            ? ', raised to the reserve'
                            : ', capped at the reserve'
                          : ''
                      }.`
                }${forward ? paymentSuffix : ''}`}
                direction={direction}
                currency={currencyUnit}
              />
            )}
          </PolicyCard>
        </div>

        <aside className="space-y-3">
          <div className="rounded-lg border border-border bg-card px-3 py-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              At the close
            </p>
            <ol className="mt-2 space-y-2 text-[11px]">
              {[
                {
                  title: 'Who wins',
                  detail: mechanism === 'CLOCK' ? 'When the clock stops' : closeLabel,
                },
                { title: 'Ties', detail: 'Right after who wins' },
                { title: 'Winning price', detail: 'Once the winner is known' },
              ].map((item, index) => (
                <li key={item.title} className="flex items-start gap-2">
                  <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-muted text-[9px] font-semibold text-muted-foreground">
                    {index + 1}
                  </span>
                  <span>
                    <span className="block font-semibold text-foreground">{item.title}</span>
                    <span className="block text-[10px] text-muted-foreground">{item.detail}</span>
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </aside>
      </div>

      <AwardSettings
        form={form}
        onChange={onChange}
        reserveEnabled={reserveEnabled}
        direction={direction}
      />

      <PostAuctionSteps
        auctionId={auctionId}
        closeLabel={closeLabel}
        currencyUnit={currencyUnit}
        onWorkflowChange={handleWorkflowChange}
      />
    </div>
  );
}

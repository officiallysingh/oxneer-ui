'use client';

import type { AwardState } from '../shared/types';
import { OptionRow, inputClass } from '../shared/wizard-ui';

/** No-sale handling and result confirmation. These are auction-level choices,
 *  so they sit outside the three collapsible award policy cards. */
export function AwardSettings({
  form,
  onChange,
  reserveEnabled,
  mechanism,
}: {
  form: AwardState;
  onChange: (patch: Partial<AwardState>) => void;
  reserveEnabled: boolean;
  mechanism: 'OPEN' | 'CLOCK' | 'SEALED';
}) {
  return (
    <>
      <section className="overflow-hidden rounded-lg border border-border bg-card">
        <div className="grid gap-4 px-4 py-4 md:grid-cols-[168px_minmax(0,1fr)]">
          <div>
            <p className="text-xs font-semibold text-foreground">If nothing sells</p>
            <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
              When no bid meets the reserve, or nobody bids.
            </p>
          </div>
          <div className="space-y-2">
            <OptionRow
              title="Mark the unit unsold"
              description="The stock goes back to the listing."
              selected={form.noSale === 'UNSOLD'}
              onClick={() => onChange({ noSale: 'UNSOLD' })}
            />
            <OptionRow
              title="Re-auction it"
              description="Start a new draft with the same settings."
              selected={form.noSale === 'REAUCTION'}
              onClick={() => onChange({ noSale: 'REAUCTION' })}
            />
            {(reserveEnabled || mechanism === 'SEALED' || mechanism === 'CLOCK') && (
              <OptionRow
                title="Let me accept the best bid below the reserve"
                description="You decide after the close."
                selected={form.noSale === 'ACCEPT_BEST'}
                onClick={() => onChange({ noSale: 'ACCEPT_BEST' })}
              />
            )}
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-lg border border-border bg-card">
        <div className="grid gap-4 px-4 py-4 md:grid-cols-[168px_minmax(0,1fr)]">
          <div>
            <p className="text-xs font-semibold text-foreground">Confirming the result</p>
            <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
              Final at the close, or after you check it.
            </p>
          </div>
          <div className="space-y-2">
            <div className="grid gap-2 sm:grid-cols-2">
              <OptionRow
                title="Automatic"
                description="The result is final when bidding closes."
                selected={form.confirmation === 'AUTOMATIC'}
                onClick={() => onChange({ confirmation: 'AUTOMATIC' })}
              />
              <OptionRow
                title="I confirm it"
                description="The result stays provisional until you confirm it."
                selected={form.confirmation === 'MANUAL'}
                onClick={() => onChange({ confirmation: 'MANUAL' })}
              />
            </div>
            {form.confirmation === 'MANUAL' && (
              <div className="flex items-end gap-2 pt-1">
                <label
                  htmlFor="confirm-days"
                  className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
                >
                  Days to confirm
                </label>
                <input
                  id="confirm-days"
                  type="number"
                  min={1}
                  max={30}
                  value={form.confirmDays}
                  onChange={(event) => onChange({ confirmDays: event.target.value })}
                  className={`${inputClass} h-8 w-20`}
                />
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
}

'use client';

import { useEffect } from 'react';
import type { AwardState, NoSaleAction } from '../../../_lib/wizard/types';
import { ChoiceCardGroup, WizardRow, inputClass, type ChoiceCardOption } from '../ui/wizard-ui';

/** No-sale handling and result confirmation. These are auction-level choices,
 *  so they sit outside the three collapsible award policy cards. */
export function AwardSettings({
  form,
  onChange,
  reserveEnabled,
  direction,
}: {
  form: AwardState;
  onChange: (patch: Partial<AwardState>) => void;
  reserveEnabled: boolean;
  direction: 'FORWARD' | 'REVERSE';
}) {
  const forward = direction === 'FORWARD';

  // Accepting a bid past the reserve only makes sense while there is a reserve.
  useEffect(() => {
    if (!reserveEnabled && form.noSale === 'ACCEPT_BEST') onChange({ noSale: 'UNSOLD' });
  }, [reserveEnabled, form.noSale, onChange]);

  const noSaleOptions: ChoiceCardOption<NoSaleAction>[] = [
    {
      value: 'UNSOLD',
      title: forward ? 'Mark the unit unsold' : 'Award nothing',
      description: forward
        ? 'The stock goes back to the listing.'
        : 'You can run a new auction later.',
    },
    {
      value: 'REAUCTION',
      title: 'Re-auction it',
      description: 'Start a new draft with the same settings.',
    },
    ...(reserveEnabled
      ? [
          {
            value: 'ACCEPT_BEST' as const,
            title: forward
              ? 'Let me accept the best bid below the reserve'
              : 'Let me accept the best ask above the reserve',
            description: 'You decide after the close.',
          },
        ]
      : []),
  ];

  return (
    <>
      <WizardRow
        label={forward ? 'If nothing sells' : 'If nothing is awarded'}
        description={
          forward
            ? 'When no bid meets the reserve, or nobody bids.'
            : 'When no ask meets the reserve, or nobody takes part.'
        }
        className="rounded-none border border-border bg-card"
      >
        <ChoiceCardGroup
          label={forward ? 'If nothing sells' : 'If nothing is awarded'}
          columns={noSaleOptions.length === 3 ? 3 : 2}
          value={form.noSale}
          onChange={(noSale) => onChange({ noSale })}
          options={noSaleOptions}
        />
      </WizardRow>

      <WizardRow
        label="Confirming the result"
        description="Final at the close, or after you check it."
        className="rounded-none border border-border bg-card"
      >
        <div className="space-y-2">
          <ChoiceCardGroup
            label="Confirming the result"
            columns={2}
            value={form.confirmation}
            onChange={(confirmation) => onChange({ confirmation })}
            options={[
              {
                value: 'AUTOMATIC',
                title: 'Automatic',
                description: 'The result is final when bidding closes.',
              },
              {
                value: 'MANUAL',
                title: 'I confirm it',
                description: 'The result stays provisional until you confirm it.',
              },
            ]}
          />
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
      </WizardRow>
    </>
  );
}

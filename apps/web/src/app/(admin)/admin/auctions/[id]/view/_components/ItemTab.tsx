import { Card } from '@oxneer/ui';
import { ListingThumbnail } from '@/components/common/admin/ListingThumbnail';
import { Pill } from '@/components/common/admin/Pill';
import type { WizardState } from '../../../_lib/wizard/types';
import type { KeyAmount } from '../_lib/facts';
import { KeyAmounts } from './overview/PlainWordsCard';

interface ItemTabProps {
  state: WizardState;
  amounts: KeyAmount[];
}

export function ItemTab({ state, amounts }: ItemTabProps) {
  const { basics } = state;
  const single = basics.unitType === 'SINGLE_UNIT';
  const first = basics.items[0];
  const verb = basics.direction === 'FORWARD' ? 'sold' : 'bought';

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="min-w-0 space-y-4">
        <Card className="flex flex-col gap-5 rounded-none p-4 shadow-none sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row">
            {first ? (
              <ListingThumbnail listingId={first.id} className="h-40 w-full rounded-md sm:w-56" />
            ) : null}
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <Pill tone="muted" className="self-start">
                {single ? `Single item · ${verb} as a whole` : `Bundle · ${verb} as a whole`}
              </Pill>
              <h2 className="font-display text-xl font-semibold text-foreground">
                {basics.unitName || first?.name || 'No item chosen yet'}
              </h2>
              {single && first && (
                <p className="text-sm text-muted-foreground">
                  Quantity:{' '}
                  <span className="font-semibold tabular-nums text-foreground">
                    {first.quantity}
                  </span>
                </p>
              )}
              {(basics.description || first?.description) && (
                <p className="text-sm text-foreground/90">
                  {basics.description || first?.description}
                </p>
              )}
            </div>
          </div>

          {!single && basics.items.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-semibold text-foreground">
                What’s in the bundle ({basics.items.length})
              </h3>
              <ul className="divide-y divide-border/60 rounded-md border border-border">
                {basics.items.map((item) => (
                  <li key={item.id} className="flex items-center gap-3 px-3 py-2.5">
                    <ListingThumbnail listingId={item.id} />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                      {item.name}
                    </span>
                    <span className="text-sm tabular-nums text-muted-foreground">
                      × {item.quantity}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
        <KeyAmounts amounts={amounts} />
      </div>

      <Card className="flex flex-col gap-2 rounded-none p-4 shadow-none sm:px-5">
        <h2 className="text-base font-semibold text-foreground">What “{verb} as a whole” means</h2>
        <p className="text-sm text-muted-foreground">
          {single
            ? `There is one item and one winner. Bidders can’t bid on parts of it, and the price is for the whole item.`
            : `Every item in the bundle goes to one winner together. Bidders can’t bid on single items, and the price is for the whole bundle.`}
        </p>
      </Card>
    </div>
  );
}

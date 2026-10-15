'use client';

import { useEffect, useState } from 'react';
import { Eye, Layers, Package } from 'lucide-react';
import { listingsApi, blobsApi, AuctionVM, AuctionUnitVM } from '@repo/api';
import { Badge, Button } from '@repo/ui';
import { ListingViewDialog } from '../../listings/_components/ListingViewDialog';
import { formatLabel, resolveStr } from '@/components/common/admin/format';

interface UnitItemRow {
  id: string;
  name: string;
  description?: string;
  quantity?: number;
  thumbnailId?: string | null;
}

function extractUnitItems(
  unit: AuctionUnitVM | undefined,
): { id: string; name?: string; description?: string; quantity?: number }[] {
  if (!unit) return [];
  const raw = unit.items ?? (unit.item ? [unit.item] : []);
  return raw.map((it) =>
    typeof it === 'object' && it !== null
      ? { id: it.id, name: it.name, description: it.description, quantity: it.quantity }
      : { id: it },
  );
}

/** Read-only "Auction Unit Details" block — pricing stats plus the table of
 *  included listings with thumbnails, used by the auction detail view. */
export function AuctionUnitSection({ auction }: { auction: AuctionVM }) {
  const unit = auction.unit;
  const baseItems = extractUnitItems(unit);
  const baseItemsKey = baseItems.map((it) => it.id).join(',');

  const [rows, setRows] = useState<UnitItemRow[]>(
    baseItems.map((it) => ({
      id: it.id,
      name: it.name ?? it.id,
      description: it.description,
      quantity: it.quantity,
    })),
  );
  const [viewListingId, setViewListingId] = useState<string | null>(null);

  useEffect(() => {
    if (!baseItemsKey) return;
    let cancelled = false;
    Promise.all(
      baseItems.map((it) =>
        listingsApi
          .getListingById(it.id)
          .then((listing) => {
            const thumb =
              listing.blobs?.find((b) => b.metadata?.['thumbnail'] === 'true') ??
              listing.blobs?.[0];
            const row: UnitItemRow = {
              id: it.id,
              name: it.name ?? listing.name,
              description: it.description ?? listing.description,
              quantity: it.quantity,
              thumbnailId: thumb?.id ?? null,
            };
            return row;
          })
          .catch(
            (): UnitItemRow => ({
              id: it.id,
              name: it.name ?? it.id,
              description: it.description,
              quantity: it.quantity,
            }),
          ),
      ),
    ).then((results) => {
      if (!cancelled) setRows(results);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseItemsKey]);

  const unitType = resolveStr(unit?.type);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
        <div className="flex items-center justify-between px-5 py-4 bg-muted/30 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">Auction Unit Details</h3>
              <p className="text-xs text-muted-foreground">Pricing and associated items</p>
            </div>
          </div>
          {unitType && (
            <Badge variant="secondary" className="font-semibold text-xs">
              {formatLabel(unitType)}
            </Badge>
          )}
        </div>

        {!unit ? (
          <p className="text-sm text-muted-foreground px-5 py-6 text-center">
            No unit configured for this auction.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-border/50 bg-card border-b border-border">
              <div className="p-4 flex flex-col justify-center">
                <span className="text-xs text-muted-foreground font-medium">Opening Price</span>
                <span className="text-lg font-bold text-foreground mt-0.5">
                  {unit.openingPrice != null ? (
                    <>
                      {auction.monetaryOptions?.currencyUnit
                        ? `${resolveStr(auction.monetaryOptions.currencyUnit)} `
                        : ''}
                      {unit.openingPrice.toLocaleString()}
                    </>
                  ) : (
                    '—'
                  )}
                </span>
              </div>
              <div className="p-4 flex flex-col justify-center">
                <span className="text-xs text-muted-foreground font-medium">Standing Price</span>
                <span className="text-lg font-bold text-success mt-0.5">
                  {unit.standingPrice != null ? (
                    <>
                      {auction.monetaryOptions?.currencyUnit
                        ? `${resolveStr(auction.monetaryOptions.currencyUnit)} `
                        : ''}
                      {unit.standingPrice.toLocaleString()}
                    </>
                  ) : (
                    '—'
                  )}
                </span>
              </div>
              <div className="p-4 flex flex-col justify-center">
                <span className="text-xs text-muted-foreground font-medium">Total Quantity</span>
                <span className="text-lg font-bold text-foreground mt-0.5">
                  {unit.quantity ?? rows.length ?? '—'}
                </span>
              </div>
            </div>

            {rows.length > 0 && (
              <div className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Included Listings ({rows.length})
                  </h4>
                </div>

                <div className="rounded-xl border border-border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/40 text-left">
                        <th className="px-4 py-3 text-xs font-bold text-muted-foreground w-12" />
                        <th className="px-4 py-3 text-xs font-bold text-muted-foreground">Name</th>
                        <th className="px-4 py-3 text-xs font-bold text-muted-foreground hidden md:table-cell">
                          Description
                        </th>
                        <th className="px-4 py-3 text-xs font-bold text-muted-foreground text-center w-20">
                          Qty
                        </th>
                        <th className="px-4 py-3 text-xs font-bold text-muted-foreground text-right w-24">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {rows.map((row) => (
                        <tr key={row.id} className="hover:bg-muted/20 transition-colors">
                          <td className="px-4 py-3">
                            {row.thumbnailId ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={blobsApi.getDownloadUrl(row.thumbnailId)}
                                alt=""
                                className="w-10 h-10 rounded-lg object-cover border border-border shadow-xs"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center border border-border text-muted-foreground">
                                <Package className="h-5 w-5" />
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-semibold text-foreground truncate max-w-[220px]">
                              {row.name}
                            </p>
                            <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
                              ID: {row.id.slice(-8)}
                            </p>
                          </td>
                          <td className="px-4 py-3 hidden md:table-cell">
                            <p className="text-xs text-muted-foreground line-clamp-2 max-w-[320px]">
                              {row.description ?? '—'}
                            </p>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-muted text-foreground">
                              {row.quantity ?? 1}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setViewListingId(row.id)}
                              className="gap-1.5 text-xs h-8"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              <span>View</span>
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <ListingViewDialog listingId={viewListingId} onClose={() => setViewListingId(null)} />
    </div>
  );
}

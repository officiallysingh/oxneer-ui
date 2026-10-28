import type { AuctionVM, AuctionUnitVM, PolicyItemRQ } from '@repo/api';
import { resolveStr } from '@/components/common/admin/format';
import type { BasicsState, OfferState, PriceWindow, SelectedListing, WizardState } from './types';
import { initialWizardState, localInput } from './types';

export interface EditWizardSnapshot {
  state: WizardState;
  unitId?: string;
  auctionType: string;
  status: string;
  /** Raw ISO start time, kept for the invitation workspace. */
  startTime: string;
  /** The new wizard only understands atomic units. Older multi-unit auctions
   *  are still shown, but callers must keep their original unit type when
   *  saving so a round-trip cannot silently turn them into a Bundle. */
  unitSupported: boolean;
  rawUnitType: string;
}

function parseDate(value?: string): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function durationParts(value?: string): { days: string; hours: string; minutes: string } {
  const days = Number(value?.match(/(\d+)D/)?.[1] ?? 0);
  const rawHours = Number(value?.match(/(\d+)H/)?.[1] ?? 0);
  const minutes = Number(value?.match(/(\d+)M/)?.[1] ?? 0);
  return {
    days: String(days + Math.floor(rawHours / 24)),
    hours: String(rawHours % 24),
    minutes: String(minutes),
  };
}

function policyType(policy: PolicyItemRQ): string {
  return resolveStr(policy.type);
}

function itemFromUnit(
  value:
    | string
    | { id: string; name?: string; description?: string; quantity?: number }
    | undefined,
  fallbackName: string,
  fallbackQuantity: number,
): SelectedListing | null {
  if (!value) return null;
  if (typeof value === 'string') {
    return {
      id: value,
      name: fallbackName,
      quantity: String(fallbackQuantity || 1),
    };
  }
  return {
    id: value.id,
    name: value.name || fallbackName,
    description: value.description,
    quantity: String(value.quantity ?? fallbackQuantity ?? 1),
  };
}

function mapUnit(
  unit: AuctionUnitVM | undefined,
  title: string,
): Pick<BasicsState, 'unitType' | 'unitName' | 'items' | 'openingPrice'> {
  if (!unit) {
    return {
      unitType: 'SINGLE_UNIT',
      unitName: title,
      items: [],
      openingPrice: '',
    };
  }

  const type = resolveStr(unit.type);
  const unitType = type === 'SINGLE_UNIT' ? 'SINGLE_UNIT' : 'BUNDLE';
  const openingPrice = String(unit.openingPrice ?? '');

  if (unitType === 'SINGLE_UNIT') {
    const item = itemFromUnit(unit.item, title, unit.quantity ?? 1);
    return {
      unitType,
      unitName: item?.name || title,
      items: item ? [item] : [],
      openingPrice,
    };
  }

  const items = (unit.items ?? [])
    .map((value, index) => itemFromUnit(value, `${title} item ${index + 1}`, 1))
    .filter((item): item is SelectedListing => item !== null);

  return {
    unitType,
    unitName: title,
    items,
    openingPrice,
  };
}

function mapWindows(policies: PolicyItemRQ[]): PriceWindow[] {
  const wrapper = policies.find((policy) => policyType(policy) === 'PRICE_PROGRESSION_POLICY');
  if (!wrapper?.policies?.length) return [];

  return wrapper.policies.map((policy, index) => {
    const type = policyType(policy);
    const mappedType: PriceWindow['type'] = type.includes('CLOCK')
      ? 'CLOCK'
      : type.includes('FIXED_PERCENTAGE')
        ? 'PERCENT'
        : type.includes('PERCENTAGE_RANGE')
          ? 'RANGE'
          : 'STEP';
    const everyMinutes = durationParts(policy.duration);
    return {
      id: policy.id ?? `window-${index + 1}`,
      type: mappedType,
      duration: policy.windowDuration ?? 'PT0S',
      value: String(policy.value ?? ''),
      maxValue: String(policy.maxValue ?? ''),
      steps: policy.steps ?? [],
      clockEveryMinutes:
        mappedType === 'CLOCK'
          ? String(
              Number(everyMinutes.days) * 1440 +
                Number(everyMinutes.hours) * 60 +
                Number(everyMinutes.minutes) || 1,
            )
          : '2',
      clockStopAt: policy.thresholdPrice !== undefined ? String(policy.thresholdPrice) : '',
    };
  });
}

function tieChoice(policies: PolicyItemRQ[]): WizardState['award']['ties'] {
  const tie = policies.find((policy) => policyType(policy).includes('TIE_BREAKING'));
  const type = tie ? policyType(tie) : '';
  if (type.startsWith('RANDOM')) return 'RANDOM';
  if (type.startsWith('COMPETE')) return 'REBID';
  return 'EARLIEST';
}

function offerVisibilityChoice(value: string): OfferState['offerVisibility'] {
  if (value === 'RANK') return 'RANK';
  if (value === 'FULL') return 'FULL';
  return 'NOTHING';
}

function participantVisibilityChoice(value: string): OfferState['participantVisibility'] {
  if (value === 'PUBLIC') return 'REAL';
  if (value === 'HIDDEN') return 'HIDDEN';
  return 'ALIAS';
}

function mapSchedule(
  auction: AuctionVM,
  policies: PolicyItemRQ[],
): Pick<WizardState, 'schedule'>['schedule'] {
  const rawStart = auction.schedule?.startTime ?? auction.startTime;
  const rawEnd = auction.schedule?.endTime ?? auction.endTime;
  const start = parseDate(rawStart);
  const end = parseDate(rawEnd);
  const fallback = initialWizardState.schedule;

  const totalMinutes =
    start && end ? Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000)) : 0;

  const extension = policies.find((policy) => policyType(policy).includes('EXTENSION'));
  const extensionMinutes = extension?.duration?.match(/(\d+)M/)?.[1];

  return {
    startTime: start ? localInput(start) : fallback.startTime,
    endMode: end ? 'FIXED' : 'DURATION',
    durationHours:
      totalMinutes > 0 ? String(Math.floor(totalMinutes / 60)) : fallback.durationHours,
    durationMinutes: totalMinutes > 0 ? String(totalMinutes % 60) : fallback.durationMinutes,
    endTime: end ? localInput(end) : fallback.endTime,
    softCloseEnabled: Boolean(extension),
    extendMinutes: extensionMinutes ?? fallback.extendMinutes,
    extensionReference:
      resolveStr(extension?.reference) === 'FROM_LATEST_OFFER_TIME'
        ? 'FROM_LATEST_OFFER_TIME'
        : 'FROM_AUCTION_END_TIME',
    limitEnabled: Boolean(extension && (extension.limit ?? 0) > 0),
    extensionLimit: String(extension?.limit ?? fallback.extensionLimit),
  };
}

/** Maps a saved auction, its policies and its workflow back into the shared
 *  seven-step wizard state. This is the bridge that lets the edit route render
 *  the exact same step components as the create route. */
export function mapAuctionToWizardState(
  auction: AuctionVM,
  policies: PolicyItemRQ[],
): EditWizardSnapshot {
  const auctionType = resolveStr(auction.type);
  const unit = auction.unit ?? auction.units?.[0];
  const rawUnitType = resolveStr(unit?.type);
  const unitSupported = !rawUnitType || rawUnitType === 'SINGLE_UNIT' || rawUnitType === 'BUNDLE';

  const minimum = policies.find(
    (policy) => policyType(policy) === 'MINIMUM_PARTICIPANTS_REQUIREMENT_POLICY',
  );
  const minimumParts = durationParts(minimum?.preStartValidationDuration);
  const reserve = policies.find((policy) => policyType(policy).includes('RESERVE'));

  const winner = policies.find(
    (policy) =>
      policyType(policy).includes('WINNER_DETERMINATION') &&
      !policyType(policy).includes('WINNER_PRICE'),
  );
  const winnerPrice = policies.find((policy) =>
    policyType(policy).includes('WINNER_PRICE_DETERMINATION'),
  );

  const type = auctionType.toUpperCase();
  const status = resolveStr(auction.status).toUpperCase();
  // A clock auction is an atomic-unit auction whose progression windows are
  // clock policies; the auction type alone doesn't say so.
  const windows = mapWindows(policies);
  const clock = type.includes('CLOCK') || windows.some((window) => window.type === 'CLOCK');
  const protocol = auction.protocol;
  const monetary = auction.monetaryOptions;
  const rawStart = auction.schedule?.startTime ?? auction.startTime ?? '';

  const state: WizardState = {
    basics: {
      ...initialWizardState.basics,
      direction: resolveStr(protocol?.direction) === 'REVERSE' ? 'REVERSE' : 'FORWARD',
      accessibility: resolveStr(protocol?.accessibility) === 'PRIVATE' ? 'PRIVATE' : 'PUBLIC',
      title: auction.title ?? '',
      description: auction.description ?? '',
      referenceId: auction.referenceId ?? '',
      currencyUnit: resolveStr(monetary?.currencyUnit) || initialWizardState.basics.currencyUnit,
      precision: String(monetary?.precision ?? initialWizardState.basics.precision),
      roundingMode: resolveStr(monetary?.roundingMode) || initialWizardState.basics.roundingMode,
      reserveEnabled: Boolean(reserve),
      reserveAmount: reserve ? String(reserve.value ?? '') : '',
      ...mapUnit(unit, auction.title ?? ''),
    },
    offer: {
      ...initialWizardState.offer,
      mechanism: clock ? 'CLOCK' : type.includes('SEALED') ? 'SEALED' : 'OPEN',
      windows: clock ? initialWizardState.offer.windows : windows,
      clockWindows: clock && windows.length ? windows : initialWizardState.offer.clockWindows,
      offerVisibility: offerVisibilityChoice(resolveStr(protocol?.offerVisibility)),
      participantVisibility: participantVisibilityChoice(
        resolveStr(protocol?.participantVisibility),
      ),
    },
    schedule: mapSchedule(auction, policies),
    participation: {
      ...initialWizardState.participation,
      minimumEnabled: Boolean(minimum),
      minimumCount: String(minimum?.count ?? initialWizardState.participation.minimumCount),
      checkDays: minimum ? minimumParts.days : initialWizardState.participation.checkDays,
      checkHours: minimum ? minimumParts.hours : initialWizardState.participation.checkHours,
      checkMinutes: minimum ? minimumParts.minutes : initialWizardState.participation.checkMinutes,
    },
    award: {
      ...initialWizardState.award,
      winnerType: winner ? policyType(winner) : initialWizardState.award.winnerType,
      winnerKth: String(winner?.kth ?? initialWizardState.award.winnerKth),
      winnerPriceType: winnerPrice
        ? policyType(winnerPrice)
        : initialWizardState.award.winnerPriceType,
      winnerPriceKth: String(winnerPrice?.kth ?? initialWizardState.award.winnerPriceKth),
      ties: tieChoice(policies),
    },
  };

  return {
    state,
    unitId: unit?.id,
    auctionType,
    status,
    startTime: rawStart,
    unitSupported,
    rawUnitType,
  };
}

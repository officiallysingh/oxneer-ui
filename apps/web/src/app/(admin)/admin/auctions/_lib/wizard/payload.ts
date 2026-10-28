import type { AuctionUnitBody, PolicyItemRQ } from '@repo/api';
import { resolveStr } from '@/components/common/admin/format';
import { POLICY_DEFAULTS } from '../../_components/PolicyShared';
import type {
  BasicsState,
  OfferVisibilityChoice,
  ParticipantVisibilityChoice,
  ParticipationState,
  PriceWindow,
  WizardState,
} from './types';

export const AUCTION_TYPE = 'OFFER_BASE_STEP_PRICED_ATOMIC_UNIT_AUCTION';

export function buildMinimumParticipantsPolicy(form: ParticipationState): PolicyItemRQ | null {
  if (!form.minimumEnabled) return null;
  const days = parseInt(form.checkDays, 10) || 0;
  const hours = parseInt(form.checkHours, 10) || 0;
  const minutes = parseInt(form.checkMinutes, 10) || 0;
  const totalHours = days * 24 + hours;
  const duration =
    totalHours && minutes
      ? `PT${totalHours}H${minutes}M`
      : totalHours
        ? `PT${totalHours}H`
        : minutes
          ? `PT${minutes}M`
          : 'PT0S';
  return {
    type: 'MINIMUM_PARTICIPANTS_REQUIREMENT_POLICY',
    name: 'Minimum required participants',
    description: 'Minimum required participants, if not met then the Auction will be cancelled',
    order: 1,
    count: parseInt(form.minimumCount, 10) || 0,
    preStartValidationDuration: duration,
  };
}

/** UI choices the design adds ahead of the backend enum. Unknown values fall
 *  back to the closest enum the creation payload accepts. */
export function participantVisibilityValue(choice: ParticipantVisibilityChoice): string {
  if (choice === 'REAL') return 'PUBLIC';
  return 'ALIAS';
}

export function offerVisibilityValue(choice: OfferVisibilityChoice): string {
  if (choice === 'RANK') return 'RANK';
  if (choice === 'NOTHING') return 'PRICE';
  return 'FULL';
}

export function buildUnit(basics: BasicsState, unitId?: string): AuctionUnitBody | undefined {
  const openingPrice = parseFloat(basics.openingPrice);
  if (Number.isNaN(openingPrice)) return undefined;

  if (basics.unitType === 'SINGLE_UNIT') {
    const item = basics.items[0];
    if (!item) return undefined;
    return {
      ...(unitId ? { id: unitId } : {}),
      type: 'SINGLE_UNIT',
      openingPrice,
      item: {
        id: item.id,
        name: basics.unitName.trim() || item.name,
        description: item.description,
        quantity: parseInt(item.quantity, 10) || 1,
      },
    };
  }

  if (!basics.items.length) return undefined;
  return {
    ...(unitId ? { id: unitId } : {}),
    type: 'BUNDLE',
    openingPrice,
    items: basics.items.map((item) => ({
      id: item.id,
      quantity: parseInt(item.quantity, 10) || 1,
    })),
  };
}

function objectId(): string {
  const chars = '0123456789abcdef';
  return Array.from({ length: 24 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

const WINDOW_POLICY_TYPE: Record<string, string> = {
  STEP: 'STEP_BASED_OFFER_PRICE_POLICY',
  PERCENT: 'FIXED_PERCENTAGE_BASED_OFFER_PRICE_POLICY',
  RANGE: 'PERCENTAGE_RANGE_BASED_OFFER_PRICE_POLICY',
};

const TIE_POLICY_TYPE: Record<string, string> = {
  EARLIEST: 'EARLIEST_OFFER_TIE_BREAKING_POLICY',
  RANDOM: 'RANDOM_TIE_BREAKING_POLICY',
  REBID: 'COMPETE_IN_ANOTHER_ROUND_TIE_BREAKING_POLICY',
};

const TIE_POLICY_TEXT: Record<string, { name: string; description: string }> = {
  EARLIEST_OFFER_TIE_BREAKING_POLICY: {
    name: 'Earliest offer tie breaking',
    description: 'If the winning offers tie, the earliest offer wins',
  },
  RANDOM_TIE_BREAKING_POLICY: {
    name: 'Random tie breaking',
    description: 'If the winning offers tie, one is picked at random',
  },
  COMPETE_IN_ANOTHER_ROUND_TIE_BREAKING_POLICY: {
    name: 'Compete in another round',
    description: 'If the winning offers tie, the tied participants bid again',
  },
};

function priceWindowPolicy(window: PriceWindow, index: number, last: boolean): PolicyItemRQ {
  const windowDuration = last ? 'PT0S' : window.duration || 'PT0S';
  if (window.type === 'CLOCK') {
    const defaults = POLICY_DEFAULTS.CLOCK_BASED_PRICE_CHANGE_POLICY;
    return {
      id: objectId(),
      type: 'CLOCK_BASED_PRICE_CHANGE_POLICY',
      name: defaults?.name,
      description: defaults?.description,
      order: index + 1,
      windowDuration,
      basis: 'AMOUNT_BASED',
      value: parseFloat(window.value) || 0,
      duration: `PT${parseInt(window.clockEveryMinutes, 10) || 1}M`,
      thresholdPrice: parseFloat(window.clockStopAt) || 0,
    };
  }
  const type = WINDOW_POLICY_TYPE[window.type] ?? WINDOW_POLICY_TYPE.STEP!;
  const defaults = POLICY_DEFAULTS[type];
  const item: PolicyItemRQ = {
    id: objectId(),
    type,
    name: defaults?.name,
    description: defaults?.description,
    order: index + 1,
    windowDuration,
    value: parseFloat(window.value) || 0,
  };
  if (window.type === 'STEP' && window.steps.length) item.steps = window.steps;
  if (window.type === 'RANGE') item.maxValue = parseFloat(window.maxValue) || 0;
  return item;
}

export function buildPolicyPayload(state: WizardState, policyTypeOrder: string[]): PolicyItemRQ[] {
  // No-sale handling and result confirmation have no backend fields yet, so
  // they stay in wizard state (and the review copy).
  const policies: PolicyItemRQ[] = [];
  const { offer, schedule, award } = state;

  const minimumPolicy = buildMinimumParticipantsPolicy(state.participation);
  if (minimumPolicy) {
    policies.push({ ...minimumPolicy, id: objectId(), order: 1 });
  }

  // Soft close only applies to open bidding: nobody can react to a late sealed
  // bid, and a clock auction ends when the last rival drops out.
  if (schedule.softCloseEnabled && offer.mechanism === 'OPEN') {
    const extension = POLICY_DEFAULTS.EXTENSION_POLICY;
    policies.push({
      id: objectId(),
      type: 'EXTENSION_POLICY',
      name: extension?.name,
      description: extension?.description,
      reference: schedule.extensionReference,
      duration: `PT${parseInt(schedule.extendMinutes, 10) || 0}M`,
      limit: schedule.limitEnabled ? parseInt(schedule.extensionLimit, 10) || 0 : 0,
    });
  }

  // Open bidding uses step/percentage windows and a clock auction uses clock
  // windows. Sealed has no price progression, and the backend has no sealed
  // representation yet, so an existing progression is left untouched.
  const windows =
    offer.mechanism === 'OPEN'
      ? offer.windows
      : offer.mechanism === 'CLOCK'
        ? offer.clockWindows
        : [];
  if (windows.length) {
    const progression = POLICY_DEFAULTS.PRICE_PROGRESSION_POLICY;
    policies.push({
      id: objectId(),
      type: 'PRICE_PROGRESSION_POLICY',
      name: progression?.name,
      description: progression?.description,
      policies: windows.map((window, index) =>
        priceWindowPolicy(window, index, index === windows.length - 1),
      ),
    });
  }

  const winner = POLICY_DEFAULTS[award.winnerType];
  if (award.winnerType) {
    policies.push({
      id: objectId(),
      type: award.winnerType,
      name: winner?.name,
      description: winner?.description,
      kth: parseInt(award.winnerKth, 10) || 1,
    });
  }

  const winnerPrice = POLICY_DEFAULTS[award.winnerPriceType];
  if (award.winnerPriceType) {
    policies.push({
      id: objectId(),
      type: award.winnerPriceType,
      name: winnerPrice?.name,
      description: winnerPrice?.description,
      kth: parseInt(award.winnerPriceKth, 10) || 1,
    });
  }

  const tieType = TIE_POLICY_TYPE[award.ties];
  if (tieType) {
    policies.push({ id: objectId(), type: tieType, ...TIE_POLICY_TEXT[tieType] });
  }

  const rank = (type: unknown) => {
    const index = policyTypeOrder.indexOf(String(type));
    return index === -1 ? Number.MAX_SAFE_INTEGER : index;
  };

  return policies
    .sort((a, b) => rank(a.type) - rank(b.type))
    .map((item, index) => ({
      ...item,
      order: index + 1,
      policies: item.policies?.map((child, childIndex) => ({
        ...child,
        order: childIndex + 1,
      })),
    }));
}

/** Policies the simple wizard owns. Everything else (participation forms,
 *  preconditions, custom organisation policies) is preserved when editing. */
export function isManagedPolicy(policy: PolicyItemRQ): boolean {
  const type = resolveStr(policy.type);
  return (
    type === 'MINIMUM_PARTICIPANTS_REQUIREMENT_POLICY' ||
    type === 'EXTENSION_POLICY' ||
    type === 'PRICE_PROGRESSION_POLICY' ||
    type.includes('WINNER_DETERMINATION') ||
    type.includes('WINNER_PRICE_DETERMINATION') ||
    type.includes('TIE_BREAKING')
  );
}

/** Replaces the policies the wizard can edit while keeping any custom or
 *  unsupported policies already saved on the auction. */
export function mergePolicyPayload(existing: PolicyItemRQ[], next: PolicyItemRQ[]): PolicyItemRQ[] {
  const nextHasProgression = next.some(
    (policy) => resolveStr(policy.type) === 'PRICE_PROGRESSION_POLICY',
  );
  const preserved = existing.filter((policy) => {
    if (!isManagedPolicy(policy)) return true;
    // A sealed auction keeps its original progression wrapper because the
    // simple editor has nothing to rebuild it from.
    return resolveStr(policy.type) === 'PRICE_PROGRESSION_POLICY' && !nextHasProgression;
  });

  const rank = (policy: PolicyItemRQ) => policy.order ?? Number.MAX_SAFE_INTEGER;
  return [...next, ...preserved]
    .sort((a, b) => rank(a) - rank(b))
    .map((policy, index) => ({
      ...policy,
      order: index + 1,
      policies: policy.policies?.map((child, childIndex) => ({
        ...child,
        order: childIndex + 1,
      })),
    }));
}

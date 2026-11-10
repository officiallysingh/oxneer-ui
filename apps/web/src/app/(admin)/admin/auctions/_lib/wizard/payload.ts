import type {
  AuctionUnitBody,
  AuctionWorkflowStep,
  OfferMechanism,
  OfferRulesCreationRQ,
  OfferVisibility,
  ParticipantVisibility,
  PolicyItemRQ,
  ReservePricePolicyRQ,
  ReservePriceVisibility,
  WorkflowStepPhase,
} from '@repo/api';
import { resolveStr } from '@/components/common/admin/format';
import { POLICY_DEFAULTS, paymentStepData } from '../../_components/PolicyShared';
import type {
  AuctionMechanism,
  BasicsState,
  OfferState,
  OfferVisibilityChoice,
  ParticipantVisibilityChoice,
  ParticipationState,
  PriceWindow,
  ReserveVisibility,
  WizardState,
} from './types';

/** The wizard builds simple (one unit, one round) auctions only. */
export const AUCTION_TYPE = 'SIMPLE';

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

const PARTICIPANT_VISIBILITY: Record<ParticipantVisibilityChoice, ParticipantVisibility> = {
  REAL: 'PUBLIC',
  ALIAS: 'ALIAS',
  HIDDEN: 'HIDDEN',
};

const OFFER_VISIBILITY: Record<OfferVisibilityChoice, OfferVisibility> = {
  FULL: 'FULL',
  RANK: 'RANK',
  NOTHING: 'HIDDEN',
};

const OFFER_MECHANISM: Record<AuctionMechanism, OfferMechanism> = {
  OPEN: 'OPEN',
  CLOCK: 'CLOCKED',
  SEALED: 'SEALED',
};

export function participantVisibilityValue(
  choice: ParticipantVisibilityChoice,
): ParticipantVisibility {
  return PARTICIPANT_VISIBILITY[choice] ?? 'ALIAS';
}

export function offerVisibilityValue(choice: OfferVisibilityChoice): OfferVisibility {
  return OFFER_VISIBILITY[choice] ?? 'FULL';
}

export function offerMechanismValue(mechanism: AuctionMechanism): OfferMechanism {
  return OFFER_MECHANISM[mechanism];
}

export function buildUnit(basics: BasicsState, unitId?: string): AuctionUnitBody | undefined {
  const openingPrice = parseFloat(basics.openingPrice);
  if (Number.isNaN(openingPrice)) return undefined;
  const toItem = (item: BasicsState['items'][number]) => ({
    id: item.id,
    name: item.name,
    ...(item.description ? { description: item.description } : {}),
    quantity: parseInt(item.quantity, 10) || 1,
  });

  if (basics.unitType === 'SINGLE_UNIT') {
    const item = basics.items[0];
    if (!item) return undefined;
    return {
      ...(unitId ? { id: unitId } : {}),
      type: 'SINGLE_UNIT',
      name: basics.unitName.trim() || item.name,
      openingPrice,
      item: toItem(item),
    };
  }

  if (!basics.items.length) return undefined;
  return {
    ...(unitId ? { id: unitId } : {}),
    type: 'BUNDLE',
    name: basics.unitName.trim() || basics.items[0]!.name,
    openingPrice,
    items: basics.items.map(toItem),
  };
}

const RESERVE_VISIBILITY: Record<ReserveVisibility, ReservePriceVisibility> = {
  HIDDEN: 'HIDDEN',
  SHOWN: 'VISIBLE',
  MET_ONLY: 'VISIBLE_ONCE_MET',
};

/** The admin enters the reserve as a price; the API stores it as a margin on
 *  the opening price (added when forward, subtracted when reverse), so the
 *  amount sent is the distance between the two. Validation keeps it on the
 *  right side of the opening price. */
export function buildReservePricePolicy(basics: BasicsState): ReservePricePolicyRQ | undefined {
  if (!basics.reserveEnabled) return undefined;
  const opening = parseFloat(basics.openingPrice);
  const reserve = parseFloat(basics.reserveAmount);
  if (Number.isNaN(opening) || Number.isNaN(reserve)) return undefined;
  const margin = basics.direction === 'FORWARD' ? reserve - opening : opening - reserve;
  return {
    type: 'RESERVE_PRICE_POLICY',
    name: basics.direction === 'FORWARD' ? 'Reserve price' : 'Maximum price',
    basis: 'AMOUNT_BASED',
    value: Math.max(0, margin),
    visibility: RESERVE_VISIBILITY[basics.reserveVisibility],
  };
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
  const base: PolicyItemRQ = {
    type,
    name: defaults?.name,
    description: defaults?.description,
    order: index + 1,
    windowDuration,
  };
  // A range is a band of percentages: the API reads `min` and `max`, not `value`.
  if (window.type === 'RANGE') {
    return {
      ...base,
      min: parseFloat(window.value) || 0,
      max: parseFloat(window.maxValue) || 0,
    };
  }
  const item: PolicyItemRQ = { ...base, value: parseFloat(window.value) || 0 };
  if (window.type === 'STEP' && window.steps.length) item.steps = window.steps;
  return item;
}

/** The price progression for the chosen mechanism: step/percentage windows for
 *  open bidding, clock windows for a clock auction. Sealed has none. */
export function buildPriceProgressionPolicy(offer: OfferState): PolicyItemRQ | null {
  const windows =
    offer.mechanism === 'OPEN'
      ? offer.windows
      : offer.mechanism === 'CLOCK'
        ? offer.clockWindows
        : [];
  if (!windows.length) return null;
  const progression = POLICY_DEFAULTS.PRICE_PROGRESSION_POLICY;
  return {
    type: 'PRICE_PROGRESSION_POLICY',
    name: progression?.name,
    description: progression?.description,
    policies: windows.map((window, index) =>
      priceWindowPolicy(window, index, index === windows.length - 1),
    ),
  };
}

/** Body for `POST /{id}/offer-rules`, or null when the rules can't be stored:
 *  the API requires a price progression, which a sealed auction doesn't have. */
export function buildOfferRules(offer: OfferState): OfferRulesCreationRQ | null {
  const priceProgressionPolicy = buildPriceProgressionPolicy(offer);
  if (!priceProgressionPolicy) return null;
  return {
    offerMechanism: offerMechanismValue(offer.mechanism),
    participantVisibility: participantVisibilityValue(offer.participantVisibility),
    offerVisibility: offerVisibilityValue(offer.offerVisibility),
    priceProgressionPolicy,
  };
}

const withOrders = (policies: PolicyItemRQ[]) =>
  policies.map((policy, index) => ({ ...policy, order: index + 1 }));

/** Setup step 4: the PARTICIPATION policies the wizard owns (minimum participants). */
export function buildPreAuctionPolicies(state: WizardState): PolicyItemRQ[] {
  const minimum = buildMinimumParticipantsPolicy(state.participation);
  return withOrders(minimum ? [minimum] : []);
}

/** Setup step 5: the CLEARING policies the wizard owns, in screen order: who
 *  wins, what they pay, and (sealed only) how ties are broken. No-sale handling
 *  and result confirmation have no backend fields yet, so they stay in wizard
 *  state. The reserve price is set at creation, not here. */
export function buildPostAuctionPolicies(state: WizardState): PolicyItemRQ[] {
  const { offer, award } = state;
  const policies: PolicyItemRQ[] = [];

  if (award.winnerType) {
    const winner = POLICY_DEFAULTS[award.winnerType];
    policies.push({
      type: award.winnerType,
      name: winner?.name,
      description: winner?.description,
      kth: parseInt(award.winnerKth, 10) || 1,
    });
  }

  if (award.winnerPriceType) {
    const winnerPrice = POLICY_DEFAULTS[award.winnerPriceType];
    policies.push({
      type: award.winnerPriceType,
      name: winnerPrice?.name,
      description: winnerPrice?.description,
      kth: parseInt(award.winnerPriceKth, 10) || 1,
    });
  }

  // Only sealed bids can tie: open and clock offers must beat the best price.
  const tieType = TIE_POLICY_TYPE[award.ties];
  if (tieType && offer.mechanism === 'SEALED') {
    policies.push({ type: tieType, ...TIE_POLICY_TEXT[tieType] });
  }

  return withOrders(policies);
}

const policyTypeOf = (policy: PolicyItemRQ) => resolveStr(policy.type);
const policyPhaseOf = (policy: PolicyItemRQ) => resolveStr(policy.phase);

/** Saved policies in the PARTICIPATION phase. */
export function isParticipationPolicy(policy: PolicyItemRQ): boolean {
  return (
    policyPhaseOf(policy) === 'PARTICIPATION' ||
    policyTypeOf(policy) === 'MINIMUM_PARTICIPANTS_REQUIREMENT_POLICY'
  );
}

/** Saved policies in the CLEARING phase, apart from the reserve price (set at creation). */
export function isClearingPolicy(policy: PolicyItemRQ): boolean {
  const type = policyTypeOf(policy);
  if (type === 'RESERVE_PRICE_POLICY') return false;
  return (
    policyPhaseOf(policy) === 'CLEARING' ||
    type.includes('WINNER_DETERMINATION') ||
    type.includes('WINNER_PRICE_DETERMINATION') ||
    type.includes('TIE_BREAKING')
  );
}

/** Policies the wizard may remove when the admin switches them off. Anything
 *  else in the phase (custom organisation policies) is left alone. */
export function isWizardPhasePolicy(policy: PolicyItemRQ): boolean {
  const type = policyTypeOf(policy);
  return (
    type === 'MINIMUM_PARTICIPANTS_REQUIREMENT_POLICY' ||
    type.includes('WINNER_DETERMINATION') ||
    type.includes('WINNER_PRICE_DETERMINATION') ||
    type.includes('TIE_BREAKING')
  );
}

/** The workflow phase of a saved step. Steps without one (terms, participation
 *  form) are always before the auction; a payment carries it in its policy. */
export function workflowStepPhase(step: AuctionWorkflowStep): WorkflowStepPhase {
  const phase = resolveStr(step.phase) || paymentStepData(step).phase;
  return phase === 'POST_AUCTION' ? 'POST_AUCTION' : 'PRE_AUCTION';
}

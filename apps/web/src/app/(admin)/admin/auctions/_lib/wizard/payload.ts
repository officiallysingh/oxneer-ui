import type { AuctionUnitBody, PolicyItemRQ } from '@repo/api';
import { resolveStr } from '@/components/common/admin/format';
import { POLICY_DEFAULTS } from '../../_components/PolicyShared';
import type {
  BasicsState,
  OfferVisibilityChoice,
  ParticipantVisibilityChoice,
  ParticipationState,
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

export function buildPolicyPayload(state: WizardState, policyTypeOrder: string[]): PolicyItemRQ[] {
  // The Award step also captures tie-breaking, no-sale and result-confirmation
  // choices. The creation API has no matching fields or documented policy types
  // for those yet, so they stay in wizard state (and the review copy) and only
  // the winner and winning-price policies are written here.
  const policies: PolicyItemRQ[] = [];
  const { offer, schedule, award } = state;

  const minimumPolicy = buildMinimumParticipantsPolicy(state.participation);
  if (minimumPolicy) {
    policies.push({ ...minimumPolicy, id: objectId(), order: 1 });
  }

  if (schedule.softCloseEnabled) {
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

  // Clock and sealed auctions keep the price policy they were created with.
  // The simple editor cannot represent their progression rules, so it must not
  // rewrite them as step or percentage windows.
  if (offer.mechanism === 'OPEN' && offer.windows.length) {
    const progression = POLICY_DEFAULTS.PRICE_PROGRESSION_POLICY;
    policies.push({
      id: objectId(),
      type: 'PRICE_PROGRESSION_POLICY',
      name: progression?.name,
      description: progression?.description,
      policies: offer.windows.map((window, index) => {
        const type = WINDOW_POLICY_TYPE[window.type] ?? WINDOW_POLICY_TYPE.STEP!;
        const defaults = POLICY_DEFAULTS[type];
        const item: PolicyItemRQ = {
          id: objectId(),
          type,
          name: defaults?.name,
          description: defaults?.description,
          order: index + 1,
          windowDuration: index === offer.windows.length - 1 ? 'PT0S' : window.duration || 'PT0S',
          value: parseFloat(window.value) || 0,
        };
        if (window.type === 'STEP' && window.steps.length) item.steps = window.steps;
        if (window.type === 'RANGE') {
          (item as PolicyItemRQ & { maxValue?: number }).maxValue =
            parseFloat(window.maxValue) || 0;
        }
        return item;
      }),
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
    type.includes('WINNER_PRICE_DETERMINATION')
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
    // A clock or sealed auction keeps its original progression wrapper because
    // the simple editor deliberately does not rebuild it.
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

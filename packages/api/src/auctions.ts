import { apiClient } from './client';
import type { PropertyDef } from './metadata';

export interface AuctionProtocol {
  accessibility: string;
  direction: string;
  dimension: string;
  participantVisibility: string;
  offerVisibility: string;
}

export interface AuctionMonetaryOptions {
  currencyUnit: string;
  precision: number;
  roundingMode: string;
}

export interface AuctionSchedule {
  startTime?: string;
  endTime?: string;
  endMode?: 'DURATION' | 'TIME_RANGE' | Record<string, string>;
}

/** Generic before/after-auction phase, now carried by every workflow step type
 *  except TNC_FORM_STEP and PARTICIPATION_FORM_STEP (those are hardcoded to
 *  PRE_AUCTION server-side and never send `phase` in the request body). */
export type WorkflowStepPhase = 'PRE_AUCTION' | 'POST_AUCTION';

export interface AuctionWorkflowStep {
  id: string;
  type?: string | Record<string, string>;
  name?: string;
  description?: string;
  order?: number;
  policies?: PolicyItemRQ[];
  /** PAYMENT_STEP returns a single embedded policy object, not an array. */
  policy?: PolicyItemRQ;
  /** FORM_STEP — managed-type reference id (may appear at top level or inside `embedded`). */
  typeId?: string;
  /** FORM_STEP embeds the managed-type reference and its resolved property definitions. */
  embedded?: {
    typeId?: string;
    properties?: PropertyDef[];
  };
  /** Before/after-auction phase — carried by every step except TNC_FORM_STEP and
   *  PARTICIPATION_FORM_STEP, which are hardcoded to PRE_AUCTION server-side. */
  phase?: WorkflowStepPhase | Record<string, string>;
  /** PAYMENT_STEP fields — a workflow can carry multiple, one per phase or more. */
  mode?: string | Record<string, string>;
  offset?: string;
  heads?: PolicyHeadRQ[];
  prePayment?: boolean;
  postPayment?: boolean;
  /** PARTICIPATION_FORM_STEP fields. */
  manualApproval?: boolean;
  preStartDeadlineDuration?: string;
  tncText?: string;
  implicit?: boolean;
  /** Required steps must be finished before the participant can bid. */
  mandatory?: boolean;
  status?: {
    type?: string | Record<string, string>;
    updatedAt?: string | null;
    details?: Record<string, string>;
  };
}

export interface AuctionParticipation {
  id?: string;
  postPayment?: boolean;
  [key: string]: unknown;
}

export type AuctionUnitType = 'SINGLE_UNIT' | 'BUNDLE' | 'MULTI_UNIT' | 'LOT';

export interface AuctionUnitItemBody {
  id: string;
  quantity: number;
}

export interface AuctionItemBody {
  id: string;
  name: string;
  description?: string;
  quantity: number;
}

export interface AuctionUnitBody {
  id?: string; // present when updating an existing unit
  type: AuctionUnitType;
  /** What participants see as the thing on offer (3–255 characters). */
  name: string;
  openingPrice: number;
  item?: AuctionItemBody; // SINGLE_UNIT
  /** BUNDLE items carry the listing name too; the API requires it on every item. */
  items?: (AuctionUnitItemBody | AuctionItemBody)[]; // BUNDLE / MULTI_UNIT / LOT
}

export interface AuctionUnit {
  id?: string;
  type: AuctionUnitType;
  openingPrice?: number;
  item?: string;
  items?: string[];
}

export interface AuctionUnitVM {
  id?: string;
  type?: AuctionUnitType | Record<string, string>;
  openingPrice?: number;
  standingPrice?: number;
  quantity?: number;
  item?: string | { id: string; name: string; description?: string; quantity?: number };
  items?: (string | { id: string; name: string; description?: string; quantity?: number })[];
}

export interface AuctionVM {
  id: string;
  type?: string | Record<string, string>;
  format?: string | Record<string, string>;
  status?: string | Record<string, string>;
  title: string;
  description?: string;
  referenceId?: string;
  protocol?: AuctionProtocol;
  monetaryOptions?: AuctionMonetaryOptions;
  /** Currency, time zone and rounding (replaces `monetaryOptions`). */
  regionalSettings?: {
    currency?: string | Record<string, string>;
    timeZone?: string | Record<string, string>;
    roundingMode?: string | Record<string, string>;
  };
  schedule?: AuctionSchedule;
  /** Raw top-level times as returned by the API — also folded into `schedule`
   *  by {@link auctionsApi.withSchedule}. */
  startTime?: string;
  endTime?: string;
  unit?: AuctionUnitVM;
  units?: AuctionUnit[];
  blobs?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface AuctionsFilter {
  phrases?: string[];
  categories?: string[];
  subCategories?: string[];
  statuses?: string[];
  accessibility?: string;
  direction?: string;
  fromTime?: string;
  tillTime?: string;
  page?: number;
  size?: number;
  sort?: string[];
  expand?: string[];
}

export interface PublicAuctionsFilter {
  phrases?: string[];
  categories?: string[];
  subCategories?: string[];
  direction?: string;
  fromTime?: string;
  tillTime?: string;
  page?: number;
}

export interface PaginatedAuctions {
  content?: AuctionVM[];
  page?: {
    currentPage: number;
    pageSize: number;
    totalPages: number;
    totalRecords: number;
    hasNext: boolean;
    hasPrevious: boolean;
    isFirst?: boolean;
    isLast?: boolean;
  };
}

/** Currency, time zone and rounding used for every price and deadline. The
 *  number of decimals follows the currency. */
export interface AuctionRegionalSettings {
  currency: string;
  timeZone: string;
  roundingMode: string;
}

export type ReservePriceBasis = 'PERCENTAGE_BASED' | 'AMOUNT_BASED';
export type ReservePriceVisibility = 'HIDDEN' | 'VISIBLE' | 'VISIBLE_ONCE_MET';

/** Reserve = opening price plus (forward) or minus (reverse) a margin. */
export interface ReservePricePolicyRQ {
  type: 'RESERVE_PRICE_POLICY';
  name?: string;
  description?: string;
  basis: ReservePriceBasis;
  /** The margin: a percent of the opening price, or an amount. Zero or more. */
  value: number;
  visibility: ReservePriceVisibility;
}

/** How offers are made: participants beat the standing price (OPEN), the
 *  platform moves it on a clock (CLOCKED), or hidden offers open at the end (SEALED). */
export type OfferMechanism = 'OPEN' | 'CLOCKED' | 'SEALED';
export type ParticipantVisibility = 'PUBLIC' | 'ALIAS' | 'HIDDEN';
export type OfferVisibility = 'FULL' | 'PRICE' | 'RANK' | 'HIDDEN';

/** Step 2 (Offer rules): `POST /api/v1/auctions/{id}/offer-rules`. Accepted
 *  once per auction; later changes go through the update and policy APIs. */
export interface OfferRulesCreationRQ {
  offerMechanism: OfferMechanism;
  participantVisibility: ParticipantVisibility;
  offerVisibility: OfferVisibility;
  /** A PRICE_PROGRESSION_POLICY with at least one child price rule. */
  priceProgressionPolicy: PolicyItemRQ;
}

/** Setup step 4: `POST /{id}/pre-auction-rules`. At least one policy or step;
 *  orders run 1..n in each list, and each type appears once. */
export interface PreAuctionRulesCreationRQ {
  /** PARTICIPATION policies, e.g. MINIMUM_PARTICIPANTS_REQUIREMENT_POLICY. */
  policies?: PolicyItemRQ[];
  /** PRE_AUCTION workflow steps. */
  steps?: AddWorkflowStepRQ[];
}

/** Setup step 5: `POST /{id}/post-auction-rules`. Submitted whole: both
 *  KTH_PRICE_WINNER_DETERMINATION_POLICY and KTH_WINNER_PRICE_DETERMINATION_POLICY,
 *  and at least one PAYMENT_STEP. */
export interface PostAuctionRulesCreationRQ {
  /** CLEARING policies, not the reserve price. */
  policies: PolicyItemRQ[];
  /** POST_AUCTION workflow steps. */
  steps: AddWorkflowStepRQ[];
}

/** Step 1 (Basics and unit): `POST /api/v1/auctions`. */
export interface AuctionCreationRQ {
  type: 'SIMPLE' | 'MULTI_STAGE' | 'MULTI_ROUND';
  title: string;
  description?: string;
  referenceId?: string;
  direction: string;
  accessibility: string;
  regionalSettings: AuctionRegionalSettings;
  /** At least one; the auction is filed under them. */
  subCategories: string[];
  tags?: string[];
  unit: AuctionUnitBody;
  reservePricePolicy?: ReservePricePolicyRQ;
}

export interface AuctionUpdationRQ {
  title?: string;
  description?: string;
  referenceId?: string;
  accessibility?: string;
  direction?: string;
  offerMechanism?: OfferMechanism;
  participantVisibility?: string;
  offerVisibility?: string;
  regionalSettings?: AuctionRegionalSettings;
  unit?: AuctionUnitBody;
  subCategories?: string[];
  tags?: string[];
}

/** Soft close: a late offer extends the close. Open auctions only. */
export interface SoftCloseRQ {
  reference: 'FROM_AUCTION_END_TIME' | 'FROM_LATEST_OFFER_TIME';
  /** ISO-8601 duration a late offer adds, at least PT1M. */
  duration: string;
  /** Maximum extensions, at least 1. Omit for no limit. */
  limit?: number;
}

/** Setup step 3: `PUT /api/v1/auctions/{id}/schedule`. Accepted once, while the
 *  auction is a draft with offer rules (open bidding only for now). */
export interface AuctionScheduleRQ {
  /** Offset date-time in the auction's time zone, in the future. */
  startTime: string;
  /** DURATION runs for `offerDuration`; TIME_RANGE closes at `endTime`. */
  endMode: 'DURATION' | 'TIME_RANGE';
  /** ISO-8601 duration, e.g. "PT2H". Required for DURATION. */
  offerDuration?: string;
  /** Offset date-time. Required for TIME_RANGE. */
  endTime?: string;
  softClose?: SoftCloseRQ;
}

/** Invites participants to a restricted-access auction by email or phone number. */
export interface AuctionInvitationRQ {
  emails?: string[];
  phoneNumbers?: string[];
}

export interface AuctionUnitCreationRQ {
  tags?: string[];
  subCategories?: string[];
  unit: AuctionUnitBody;
}

export interface AuctionBlobsCreationRQ {
  blobs: string[];
}

export interface PolicyHeadRQ {
  name?: string;
  description?: string;
  type?: string;
  basis: string;
  value: number;
  refundable?: boolean;
}

export interface PolicySchedule {
  reference: 'AUCTION_START_TIME' | 'AUCTION_END_TIME';
  offset: string;
}

export interface PolicyItemRQ {
  id?: string;
  type?: string;
  name?: string;
  description?: string;
  /** Lifecycle phase the policy applies in (e.g. `PARTICIPATION`, `AUCTION`, `CLEARING`). */
  phase?: string | Record<string, string>;
  basis?: string;
  value?: number;
  order?: number;
  currency?: string;
  mode?: string;
  heads?: PolicyHeadRQ[];
  schedule?: PolicySchedule;
  preStartValidationDuration?: string;
  count?: number;
  reference?: string;
  duration?: string;
  limit?: number;
  windowDuration?: string;
  steps?: number[];
  /** PERCENTAGE_RANGE_BASED_OFFER_PRICE_POLICY lower bound (percent). */
  min?: number;
  /** PERCENTAGE_RANGE_BASED_OFFER_PRICE_POLICY upper bound (percent), above `min`. */
  max?: number;
  /** @deprecated Older range policies; the API now reads `max`. */
  maxValue?: number;
  /** CLOCK_BASED_PRICE_CHANGE_POLICY: the price where the clock stops. */
  thresholdPrice?: number;
  kth?: number;
  policies?: PolicyItemRQ[];
  postPayment?: boolean;
  prePayment?: boolean;
  typeId?: string;
  manualApproval?: boolean;
}

/** Mirrors the backend's `Evaluation<E>` — result of running a policy's rule engine. */
export interface PolicyEvaluationStatus {
  type?: string | Record<string, string>;
  details?: Record<string, unknown>;
  updatedAt?: string | null;
}

export interface PolicyEvaluation<E = unknown> {
  result?: E;
  description?: string;
  condition?: boolean;
  status?: PolicyEvaluationStatus;
  details?: Record<string, unknown>;
}

/** Keyed by policy name or id, as returned by the preview/evaluate endpoints. */
export type PolicyEvaluationMap = Record<string, PolicyEvaluation | null>;

// ── Workflow step creation ──────────────────────────────────────────────────

export type WorkflowStepType =
  | 'FORM_STEP'
  | 'TNC_FORM_STEP'
  | 'PAYMENT_STEP'
  | 'BANK_DETAIL_FORM_STEP'
  | 'PARTICIPATION_FORM_STEP';

export interface AddFormStepRQ {
  type: 'FORM_STEP';
  /** Required steps must be finished before the participant can bid. */
  mandatory?: boolean;
  name: string;
  description: string;
  order?: number;
  /** Top-level typeId referencing the ManagedType — backend resolves properties from this. */
  typeId: string;
  /** Whether this custom form is collected before or after the auction. */
  phase: WorkflowStepPhase;
}

/** Hardcoded to PRE_AUCTION server-side — `phase` is never sent in the request body. */
export interface AddTnCFormStepRQ {
  type: 'TNC_FORM_STEP';
  /** Required steps must be finished before the participant can bid. */
  mandatory?: boolean;
  name?: string;
  description?: string;
  order?: number;
  tncText?: string;
  tncBlobId?: string;
}

export interface AddBankDetailFormStepRQ {
  type: 'BANK_DETAIL_FORM_STEP';
  /** Required steps must be finished before the participant can bid. */
  mandatory?: boolean;
  name?: string;
  description?: string;
  order?: number;
  /** Before the auction (refunds) or after it (payouts to the winner). */
  phase?: WorkflowStepPhase;
  /** True when this step exists because a refundable Pre Auction payment head
   *  requires it (bank details are needed to issue that refund); false otherwise. */
  implicit?: boolean;
}

export interface AddPaymentStepRQ {
  type: 'PAYMENT_STEP';
  /** Required steps must be finished before the participant can bid. */
  mandatory?: boolean;
  name?: string;
  description?: string;
  order?: number;
  mode: string;
  phase: WorkflowStepPhase;
  offset: string;
  heads: PolicyHeadRQ[];
}

/** Mirrors the backend `ParticipationFormStep.of(...)` factory — collects a
 *  managed custom form from participants before they can join the auction.
 *  Hardcoded to PRE_AUCTION server-side — `phase` is never sent in the request body. */
export interface AddParticipationFormStepRQ {
  type: 'PARTICIPATION_FORM_STEP';
  /** Required steps must be finished before the participant can bid. */
  mandatory?: boolean;
  name?: string;
  description?: string;
  order?: number;
  manualApproval?: boolean;
  preStartDeadlineDuration?: string;
  typeId: string;
}

export type AddWorkflowStepRQ =
  | AddFormStepRQ
  | AddTnCFormStepRQ
  | AddBankDetailFormStepRQ
  | AddPaymentStepRQ
  | AddParticipationFormStepRQ;

export type AuctionPoliciesRQ = PolicyItemRQ[];

/** `GET /model/currencies` */
export interface CurrencyOption {
  value: string;
  label: string;
  symbol: string;
  decimals: number;
}

/** `GET /model/time-zones` */
export interface TimeZoneOption {
  /** IANA id, e.g. "Asia/Kolkata". */
  value: string;
  /** e.g. "(UTC+05:30) India Standard Time · Asia/Kolkata". */
  label: string;
  offset: string;
}

/** `GET /model/monetary-rounding-modes` */
export interface RoundingModeOption {
  value: string;
  label: string;
  summary?: string;
  description?: string;
  useWhen?: string;
  recommended?: boolean;
  /** Worked examples in the requested currency, e.g. 24.675 → 24.68. */
  examples?: { calculated: string; rounded: string }[];
}

/** Model endpoints return arrays of single-key objects: [{ "KEY": "Label" }, ...] */
export type AuctionModelEntry = Record<string, string>;

function parseModelOptions(entries: AuctionModelEntry[]): { value: string; label: string }[] {
  return entries.flatMap((entry) =>
    Object.entries(entry).map(([value, label]) => ({ value, label })),
  );
}

export const auctionsApi = {
  getPublicAuctions: async (filter: PublicAuctionsFilter = {}): Promise<PaginatedAuctions> => {
    const { phrases, categories, subCategories, direction, fromTime, tillTime, page = 0 } = filter;
    const response = await apiClient.get<PaginatedAuctions>('/api/v1/auctions/public', {
      params: {
        ...(phrases?.length ? { phrases } : {}),
        ...(categories?.length ? { categories } : {}),
        ...(subCategories?.length ? { subCategories } : {}),
        ...(direction ? { direction } : {}),
        ...(fromTime ? { fromTime } : {}),
        ...(tillTime ? { tillTime } : {}),
        page,
      },
    });
    const paginated = response.data;
    if (paginated.content?.length) {
      return { ...paginated, content: paginated.content.map((a) => auctionsApi.withSchedule(a)) };
    }
    return paginated;
  },

  createAuction: async (data: AuctionCreationRQ): Promise<string> => {
    const response = await apiClient.post<{ id: string }>('/api/v1/auctions', data);
    return response.data.id;
  },

  updateAuction: async (id: string, data: AuctionUpdationRQ): Promise<void> => {
    await apiClient.patch(`/api/v1/auctions/${id}`, data);
  },

  /** Setup step 2. Fails with OFFER_RULES_ALREADY_SET once a price progression exists. */
  setOfferRules: async (id: string, data: OfferRulesCreationRQ): Promise<void> => {
    await apiClient.post(`/api/v1/auctions/${id}/offer-rules`, data);
  },

  /** Setup step 4. Accepted once, while the auction has no PARTICIPATION policy
   *  and no PRE_AUCTION workflow step (PRE_AUCTION_RULES_ALREADY_SET otherwise). */
  setPreAuctionRules: async (id: string, data: PreAuctionRulesCreationRQ): Promise<void> => {
    await apiClient.post(`/api/v1/auctions/${id}/pre-auction-rules`, data);
  },

  /** Setup step 5. Accepted once, while the auction has no CLEARING policy
   *  (other than the reserve price) and no POST_AUCTION step. Must hold both
   *  winner policies and a PAYMENT_STEP. */
  setPostAuctionRules: async (id: string, data: PostAuctionRulesCreationRQ): Promise<void> => {
    await apiClient.post(`/api/v1/auctions/${id}/post-auction-rules`, data);
  },

  /** Adds one policy to the auction (it goes last in its phase unless `order` says otherwise). */
  addAuctionPolicy: async (id: string, policy: PolicyItemRQ): Promise<void> => {
    await apiClient.post(`/api/v1/auctions/${id}/policies/add`, policy);
  },

  /** The raw payload carries `startTime`/`endTime` at the top level — fold them
   *  into `schedule` so consumers can rely on the VM shape everywhere. */
  withSchedule: <T extends { startTime?: string; endTime?: string; schedule?: AuctionSchedule }>(
    auction: T,
  ): T => {
    if (auction.schedule || (!auction.startTime && !auction.endTime)) return auction;
    return {
      ...auction,
      schedule: { startTime: auction.startTime, endTime: auction.endTime },
    };
  },

  getAuctions: async (filter: AuctionsFilter = {}): Promise<PaginatedAuctions> => {
    const {
      phrases,
      categories,
      subCategories,
      statuses,
      accessibility,
      direction,
      fromTime,
      tillTime,
      page = 0,
      size = 16,
      sort,
      expand,
    } = filter;
    const response = await apiClient.get<PaginatedAuctions>('/api/v1/auctions', {
      params: {
        ...(phrases?.length ? { phrases } : {}),
        ...(categories?.length ? { categories } : {}),
        ...(subCategories?.length ? { subCategories } : {}),
        ...(statuses?.length ? { statuses } : {}),
        ...(accessibility ? { accessibility } : {}),
        ...(direction ? { direction } : {}),
        ...(fromTime ? { fromTime } : {}),
        ...(tillTime ? { tillTime } : {}),
        ...(sort?.length ? { sort } : {}),
        page,
        size,
      },
      headers: expand?.length ? { 'x-expand': expand } : undefined,
    });
    const paginated = response.data;
    if (paginated.content?.length) {
      return { ...paginated, content: paginated.content.map((a) => auctionsApi.withSchedule(a)) };
    }
    return paginated;
  },

  getAuctionById: async (id: string, expand?: string[]): Promise<AuctionVM> => {
    const response = await apiClient.get<AuctionVM>(`/api/v1/auctions/${id}`, {
      headers: expand?.length ? { 'x-expand': expand } : undefined,
    });
    return auctionsApi.withSchedule(response.data);
  },

  getPublicAuctionById: async (id: string): Promise<AuctionVM> => {
    const response = await apiClient.get<AuctionVM>(`/api/v1/auctions/${id}/public`);
    return auctionsApi.withSchedule(response.data);
  },

  deleteAuction: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/v1/auctions/${id}`);
  },

  /** Invites participants to a restricted-access auction by email or phone number.
   *  Optional step in the wizard — safe to skip if nobody needs a direct invite. */
  inviteParticipants: async (id: string, data: AuctionInvitationRQ): Promise<void> => {
    await apiClient.post(`/api/v1/auctions/${id}/invitations`, data);
  },

  scheduleAuction: async (id: string, data: AuctionScheduleRQ): Promise<void> => {
    await apiClient.put(`/api/v1/auctions/${id}/schedule`, data);
  },

  publishAuction: async (id: string): Promise<void> => {
    await apiClient.put(`/api/v1/auctions/${id}/publish`);
  },

  cancelAuction: async (id: string): Promise<void> => {
    await apiClient.put(`/api/v1/auctions/${id}/cancel`);
  },

  getAuctionWorkflow: async (id: string): Promise<AuctionWorkflowStep[]> => {
    const response = await apiClient.get<AuctionWorkflowStep[]>(`/api/v1/auctions/${id}/workflow`);
    return response.data;
  },

  // getAuctionParticipation: async (id: string): Promise<AuctionParticipation> => {
  //   const response = await apiClient.get<AuctionParticipation>(
  //     `/api/v1/auctions/${id}/participation`,
  //   );
  //   return response.data;
  // },

  /** Payload is a map of stepId -> new order (1-based), not an ordered id array. */
  reorderWorkflowSteps: async (id: string, order: Record<string, number>): Promise<void> => {
    await apiClient.post(`/api/v1/auctions/${id}/workflow/reorder`, order);
  },

  /** Replaces the entire auction workflow in one call.
   *  Accepts the full ordered list of steps (persisted + new).
   *  Persisted steps must include their `id`; new steps omit it. */
  setAuctionWorkflow: async (id: string, steps: AddWorkflowStepRQ[]): Promise<void> => {
    await apiClient.post(`/api/v1/auctions/${id}/workflow`, steps);
  },

  /** Adds a step to the auction workflow. */
  addWorkflowStep: async (id: string, data: AddWorkflowStepRQ): Promise<void> => {
    await apiClient.post(`/api/v1/auctions/${id}/workflow/add`, data);
  },

  /** Updates a workflow step's own fields (name/description/order, or full config for explicit steps). */
  updateWorkflowStep: async (
    id: string,
    stepId: string,
    data: Partial<AddWorkflowStepRQ> & { type: WorkflowStepType },
  ): Promise<void> => {
    await apiClient.put(`/api/v1/auctions/${id}/workflow`, { ...data, id: stepId });
  },

  /** Deletes a single step from the auction workflow. */
  deleteWorkflowStep: async (id: string, stepId: string): Promise<void> => {
    await apiClient.delete(`/api/v1/auctions/${id}/workflow/${stepId}`);
  },

  /** Deletes the entire auction workflow. */
  deleteWorkflow: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/v1/auctions/${id}/workflow`);
  },

  /** Evaluates a draft workflow step that hasn't been saved yet. */
  previewWorkflowStep: async (id: string, data: AddWorkflowStepRQ): Promise<PolicyEvaluation> => {
    const response = await apiClient.post<PolicyEvaluation>(
      `/api/v1/auctions/${id}/workflow/preview`,
      data,
    );
    return response.data;
  },

  /** Evaluates all workflow steps, or only the given step IDs if provided. */
  evaluateWorkflowSteps: async (id: string, stepIds?: string[]): Promise<PolicyEvaluationMap> => {
    const response = await apiClient.post<PolicyEvaluationMap>(
      `/api/v1/auctions/${id}/workflow/evaluate`,
      stepIds?.length ? stepIds : [],
    );
    return response.data;
  },

  /** Evaluates a single saved workflow step by ID. */
  evaluateWorkflowStep: async (id: string, stepId: string): Promise<PolicyEvaluationMap> => {
    const response = await apiClient.post<PolicyEvaluationMap>(
      `/api/v1/auctions/${id}/workflow/${stepId}/evaluate`,
    );
    return response.data;
  },

  setAuctionUnits: async (id: string, data: AuctionUnitCreationRQ): Promise<void> => {
    await apiClient.put(`/api/v1/auctions/${id}/units`, data);
  },

  setAuctionBlobs: async (id: string, data: AuctionBlobsCreationRQ): Promise<void> => {
    await apiClient.put(`/api/v1/auctions/${id}/blobs`, data);
  },

  getAccessibilityTypes: async (): Promise<{ value: string; label: string }[]> => {
    const response = await apiClient.get<AuctionModelEntry[]>(
      '/api/v1/auctions/model/accessibility-types',
    );
    return parseModelOptions(response.data);
  },

  /** Auction types (SIMPLE, MULTI_ROUND, MULTI_STAGE), sent as `type` on create. */
  getFormats: async (): Promise<{ value: string; label: string }[]> => {
    const response = await apiClient.get<AuctionModelEntry[]>(
      '/api/v1/auctions/model/auction/types',
    );
    return parseModelOptions(response.data);
  },

  /** Currencies an auction can be priced in. */
  getCurrencies: async (): Promise<CurrencyOption[]> => {
    const response = await apiClient.get<CurrencyOption[]>('/api/v1/auctions/model/currencies');
    return response.data;
  },

  /** Time zones an auction can be scheduled in. */
  getTimeZones: async (): Promise<TimeZoneOption[]> => {
    const response = await apiClient.get<TimeZoneOption[]>('/api/v1/auctions/model/time-zones');
    return response.data;
  },

  getDimensionTypes: async (): Promise<{ value: string; label: string }[]> => {
    const response = await apiClient.get<AuctionModelEntry[]>(
      '/api/v1/auctions/model/dimension-types',
    );
    return parseModelOptions(response.data);
  },

  getDirectionTypes: async (): Promise<{ value: string; label: string }[]> => {
    const response = await apiClient.get<AuctionModelEntry[]>(
      '/api/v1/auctions/model/direction-types',
    );
    return parseModelOptions(response.data);
  },

  getOfferVisibilityTypes: async (): Promise<{ value: string; label: string }[]> => {
    const response = await apiClient.get<AuctionModelEntry[]>(
      '/api/v1/auctions/model/offer-visibility-types',
    );
    return parseModelOptions(response.data);
  },

  /** Every policy type, in the order the backend lists them. */
  getPolicyTypes: async (): Promise<{ value: string; label: string }[]> => {
    const response = await apiClient.get<AuctionModelEntry[]>(
      '/api/v1/auctions/model/policies/types',
    );
    return parseModelOptions(response.data);
  },

  getAuctionPolicies: async (id: string): Promise<AuctionPoliciesRQ> => {
    const response = await apiClient.get<AuctionPoliciesRQ>(`/api/v1/auctions/${id}/policies`);
    return response.data;
  },

  /** Evaluates a draft policy that hasn't been saved yet (e.g. while editing in a form). */
  previewAuctionPolicy: async (id: string, policy: PolicyItemRQ): Promise<PolicyEvaluationMap> => {
    const response = await apiClient.post<PolicyEvaluationMap>(
      `/api/v1/auctions/${id}/policies/preview`,
      policy,
    );
    return response.data;
  },

  /** Evaluates an already-saved policy by id. */
  evaluateAuctionPolicy: async (id: string, policyId: string): Promise<PolicyEvaluationMap> => {
    const response = await apiClient.post<PolicyEvaluationMap>(
      `/api/v1/auctions/${id}/policies/${policyId}/evaluate`,
    );
    return response.data;
  },

  /** Evaluates all saved policies, or only the given policy ids, in one request.
   *  The backend returns one flat entry per policy id — each value is a single
   *  {@link PolicyEvaluation}, NOT a nested name-keyed map (unlike the per-policy
   *  evaluate endpoint). */
  evaluateAuctionPolicies: async (
    id: string,
    policyIds?: string[],
  ): Promise<PolicyEvaluationMap> => {
    const response = await apiClient.post<PolicyEvaluationMap>(
      `/api/v1/auctions/${id}/policies/evaluate`,
      policyIds ?? [],
    );
    return response.data;
  },

  /** Updates a single saved policy in place (and its related workflow steps). */
  updateAuctionPolicy: async (id: string, policyId: string, data: PolicyItemRQ): Promise<void> => {
    await apiClient.put(`/api/v1/auctions/${id}/policies`, { ...data, id: policyId });
  },

  /** Deletes a single saved policy (and its related workflow steps). */
  deleteAuctionPolicy: async (id: string, policyId: string): Promise<void> => {
    await apiClient.delete(`/api/v1/auctions/${id}/policies/${policyId}`);
  },

  /** Deletes ALL saved policies for the auction. */
  deleteAuctionPolicies: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/v1/auctions/${id}/policies`);
  },

  /** Adds a sub-policy to a composite policy (e.g. a price-progression window). */
  addSubPolicy: async (
    id: string,
    compositePolicyId: string,
    data: PolicyItemRQ,
  ): Promise<void> => {
    await apiClient.post(`/api/v1/auctions/${id}/policies/${compositePolicyId}/policies`, data);
  },

  /** Deletes a sub-policy from a composite policy. */
  deleteSubPolicy: async (
    id: string,
    compositePolicyId: string,
    policyId: string,
  ): Promise<void> => {
    await apiClient.delete(
      `/api/v1/auctions/${id}/policies/${compositePolicyId}/policies/${policyId}`,
    );
  },

  /** Rounding modes for money, with copy and worked examples. The examples use
   *  `currency`'s decimal places (the API defaults to INR). */
  getRoundingModes: async (currency?: string): Promise<RoundingModeOption[]> => {
    const response = await apiClient.get<RoundingModeOption[]>(
      '/api/v1/auctions/model/monetary-rounding-modes',
      { params: currency ? { currency } : {} },
    );
    return response.data;
  },

  getParticipantVisibilityTypes: async (): Promise<{ value: string; label: string }[]> => {
    const response = await apiClient.get<AuctionModelEntry[]>(
      '/api/v1/auctions/model/participant-identity-visibility-types',
    );
    return parseModelOptions(response.data);
  },

  getUnitTypes: async (): Promise<{ value: string; label: string }[]> => {
    const response = await apiClient.get<AuctionModelEntry[]>('/api/v1/auctions/model/unit-types');
    return parseModelOptions(response.data);
  },

  getPaymentModes: async (): Promise<{ value: string; label: string }[]> => {
    const response = await apiClient.get<AuctionModelEntry[]>('/api/v1/payments/modes');
    return parseModelOptions(response.data);
  },
};

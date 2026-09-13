'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { auctionsApi, AuctionUpdationRQ, AuctionUnitType } from '@repo/api';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@repo/ui';
import PageHeader from '@/components/common/admin/PageHeader';
import { parseApiError } from '@/lib/api-errors';
import { resolveStr } from '@/components/common/admin/format';
import { SelectOption } from '../../_components/AuctionShared';
import { AuctionStepIndicator } from '../../_components/AuctionStepIndicator';
import { AuctionStep1Details, Step1State } from '../../_components/AuctionStep1Details';
import { AuctionStep2Units, Step2State, initialStep2 } from '../../_components/AuctionStep2Units';
import { AuctionStep3Policies, initialStep3 } from '../../_components/AuctionStep3Policies';
import type { Step3State } from '../../_components/AuctionStep3Types';
import {
  buildPolicies,
  mapSavedPolicies,
  validatePolicies,
} from '../../_components/AuctionStep3PolicyMapping';
import { AuctionStep5Workflow } from '../../_components/AuctionStep5Workflow';
import { AuctionStep6Invitations } from '../../_components/AuctionStep6Invitations';

/** Derives the UI priceProgression value from the stored auction type key */
function derivePriceProgression(auctionType: string): string {
  if (auctionType.includes('CLOCK_BASED')) return 'CLOCK_BASED';
  if (auctionType.includes('STEP_PRICED')) return 'STEP_BASED';
  if (auctionType.includes('FIXED_PERCENTAGE')) return 'FIXED_PERCENTAGE';
  if (auctionType.includes('PERCENTAGE_RANGE')) return 'PERCENTAGE_RANGE';
  return '';
}

export default function EditAuctionPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [pageLoading, setPageLoading] = useState(true);
  // Lets the auctions table deep-link straight to a step, e.g. `?step=5` to
  // jump to Schedule without walking through the earlier wizard steps.
  const [step, setStep] = useState(() => {
    const requested = parseInt(searchParams.get('step') ?? '', 10);
    return requested >= 1 && requested <= 6 ? requested : 1;
  });

  const [originalStep1, setOriginalStep1] = useState<Step1State | null>(null);
  const origStep2Ref = useRef({ unitType: '', openingPrice: '', items: [] as string[] });
  // The auction unit's own id (distinct from its item id(s)) — must be sent back
  // on update so the backend patches the existing unit instead of creating a new one.
  const [unitId, setUnitId] = useState<string | undefined>(undefined);

  // Step 1
  const [step1, setStep1] = useState<Step1State>({
    title: '',
    description: '',
    referenceId: '',
    format: '',
    accessibility: '',
    direction: '',
    priceProgression: '',
    dimension: '',
    participantVisibility: '',
    offerVisibility: '',
    currencyUnit: '',
    precision: '2',
    roundingMode: '',
  });
  const [step1Errors, setStep1Errors] = useState<Record<string, string>>({});
  const [step1GeneralError, setStep1GeneralError] = useState<string | null>(null);
  const [savingStep1, setSavingStep1] = useState(false);

  // Auction type (loaded from API)
  const [auctionType, setAuctionType] = useState('');

  // Step 2
  const [step2, setStep2] = useState<Step2State>(initialStep2);
  const [step2Errors, setStep2Errors] = useState<Record<string, string>>({});
  const [step2GeneralError, setStep2GeneralError] = useState<string | null>(null);
  const [savingStep2, setSavingStep2] = useState(false);

  // Step 3 – Policies
  const [step3, setStep3] = useState<Step3State>(initialStep3);
  const [step3Errors, setStep3Errors] = useState<Record<string, string>>({});
  const [step3GeneralError, setStep3GeneralError] = useState<string | null>(null);
  const [savingStep3, setSavingStep3] = useState(false);
  // Snapshot of step3 as loaded from the API — used to detect whether the admin
  // has actually changed anything before deciding to offer a Skip affordance.
  const [originalStep3, setOriginalStep3] = useState<Step3State | null>(null);
  // Model options
  const [formats, setFormats] = useState<SelectOption[]>([]);
  const [accessibilityTypes, setAccessibilityTypes] = useState<SelectOption[]>([]);
  const [directionTypes, setDirectionTypes] = useState<SelectOption[]>([]);
  const [dimensionTypes, setDimensionTypes] = useState<SelectOption[]>([]);
  const [participantVisibilityTypes, setParticipantVisibilityTypes] = useState<SelectOption[]>([]);
  const [offerVisibilityTypes, setOfferVisibilityTypes] = useState<SelectOption[]>([]);
  const [roundingModes, setRoundingModes] = useState<SelectOption[]>([]);
  const [unitTypes, setUnitTypes] = useState<SelectOption[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [loadingUnitTypes, setLoadingUnitTypes] = useState(true);

  useEffect(() => {
    Promise.allSettled([
      auctionsApi.getFormats(),
      auctionsApi.getAccessibilityTypes(),
      auctionsApi.getDirectionTypes(),
      auctionsApi.getDimensionTypes(),
      auctionsApi.getParticipantVisibilityTypes(),
      auctionsApi.getOfferVisibilityTypes(),
      auctionsApi.getRoundingModeTypes(),
    ]).then(([fmts, access, dirs, dims, partVis, offerVis, rounding]) => {
      if (fmts.status === 'fulfilled') setFormats(fmts.value);
      if (access.status === 'fulfilled') setAccessibilityTypes(access.value);
      if (dirs.status === 'fulfilled') setDirectionTypes(dirs.value);
      if (dims.status === 'fulfilled') setDimensionTypes(dims.value);
      if (partVis.status === 'fulfilled') setParticipantVisibilityTypes(partVis.value);
      if (offerVis.status === 'fulfilled') setOfferVisibilityTypes(offerVis.value);
      if (rounding.status === 'fulfilled') setRoundingModes(rounding.value);
      setLoadingOptions(false);
    });

    auctionsApi
      .getUnitTypes()
      .then((types) => setUnitTypes(types))
      .finally(() => setLoadingUnitTypes(false));

    Promise.all([
      auctionsApi.getAuctionById(id, ['*']),
      auctionsApi.getAuctionPolicies(id).catch(() => null),
    ])
      .then(([auction, savedPolicies]) => {
        const resolvedType = resolveStr(auction.type);
        const loaded: Step1State = {
          title: auction.title ?? '',
          description: auction.description ?? '',
          referenceId: auction.referenceId ?? '',
          format: resolveStr(auction.format),
          accessibility: resolveStr(auction.protocol?.accessibility),
          direction: resolveStr(auction.protocol?.direction),
          priceProgression: derivePriceProgression(resolvedType),
          dimension: resolveStr(auction.protocol?.dimension),
          participantVisibility: resolveStr(auction.protocol?.participantVisibility),
          offerVisibility: resolveStr(auction.protocol?.offerVisibility),
          currencyUnit: resolveStr(auction.monetaryOptions?.currencyUnit),
          precision: String(auction.monetaryOptions?.precision ?? 2),
          roundingMode: resolveStr(auction.monetaryOptions?.roundingMode),
        };
        setStep1(loaded);
        setOriginalStep1(loaded);
        if (resolvedType) setAuctionType(resolvedType);

        // API may return unit as a singular object or as units[] array
        const rawUnit = auction.unit ?? auction.units?.[0];
        if (rawUnit) {
          setUnitId(rawUnit.id);
          const unitType = resolveStr(rawUnit.type) as AuctionUnitType;
          const isAtomic = unitType === 'SINGLE_UNIT' || unitType === 'BUNDLE';
          const isSingle = unitType === 'SINGLE_UNIT';
          const openingPrice = String(rawUnit.openingPrice ?? '');

          // item(s) — API may return string ids or {id, ...} objects
          const rawItem = rawUnit.item;
          const item = isSingle
            ? typeof rawItem === 'object' && rawItem !== null
              ? (rawItem as { id: string }).id
              : ((rawItem as string | undefined) ?? '')
            : '';

          const rawItems = rawUnit.items ?? [];
          const itemIds = rawItems.map((it) =>
            typeof it === 'object' && it !== null ? (it as { id: string }).id : (it as string),
          );
          const itemQtys = rawItems.map((it) =>
            typeof it === 'object' && it !== null
              ? String((it as { quantity?: number }).quantity ?? 1)
              : '1',
          );

          if (isAtomic) {
            const atomicItems = isSingle ? [item] : itemIds;
            const atomicQtys = isSingle
              ? [String((rawUnit as { quantity?: number }).quantity ?? 1)]
              : itemQtys;
            setStep2({
              unitCategory: 'ATOMIC',
              unitType,
              openingPrice,
              itemName: '',
              itemSummary: null,
              itemQuantity: atomicQtys[0] ?? '1',
              items: atomicItems,
              itemNames: atomicItems.map(() => ''),
              itemSummaries: [],
              itemQuantities: atomicQtys,
              multiItems: [],
              multiItemNames: [],
              multiItemSummaries: [],
              categories: [],
              subCategories: [],
              tags: [],
              lockedCategories: [],
              lockedSubCategories: [],
              lockedTags: [],
            });
            origStep2Ref.current = {
              unitType,
              openingPrice,
              items: atomicItems,
            };
          } else {
            setStep2({
              unitCategory: unitType as 'MULTI_UNIT' | 'LOT',
              unitType,
              openingPrice,
              itemName: '',
              itemSummary: null,
              itemQuantity: '1',
              items: [],
              itemNames: [],
              itemSummaries: [],
              itemQuantities: [],
              multiItems: itemIds,
              multiItemNames: itemIds.map(() => ''),
              multiItemSummaries: [],
              categories: [],
              subCategories: [],
              tags: [],
              lockedCategories: [],
              lockedSubCategories: [],
              lockedTags: [],
            });
            origStep2Ref.current = { unitType, openingPrice, items: itemIds };
          }
        }

        if (savedPolicies && savedPolicies.length > 0) {
          const loaded = { ...initialStep3, ...mapSavedPolicies(savedPolicies) };
          setStep3(loaded);
          setOriginalStep3(loaded);
        }
      })
      .catch(() => setStep1GeneralError('Failed to load auction.'))
      .finally(() => setPageLoading(false));
  }, [id]);

  // ── Step 1 ─────────────────────────────────────────────────────────────────

  const validateStep1 = (): Record<string, string> => {
    const errs: Record<string, string> = {};
    if (!step1.title.trim()) errs.title = 'Title is required.';
    else if (step1.title.trim().length < 5) errs.title = 'Title must be at least 5 characters.';
    else if (step1.title.trim().length > 100) errs.title = 'Title must be at most 100 characters.';
    if (!step1.format) errs.format = 'Format is required.';
    if (!step1.accessibility) errs.accessibility = 'Accessibility is required.';
    if (!step1.direction) errs.direction = 'Direction is required.';
    if (!step1.priceProgression) errs.priceProgression = 'Price progression is required.';
    if (!step1.dimension) errs.dimension = 'Dimension is required.';
    if (!step1.participantVisibility)
      errs.participantVisibility = 'Participant visibility is required.';
    if (!step1.offerVisibility) errs.offerVisibility = 'Offer visibility is required.';
    if (!step1.currencyUnit.trim()) errs.currencyUnit = 'Currency unit is required.';
    const prec = parseInt(step1.precision, 10);
    if (isNaN(prec) || prec < 0 || prec > 3) errs.precision = 'Precision must be between 0 and 3.';
    if (!step1.roundingMode) errs.roundingMode = 'Rounding mode is required.';
    return errs;
  };

  const handleStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStep1GeneralError(null);
    const errs = validateStep1();
    if (Object.keys(errs).length) {
      setStep1Errors(errs);
      return;
    }
    setStep1Errors({});

    const hasChanged =
      !originalStep1 ||
      (Object.keys(step1) as (keyof Step1State)[]).some((k) => step1[k] !== originalStep1[k]);

    if (!hasChanged) {
      setStep(2);
      return;
    }

    setSavingStep1(true);
    try {
      const payload: AuctionUpdationRQ = {
        title: step1.title.trim(),
        description: step1.description.trim() || undefined,
        referenceId: step1.referenceId.trim() || undefined,
        accessibility: step1.accessibility,
        direction: step1.direction,
        participantVisibility: step1.participantVisibility,
        offerVisibility: step1.offerVisibility,
        monetaryOptions: {
          currencyUnit: step1.currencyUnit.trim().toUpperCase(),
          precision: parseInt(step1.precision, 10),
          roundingMode: step1.roundingMode,
        },
      };
      await auctionsApi.updateAuction(id, payload);
      setOriginalStep1(step1);
      setStep(2);
    } catch (err) {
      const parsed = parseApiError(err);
      if (Object.keys(parsed.fieldErrors).length) setStep1Errors(parsed.fieldErrors);
      else setStep1GeneralError(parsed.general ?? 'Failed to update auction.');
    } finally {
      setSavingStep1(false);
    }
  };

  // ── Step 2 ─────────────────────────────────────────────────────────────────

  const buildUnitBodyEdit = () => {
    if (step2.unitCategory === 'ATOMIC') {
      if (step2.unitType === 'SINGLE_UNIT') {
        return {
          id: unitId,
          type: 'SINGLE_UNIT' as AuctionUnitType,
          openingPrice: parseFloat(step2.openingPrice),
          item: {
            id: step2.items[0] ?? '',
            name: step2.itemName || step2.itemSummary?.name || '',
            description: step2.itemSummary?.description || undefined,
            quantity: parseInt(step2.itemQuantity || '1', 10),
          },
        };
      }
      return {
        id: unitId,
        type: 'BUNDLE' as AuctionUnitType,
        openingPrice: parseFloat(step2.openingPrice),
        items: step2.items.map((itemId, i) => ({
          id: itemId,
          quantity: parseInt(step2.itemQuantities[i] || '1', 10),
        })),
      };
    }
    return {
      id: unitId,
      type: step2.unitType as AuctionUnitType,
      openingPrice: parseFloat(step2.openingPrice),
      items: step2.multiItems.map((itemId) => ({ id: itemId, quantity: 1 })),
    };
  };

  const handleStep2Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStep2GeneralError(null);
    const errs: Record<string, string> = {};
    if (!step2.unitCategory) errs.unitType = 'Unit type is required.';
    if (!step2.openingPrice || isNaN(parseFloat(step2.openingPrice)))
      errs.openingPrice = 'Opening price is required.';
    if (step2.unitCategory === 'ATOMIC' && step2.items.length === 0)
      errs.item = 'At least one listing is required.';
    if (
      (step2.unitCategory === 'MULTI_UNIT' || step2.unitCategory === 'LOT') &&
      step2.multiItems.length === 0
    )
      errs.item = 'At least one listing is required.';
    if (Object.keys(errs).length) {
      setStep2Errors(errs);
      return;
    }
    setStep2Errors({});

    const orig = origStep2Ref.current;
    const unitChanged =
      step2.unitType !== orig.unitType ||
      step2.openingPrice !== orig.openingPrice ||
      (step2.unitCategory === 'ATOMIC'
        ? step2.items[0] !== orig.items[0] || step2.items.length !== orig.items.length
        : step2.multiItems.length !== orig.items.length);

    if (!unitChanged) {
      setStep(3);
      return;
    }

    setSavingStep2(true);
    try {
      await auctionsApi.updateAuction(id, { unit: buildUnitBodyEdit() });
      origStep2Ref.current = {
        unitType: step2.unitType,
        openingPrice: step2.openingPrice,
        items: step2.items,
      };
      setStep(3);
    } catch (err) {
      const parsed = parseApiError(err);
      if (Object.keys(parsed.fieldErrors).length) setStep2Errors(parsed.fieldErrors);
      else setStep2GeneralError(parsed.general ?? 'Failed to save auction unit.');
    } finally {
      setSavingStep2(false);
    }
  };

  // ── Step 3 ─────────────────────────────────────────────────────────────────

  const handleStep3Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStep3GeneralError(null);
    const errs = validatePolicies(step3);
    if (Object.keys(errs).length) {
      setStep3Errors(errs);
      return;
    }
    setStep3Errors({});
    setSavingStep3(true);
    try {
      const policyTypeOrder = (await auctionsApi.getPolicyTypes(auctionType)).map(
        (item) => item.value,
      );
      const policies = buildPolicies(step3, policyTypeOrder);
      if (policies.length > 0) {
        await auctionsApi.setAuctionPolicies(id, policies);
      }
      setStep(4);
    } catch (err) {
      const parsed = parseApiError(err);
      if (Object.keys(parsed.fieldErrors).length) setStep3Errors(parsed.fieldErrors);
      else setStep3GeneralError(parsed.general ?? 'Failed to save policies.');
    } finally {
      setSavingStep3(false);
    }
  };

  if (pageLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground gap-2">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm">Loading auction...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Edit Auction"
        description="Update auction details"
        actions={
          <Button variant="outline" size="sm" onClick={() => router.push('/admin/auctions')}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
        }
      />

      <AuctionStepIndicator current={step} onStepClick={setStep} editMode />

      {step === 1 &&
        (() => {
          const hasStep1Changes =
            !originalStep1 ||
            (Object.keys(step1) as (keyof Step1State)[]).some((k) => step1[k] !== originalStep1[k]);
          return (
            <AuctionStep1Details
              form={step1}
              onChange={(u) => setStep1((prev) => ({ ...prev, ...u }))}
              fieldErrors={step1Errors}
              generalError={step1GeneralError}
              formats={formats}
              accessibilityTypes={accessibilityTypes}
              directionTypes={directionTypes}
              dimensionTypes={dimensionTypes}
              participantVisibilityTypes={participantVisibilityTypes}
              offerVisibilityTypes={offerVisibilityTypes}
              roundingModes={roundingModes}
              loadingOptions={loadingOptions}
              saving={savingStep1}
              onSubmit={handleStep1Submit}
              onCancel={() => router.push('/admin/auctions')}
              onSkip={!hasStep1Changes ? () => setStep(2) : undefined}
              submitLabel="Save & Next"
              lockedFields={['format', 'dimension', 'priceProgression', 'direction']}
            />
          );
        })()}

      {step === 2 &&
        (() => {
          const o = origStep2Ref.current;
          const hasStep2Changes =
            step2.unitType !== o.unitType ||
            step2.openingPrice !== o.openingPrice ||
            JSON.stringify(step2.items) !== JSON.stringify(o.items);
          return (
            <AuctionStep2Units
              form={step2}
              onChange={(u) => setStep2((prev) => ({ ...prev, ...u }))}
              fieldErrors={step2Errors}
              generalError={step2GeneralError}
              saving={savingStep2}
              unitTypes={unitTypes}
              loadingUnitTypes={loadingUnitTypes}
              precision={parseInt(step1.precision, 10) || 0}
              onSubmit={handleStep2Submit}
              onBack={() => setStep(1)}
              onSkip={!hasStep2Changes ? () => setStep(3) : undefined}
              submitLabel="Save & Continue"
              submitWithArrow
            />
          );
        })()}

      {step === 3 &&
        (() => {
          const hasStep3Changes =
            !originalStep3 || JSON.stringify(step3) !== JSON.stringify(originalStep3);
          return (
            <AuctionStep3Policies
              auctionId={id}
              isEditMode
              form={step3}
              onChange={(u) => setStep3((prev) => ({ ...prev, ...u }))}
              auctionType={auctionType}
              direction={step1.direction}
              fieldErrors={step3Errors}
              generalError={step3GeneralError}
              saving={savingStep3}
              onSubmit={handleStep3Submit}
              onBack={() => setStep(2)}
              onSkip={!hasStep3Changes ? () => setStep(4) : undefined}
            />
          );
        })()}

      {step === 4 && (
        <AuctionStep5Workflow
          auctionId={id}
          onBack={() => setStep(3)}
          onNext={() => setStep(5)}
          onFinish={() => router.push('/admin/auctions')}
          saveMode="direct"
        />
      )}

      {step === 5 && (
        <AuctionStep5Workflow
          auctionId={id}
          onBack={() => setStep(4)}
          onFinish={() => setStep(6)}
          showScheduleOnly
        />
      )}

      {step === 6 && (
        <AuctionStep6Invitations
          auctionId={id}
          onBack={() => setStep(5)}
          onFinish={() => router.push('/admin/auctions')}
        />
      )}
    </div>
  );
}

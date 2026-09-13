'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auctionsApi, AuctionCreationRQ, AuctionUnitType } from '@repo/api';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@repo/ui';
import PageHeader from '@/components/common/admin/PageHeader';
import { parseApiError } from '@/lib/api-errors';
import { SelectOption } from '../_components/AuctionShared';
import { AuctionStepIndicator } from '../_components/AuctionStepIndicator';
import { AuctionStep1Details, Step1State, initialStep1 } from '../_components/AuctionStep1Details';
import { AuctionStep2Units, Step2State, initialStep2 } from '../_components/AuctionStep2Units';
import {
  AuctionStep3Policies,
  Step3State,
  initialStep3,
} from '../_components/AuctionStep3Policies';
import { buildPolicies, validatePolicies } from '../_components/AuctionStep3PolicyMapping';
import { AuctionStep5Workflow } from '../_components/AuctionStep5Workflow';
import { AuctionStep6Invitations } from '../_components/AuctionStep6Invitations';
function deriveAuctionType(priceProgression: string, unitType: string): string {
  const isAtomic = unitType === 'SINGLE_UNIT' || unitType === 'BUNDLE';
  if (priceProgression === 'STEP_BASED' && isAtomic) {
    return 'OFFER_BASE_STEP_PRICED_ATOMIC_UNIT_AUCTION';
  }
  return '';
}

export default function NewAuctionPage() {
  const router = useRouter();

  const [step, setStep] = useState(1);

  // Step 1
  const [step1, setStep1] = useState<Step1State>(initialStep1);
  const [step1Errors, setStep1Errors] = useState<Record<string, string>>({});
  const [step1GeneralError, setStep1GeneralError] = useState<string | null>(null);

  // Step 2
  const [step2, setStep2] = useState<Step2State>(initialStep2);
  const [step2Errors, setStep2Errors] = useState<Record<string, string>>({});
  const [step2GeneralError, setStep2GeneralError] = useState<string | null>(null);
  const [savingStep2, setSavingStep2] = useState(false);

  // Step 3
  const [createdAuctionId, setCreatedAuctionId] = useState<string | null>(null);
  const [createdAuctionType, setCreatedAuctionType] = useState('');

  // Step 3 – Policies
  const [step3, setStep3] = useState<Step3State>(initialStep3);
  const [step3Errors, setStep3Errors] = useState<Record<string, string>>({});
  const [step3GeneralError, setStep3GeneralError] = useState<string | null>(null);
  const [savingStep3, setSavingStep3] = useState(false);
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
      if (fmts.status === 'fulfilled') {
        setFormats(fmts.value);
        const simpleFmt = fmts.value.find((f) => f.label === 'Simple');
        if (simpleFmt) setStep1((prev) => ({ ...prev, format: simpleFmt.value }));
      }
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
  }, []);

  // ── Step 1 submit ──────────────────────────────────────────────────────────

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

  const handleStep1Submit = (e: React.FormEvent) => {
    e.preventDefault();
    setStep1GeneralError(null);
    const errs = validateStep1();
    if (Object.keys(errs).length) {
      setStep1Errors(errs);
      return;
    }
    setStep1Errors({});
    setStep(2);
  };

  // ── Step 2 submit ──────────────────────────────────────────────────────────

  const validateStep2 = (): Record<string, string> => {
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
    return errs;
  };

  const buildUnitBody = () => {
    if (step2.unitCategory === 'ATOMIC') {
      const isSingle = step2.unitType === 'SINGLE_UNIT';
      if (isSingle) {
        return {
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
        type: 'BUNDLE' as AuctionUnitType,
        openingPrice: parseFloat(step2.openingPrice),
        items: step2.items.map((id, i) => ({
          id,
          quantity: parseInt(step2.itemQuantities[i] || '1', 10),
        })),
      };
    }
    return {
      type: step2.unitType as AuctionUnitType,
      openingPrice: parseFloat(step2.openingPrice),
      items: step2.multiItems.map((id) => ({ id, quantity: 1 })),
    };
  };

  const handleStep2Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStep2GeneralError(null);
    const errs = validateStep2();
    if (Object.keys(errs).length) {
      setStep2Errors(errs);
      return;
    }
    setStep2Errors({});
    setSavingStep2(true);
    try {
      const effectiveUnitType = step2.unitType || step2.unitCategory;
      const auctionType = deriveAuctionType(step1.priceProgression, effectiveUnitType);
      if (!auctionType) {
        setStep2GeneralError(
          'This price progression and unit type combination is not yet supported.',
        );
        setSavingStep2(false);
        return;
      }
      const unitBody = buildUnitBody();
      let auctionId = createdAuctionId;
      if (!auctionId) {
        const payload: AuctionCreationRQ = {
          type: auctionType,
          format: step1.format,
          title: step1.title.trim(),
          description: step1.description.trim() || undefined,
          referenceId: step1.referenceId.trim() || undefined,
          protocol: {
            accessibility: step1.accessibility,
            direction: step1.direction,
            dimension: step1.dimension,
            participantVisibility: step1.participantVisibility,
            offerVisibility: step1.offerVisibility,
          },
          monetaryOptions: {
            currencyUnit: step1.currencyUnit.trim().toUpperCase(),
            precision: parseInt(step1.precision, 10),
            roundingMode: step1.roundingMode,
          },
          tags: step2.tags.length ? step2.tags : undefined,
          subCategories: step2.subCategories.length ? step2.subCategories : undefined,
          unit: unitBody,
        };
        auctionId = await auctionsApi.createAuction(payload);
        setCreatedAuctionId(auctionId);
        setCreatedAuctionType(auctionType);
      } else {
        await auctionsApi.updateAuction(auctionId, {
          tags: step2.tags.length ? step2.tags : undefined,
          subCategories: step2.subCategories.length ? step2.subCategories : undefined,
          unit: unitBody,
        });
      }
      setStep(3);
    } catch (err) {
      const parsed = parseApiError(err);
      const step1FieldNames = new Set([
        'title',
        'format',
        'accessibility',
        'direction',
        'dimension',
        'participantVisibility',
        'offerVisibility',
        'currencyUnit',
        'precision',
        'roundingMode',
      ]);
      const s1Errs: Record<string, string> = {};
      const s2Errs: Record<string, string> = {};
      for (const [k, v] of Object.entries(parsed.fieldErrors)) {
        if (step1FieldNames.has(k)) s1Errs[k] = v;
        else s2Errs[k] = v;
      }
      if (Object.keys(s1Errs).length) {
        setStep1Errors(s1Errs);
        setStep1GeneralError('Please correct the highlighted fields.');
        setStep(1);
      } else if (Object.keys(s2Errs).length) {
        setStep2Errors(s2Errs);
      } else {
        setStep2GeneralError(parsed.general ?? 'Failed to create auction.');
      }
    } finally {
      setSavingStep2(false);
    }
  };

  // ── Step 3 submit ──────────────────────────────────────────────────────────

  const handleStep3Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStep3GeneralError(null);
    const errs = validatePolicies(step3);
    if (Object.keys(errs).length) {
      setStep3Errors(errs);
      return;
    }
    setStep3Errors({});
    if (!createdAuctionId) {
      setStep3GeneralError('Auction ID is missing. Please go back and try again.');
      return;
    }
    setSavingStep3(true);
    try {
      const policyTypeOrder = (await auctionsApi.getPolicyTypes(createdAuctionType)).map(
        (item) => item.value,
      );
      const policies = buildPolicies(step3, policyTypeOrder);
      if (policies.length > 0) {
        await auctionsApi.setAuctionPolicies(createdAuctionId, policies);
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

  const handleSkip = () => router.push('/admin/auctions');

  return (
    <div className="space-y-6">
      <PageHeader
        title="New auction"
        description="Create a new auction"
        actions={
          <Button variant="outline" size="sm" onClick={() => router.push('/admin/auctions')}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
        }
      />

      <AuctionStepIndicator current={step} onStepClick={(s) => s < step && setStep(s)} />

      {step === 1 && (
        <AuctionStep1Details
          form={step1}
          onChange={(u) => {
            setStep1((prev) => ({ ...prev, ...u }));
            const changed = Object.keys(u) as (keyof Step1State)[];
            if (changed.some((f) => step1Errors[f])) {
              setStep1Errors((prev) => {
                const next = { ...prev };
                changed.forEach((f) => delete next[f]);
                return next;
              });
            }
          }}
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
          onSubmit={handleStep1Submit}
          onCancel={() => router.push('/admin/auctions')}
        />
      )}

      {step === 2 && (
        <AuctionStep2Units
          form={step2}
          onChange={(u) => {
            setStep2((prev) => ({ ...prev, ...u }));
            const changed = Object.keys(u);
            if (changed.some((f) => step2Errors[f])) {
              setStep2Errors((prev) => {
                const next = { ...prev };
                changed.forEach((f) => delete next[f]);
                return next;
              });
            }
          }}
          fieldErrors={step2Errors}
          generalError={step2GeneralError}
          saving={savingStep2}
          unitTypes={unitTypes}
          loadingUnitTypes={loadingUnitTypes}
          precision={parseInt(step1.precision, 10) || 0}
          onSubmit={handleStep2Submit}
          onBack={() => setStep(1)}
          onSkip={JSON.stringify(step2) === JSON.stringify(initialStep2) ? handleSkip : undefined}
          submitLabel="Save & Continue"
          submitWithArrow
        />
      )}

      {step === 3 && (
        <AuctionStep3Policies
          auctionId={createdAuctionId ?? undefined}
          form={step3}
          onChange={(u) => setStep3((prev) => ({ ...prev, ...u }))}
          auctionType={createdAuctionType}
          direction={step1.direction}
          fieldErrors={step3Errors}
          generalError={step3GeneralError}
          saving={savingStep3}
          onSubmit={handleStep3Submit}
          onBack={() => setStep(2)}
          onSkip={JSON.stringify(step3) === JSON.stringify(initialStep3) ? handleSkip : undefined}
        />
      )}

      {step === 4 && createdAuctionId && (
        <AuctionStep5Workflow
          auctionId={createdAuctionId}
          onBack={() => setStep(3)}
          onNext={() => setStep(5)}
          onFinish={() => router.push('/admin/auctions')}
        />
      )}

      {step === 5 && createdAuctionId && (
        <AuctionStep5Workflow
          auctionId={createdAuctionId}
          onBack={() => setStep(4)}
          onFinish={() => setStep(6)}
          showScheduleOnly
        />
      )}

      {step === 6 && createdAuctionId && (
        <AuctionStep6Invitations
          auctionId={createdAuctionId}
          onBack={() => setStep(5)}
          onFinish={() => router.push('/admin/auctions')}
        />
      )}
    </div>
  );
}

'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Loader2, Plus, Trash2 } from 'lucide-react';
import { auctionsApi, PolicyEvaluationMap, PolicyItemRQ } from '@repo/api';
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle } from '@repo/ui';
import { DismissibleError, SelectOption } from './AuctionShared';
import {
  POLICY_DEFAULTS,
  POLICY_CATEGORY_DESCRIPTIONS,
  PRICE_CHANGE_TYPE_OPTIONS,
  categoryForPolicyType,
  buildEvaluationsByPolicy,
} from './PolicyShared';
import {
  mapSavedPolicies,
  buildPreconditionItem,
  buildPriceProgressionWrapper,
  buildParticipationItem,
  buildExtensionItem,
  buildWinnerDeterminationItem,
  buildWinnerPriceDeterminationItem,
  validatePolicyNames,
} from './AuctionStep3PolicyMapping';
import { PolicyParticipationSection } from './PolicyParticipationSection';
import { PolicyPreconditionsSection, PreconditionFields } from './PolicyPreconditionsSection';
import { PolicyPriceProgressionSection } from './PolicyPriceProgressionSection';
import { PolicyExtensionSection } from './PolicyExtensionSection';
import { PolicyWinnerSection } from './PolicyWinnerSection';
import { EvaluationList, PolicyItemCard } from './PolicyEvaluationDisplay';
import { parseApiError } from '@/lib/api-errors';
import ConfirmDialog from '@/components/common/admin/ConfirmDialog';

// Re-export types so pages can import from a single location
export type { PreconditionItem, PriceChangeItem, Step3State } from './AuctionStep3Types';
export { initialStep3 } from './AuctionStep3Types';

import { initialStep3, type Step3State } from './AuctionStep3Types';

/**
 * Edit-mode variant: only seeds form defaults for policy categories that already
 * have a saved policy in the API response. Categories with no saved policy show
 * "Add" dashed buttons instead of pre-filled editable forms.
 */
function seedMandatoryForSaved(
  current: Step3State,
  policyTypes: SelectOption[],
  savedPolicies: PolicyItemRQ[],
): Partial<Step3State> {
  // Collect which categories are represented in saved policies
  const savedCategories = new Set(savedPolicies.map((p) => categoryForPolicyType(p.type)));
  // Only seed categories that exist in saved data
  const filteredTypes = policyTypes.filter((t) =>
    savedCategories.has(categoryForPolicyType(t.value)),
  );
  return seedMandatoryDefaults(current, filteredTypes);
}

/** For mandatory categories: seed one empty item if the category is available but form is empty */
function seedMandatoryDefaults(
  current: Step3State,
  policyTypes: SelectOption[],
): Partial<Step3State> {
  const patch: Partial<Step3State> = {};
  const hasCategory = (category: string) =>
    policyTypes.some((t) => categoryForPolicyType(t.value) === category);
  const firstOption = (category: string): string =>
    policyTypes.find((t) => categoryForPolicyType(t.value) === category)?.value ?? '';

  // Participation — auto-enable
  if (hasCategory('PARTICIPATION') && !current.participationEnabled) {
    const defaults = POLICY_DEFAULTS['PARTICIPATION_POLICY'];
    patch.participationEnabled = true;
    patch.participationName = defaults?.name ?? '';
    patch.participationDescription = defaults?.description ?? '';
    patch.participationValidationHours = '0';
    patch.participationValidationMinutes = '0';
  }

  // Price Progression — mandatory
  if (hasCategory('PRICE_PROGRESSION') && current.policies.length === 0) {
    const firstType = PRICE_CHANGE_TYPE_OPTIONS[0]?.value ?? '';
    const defaults = firstType ? POLICY_DEFAULTS[firstType] : undefined;
    patch.policies = [
      {
        type: firstType,
        name: defaults?.name ?? '',
        description: defaults?.description ?? '',
        windowHours: '0',
        windowMinutes: '0',
        steps: [],
        value: '',
      },
    ];
  }

  // Extension — display one by default
  if (hasCategory('EXTENSION') && !current.extensionEnabled) {
    const firstType = firstOption('EXTENSION');
    const defaults = firstType ? POLICY_DEFAULTS[firstType] : undefined;
    patch.extensionEnabled = true;
    patch.extensionType = firstType;
    patch.extensionName = defaults?.name ?? '';
    patch.extensionDescription = defaults?.description ?? '';
  }

  // Winner Determination — mandatory
  if (hasCategory('WINNER_DETERMINATION') && !current.winnerDeterminationType) {
    const firstType = firstOption('WINNER_DETERMINATION');
    const defaults = firstType ? POLICY_DEFAULTS[firstType] : undefined;
    patch.winnerDeterminationType = firstType;
    patch.winnerDeterminationName = defaults?.name ?? '';
    patch.winnerDeterminationDescription = defaults?.description ?? '';
  }

  // Winner Price Determination — mandatory
  if (hasCategory('WINNER_PRICE_DETERMINATION') && !current.winnerPriceDeterminationType) {
    const firstType = firstOption('WINNER_PRICE_DETERMINATION');
    const defaults = firstType ? POLICY_DEFAULTS[firstType] : undefined;
    patch.winnerPriceDeterminationType = firstType;
    patch.winnerPriceDeterminationName = defaults?.name ?? '';
    patch.winnerPriceDeterminationDescription = defaults?.description ?? '';
  }

  return patch;
}

// ── Review-before-save — evaluates every policy in one shot when Save is clicked ──

interface ReviewItem {
  label: string;
  evaluations: PolicyEvaluationMap | null;
}

interface ReviewData {
  preconditions: ReviewItem[];
  priceProgression?: PolicyEvaluationMap;
  participation?: PolicyEvaluationMap;
  extension?: PolicyEvaluationMap;
  winnerDetermination?: PolicyEvaluationMap;
  winnerPriceDetermination?: PolicyEvaluationMap;
}

const EMPTY_REVIEW: ReviewData = { preconditions: [] };

function ReviewSection({
  title,
  evaluations,
}: {
  title: string;
  evaluations: PolicyEvaluationMap;
}) {
  const entries = Object.entries(evaluations).filter(([, e]) => e != null);
  return (
    <div className="rounded-lg border border-border/60 bg-muted/10 p-3 space-y-2">
      <h4 className="text-xs font-semibold text-foreground">{title}</h4>
      <EvaluationList
        evaluations={evaluations}
        policyName={entries.length === 1 ? (entries[0]?.[0] ?? title) : title}
      />
    </div>
  );
}

// ── Inline save/cancel bar for editing a single already-saved policy ───────────

function SaveCancelBar({
  saving,
  error,
  onSave,
  onCancel,
}: {
  saving: boolean;
  error: string | null;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="space-y-2">
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button type="button" size="sm" onClick={onSave} disabled={saving} className="gap-2">
          {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Save
        </Button>
      </div>
    </div>
  );
}

interface AuctionStep3PoliciesProps {
  auctionId?: string;
  /** True when editing an existing auction — changes button labels and "Add" fallbacks */
  isEditMode?: boolean;
  form: Step3State;
  onChange: (updates: Partial<Step3State>) => void;
  auctionType: string;
  direction: string;
  fieldErrors: Record<string, string>;
  generalError: string | null;
  saving: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onBack: () => void;
  onSkip?: () => void;
}

export function AuctionStep3Policies({
  auctionId,
  isEditMode = false,
  form,
  onChange,
  auctionType,
  direction,
  fieldErrors,
  generalError,
  saving,
  onSubmit,
  onBack,
  onSkip,
}: AuctionStep3PoliciesProps) {
  const [policyTypes, setPolicyTypes] = useState<SelectOption[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(true);
  // Track whether we've already seeded defaults so we only do it once
  const seededRef = useRef(false);

  // Evaluate-only view for already-saved policies — keyed by policy id.
  const [evaluationsByPolicyId, setEvaluationsByPolicyId] = useState<
    Record<string, PolicyEvaluationMap>
  >({});
  // Which saved policy (by a stable key, e.g. 'participation' or `payment-2`) is
  // currently showing its editable form instead of the read-only evaluate card.
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [savingItem, setSavingItem] = useState(false);
  const [itemError, setItemError] = useState<string | null>(null);
  const [deleteAllOpen, setDeleteAllOpen] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);
  const [deleteAllError, setDeleteAllError] = useState<string | null>(null);

  const savedPolicyCount = [
    form.participationPolicyId,
    form.priceProgressionPolicyId,
    form.extensionPolicyId,
    form.winnerDeterminationPolicyId,
    form.winnerPriceDeterminationPolicyId,
    ...form.preconditions.map((item) => item.id),
  ].filter(Boolean).length;

  const handleDeleteAllPolicies = async () => {
    if (!auctionId) return;
    setDeletingAll(true);
    setDeleteAllError(null);
    try {
      await auctionsApi.deleteAuctionPolicies(auctionId);
      onChange({ ...initialStep3 });
      setEvaluationsByPolicyId({});
      setEditingKey(null);
      setDeleteAllOpen(false);
    } catch (err) {
      setDeleteAllError(parseApiError(err).general ?? 'Failed to delete all policies.');
    } finally {
      setDeletingAll(false);
    }
  };

  /** Saves a single already-saved policy, refreshes its evaluation, and exits edit mode. */
  const runSave = async (policyId: string | undefined, item: PolicyItemRQ | null) => {
    if (!auctionId || !policyId || !item) return;
    if (Object.keys(validatePolicyNames(form)).length > 0) {
      setItemError('Policy name must be unique across all policies.');
      return;
    }
    setSavingItem(true);
    setItemError(null);
    try {
      await auctionsApi.updateAuctionPolicy(auctionId, policyId, item);
      const evals = await auctionsApi.evaluateAuctionPolicy(auctionId, policyId).catch(() => null);
      if (evals) setEvaluationsByPolicyId((m) => ({ ...m, [policyId]: evals }));
      setEditingKey(null);
    } catch (err) {
      setItemError(parseApiError(err).general ?? 'Failed to save policy.');
    } finally {
      setSavingItem(false);
    }
  };

  const cancelEdit = () => {
    setEditingKey(null);
    setItemError(null);
  };

  /** Saves Winner Determination + Winner Price Determination together — they're
   *  edited as one form (PolicyWinnerSection) even though each is its own saved policy. */
  const saveWinnerBoth = async () => {
    if (!auctionId) return;
    if (Object.keys(validatePolicyNames(form)).length > 0) {
      setItemError('Policy name must be unique across all policies.');
      return;
    }
    setSavingItem(true);
    setItemError(null);
    try {
      if (form.winnerDeterminationPolicyId) {
        const item = buildWinnerDeterminationItem(form);
        if (item) {
          await auctionsApi.updateAuctionPolicy(auctionId, form.winnerDeterminationPolicyId, item);
          const evals = await auctionsApi
            .evaluateAuctionPolicy(auctionId, form.winnerDeterminationPolicyId)
            .catch(() => null);
          if (evals) {
            setEvaluationsByPolicyId((m) => ({ ...m, [form.winnerDeterminationPolicyId!]: evals }));
          }
        }
      }
      if (form.winnerPriceDeterminationPolicyId) {
        const item = buildWinnerPriceDeterminationItem(form);
        if (item) {
          await auctionsApi.updateAuctionPolicy(
            auctionId,
            form.winnerPriceDeterminationPolicyId,
            item,
          );
          const evals = await auctionsApi
            .evaluateAuctionPolicy(auctionId, form.winnerPriceDeterminationPolicyId)
            .catch(() => null);
          if (evals) {
            setEvaluationsByPolicyId((m) => ({
              ...m,
              [form.winnerPriceDeterminationPolicyId!]: evals,
            }));
          }
        }
      }
      setEditingKey(null);
    } catch (err) {
      setItemError(parseApiError(err).general ?? 'Failed to save policy.');
    } finally {
      setSavingItem(false);
    }
  };

  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewData, setReviewData] = useState<ReviewData>(EMPTY_REVIEW);

  const runReview = async () => {
    if (!auctionId) {
      onSubmit({ preventDefault: () => {} } as React.FormEvent);
      return;
    }

    setReviewOpen(true);
    setReviewLoading(true);
    setReviewData(EMPTY_REVIEW);

    const preview = (item: ReturnType<typeof buildExtensionItem>) =>
      item
        ? auctionsApi.previewAuctionPolicy(auctionId, item).catch(() => null)
        : Promise.resolve(null);

    const preconditionTasks = form.preconditions.map((p, i) => ({
      label: p.name || `Precondition ${i + 1}`,
      item: buildPreconditionItem(p, i + 1),
    }));

    const [
      preconditionResults,
      priceResult,
      participationResult,
      extensionResult,
      winnerDetResult,
      winnerPriceResult,
    ] = await Promise.all([
      Promise.all(
        preconditionTasks.map(async (t) => ({
          label: t.label,
          evaluations: await preview(t.item),
        })),
      ),
      preview(buildPriceProgressionWrapper(form.policies)),
      preview(buildParticipationItem(form)),
      preview(buildExtensionItem(form)),
      preview(buildWinnerDeterminationItem(form)),
      preview(buildWinnerPriceDeterminationItem(form)),
    ]);

    setReviewData({
      preconditions: preconditionResults.filter((r) => r.evaluations),
      priceProgression: priceResult ?? undefined,
      participation: participationResult ?? undefined,
      extension: extensionResult ?? undefined,
      winnerDetermination: winnerDetResult ?? undefined,
      winnerPriceDetermination: winnerPriceResult ?? undefined,
    });
    setReviewLoading(false);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In edit mode, skip only when the parent confirmed there are no changes.
    if (onSkip) {
      onSkip();
      return;
    }
    runReview();
  };

  const confirmAndSubmit = () => {
    setReviewOpen(false);
    // No pending changes — just move on, nothing needs to be (re-)saved.
    if (onSkip) {
      onSkip();
      return;
    }
    onSubmit({ preventDefault: () => {} } as React.FormEvent);
  };

  const reviewHasContent =
    reviewData.preconditions.length > 0 ||
    !!reviewData.priceProgression ||
    !!reviewData.participation ||
    !!reviewData.extension ||
    !!reviewData.winnerDetermination ||
    !!reviewData.winnerPriceDetermination;

  useEffect(() => {
    if (!auctionType) return;
    seededRef.current = false;

    Promise.all([
      auctionsApi.getPolicyTypes(auctionType),
      auctionId
        ? auctionsApi.getAuctionPolicies(auctionId).catch(() => null)
        : Promise.resolve(null),
    ])
      .then(([fetchedTypes, savedPolicies]) => {
        setPolicyTypes(fetchedTypes);

        if (seededRef.current) return;
        seededRef.current = true;

        let patch: Partial<Step3State> = {};
        console.log('Restored saved policies from API:', savedPolicies);

        if (savedPolicies && savedPolicies.length > 0) {
          patch = mapSavedPolicies(savedPolicies);

          // Evaluate every saved policy by id, so the read-only card view can
          // show real results instead of raw fields.
          const policyIds = Array.from(
            new Set(savedPolicies.map((p) => p.id).filter((id): id is string => Boolean(id))),
          );
          if (auctionId && policyIds.length > 0) {
            auctionsApi
              .evaluateAuctionPolicies(auctionId, policyIds)
              .then((evaluations) =>
                setEvaluationsByPolicyId(buildEvaluationsByPolicy(evaluations, savedPolicies)),
              )
              .catch(() => setEvaluationsByPolicyId({}));
          }
        }

        // Then seed any mandatory categories that are still empty after restore.
        // In edit mode: don't auto-seed form fields for categories that have no
        // saved policy — show "Add" buttons instead so the user creates them explicitly.
        const merged: Step3State = { ...form, ...patch };
        const mandatoryPatch = isEditMode
          ? seedMandatoryForSaved(merged, fetchedTypes, savedPolicies ?? [])
          : seedMandatoryDefaults(merged, fetchedTypes);
        onChange({ ...patch, ...mandatoryPatch });
      })
      .catch(() => setPolicyTypes([]))
      .finally(() => setLoadingGroups(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auctionType, auctionId]);

  const getGroupOptions = (category: string): SelectOption[] =>
    policyTypes.filter((t) => categoryForPolicyType(t.value) === category);

  const getGroupDescription = (category: string): string =>
    POLICY_CATEGORY_DESCRIPTIONS[category] ?? '';

  const hasGroup = (category: string) =>
    policyTypes.some((t) => categoryForPolicyType(t.value) === category);

  const hasExtension = hasGroup('EXTENSION');

  const setField = (field: string, value: string) =>
    onChange({ [field]: value } as Partial<Step3State>);

  if (loadingGroups) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm">Loading policy options...</span>
      </div>
    );
  }

  // Derive category order from the API response (policyTypes preserves API order).
  // De-duplicate while preserving first-seen order.
  const orderedCategories: string[] = [];
  for (const t of policyTypes) {
    const cat = categoryForPolicyType(t.value);
    if (!orderedCategories.includes(cat)) orderedCategories.push(cat);
  }
  // WINNER_DETERMINATION and WINNER_PRICE_DETERMINATION are rendered as one combined
  // section, so collapse them to a single sentinel when both are present.
  const renderCategories = orderedCategories.reduce<string[]>((acc, cat) => {
    if (cat === 'WINNER_PRICE_DETERMINATION') {
      if (!acc.includes('WINNER')) acc.push('WINNER');
    } else if (cat === 'WINNER_DETERMINATION') {
      if (!acc.includes('WINNER')) acc.push('WINNER');
    } else {
      acc.push(cat);
    }
    return acc;
  }, []);

  return (
    <>
      <form onSubmit={handleFormSubmit} className="space-y-6">
        <DismissibleError message={generalError} />
        {isEditMode && auctionId && savedPolicyCount > 0 && (
          <div className="flex justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDeleteAllOpen(true)}
              className="gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete all policies
            </Button>
          </div>
        )}

        {/* Sections rendered in the order the API returns policy types */}
        {renderCategories.map((category) => {
          if (category === 'PARTICIPATION') {
            if (!hasGroup('PARTICIPATION')) return null;
            return (
              <div key="PARTICIPATION">
                {form.participationPolicyId && editingKey !== 'participation' ? (
                  <div className="rounded-xl border border-violet-200 dark:border-violet-900/50 bg-violet-50/30 dark:bg-violet-950/10 p-1">
                    <PolicyItemCard
                      auctionId={auctionId!}
                      policyId={form.participationPolicyId}
                      name={form.participationName || 'Participation Policy'}
                      type="PARTICIPATION_POLICY"
                      evaluations={evaluationsByPolicyId[form.participationPolicyId]}
                      editable
                      onEdit={() => setEditingKey('participation')}
                      deletable
                      onDeleted={() =>
                        onChange({
                          participationEnabled: false,
                          participationPolicyId: undefined,
                          participationName: '',
                          participationDescription: '',
                          participationTypeId: '',
                          participationManualApproval: false,
                        })
                      }
                    />
                  </div>
                ) : isEditMode && !form.participationEnabled && !editingKey ? (
                  <div className="rounded-xl border border-dashed border-violet-300 dark:border-violet-800 bg-violet-50/20 dark:bg-violet-950/10 p-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">Participation</p>
                      <p className="text-xs text-muted-foreground">
                        No participation policy created yet.
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="shrink-0"
                      onClick={() => {
                        const defaults = POLICY_DEFAULTS['PARTICIPATION_POLICY'];
                        onChange({
                          participationEnabled: true,
                          participationName: defaults?.name ?? '',
                          participationDescription: defaults?.description ?? '',
                        });
                      }}
                    >
                      Add
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <PolicyParticipationSection
                      name={form.participationName}
                      description={form.participationDescription}
                      onNameChange={(v) => onChange({ participationName: v })}
                      onDescriptionChange={(v) => onChange({ participationDescription: v })}
                      typeId={form.participationTypeId}
                      onTypeIdChange={(v) => onChange({ participationTypeId: v })}
                      manualApproval={form.participationManualApproval}
                      onManualApprovalToggle={(v) => onChange({ participationManualApproval: v })}
                      validationHours={form.participationValidationHours}
                      onValidationHoursChange={(v) => onChange({ participationValidationHours: v })}
                      validationMinutes={form.participationValidationMinutes}
                      onValidationMinutesChange={(v) =>
                        onChange({ participationValidationMinutes: v })
                      }
                      groupDescription={getGroupDescription('PARTICIPATION')}
                      nameError={fieldErrors['participationName']}
                    />
                    {editingKey === 'participation' && (
                      <SaveCancelBar
                        saving={savingItem}
                        error={itemError}
                        onSave={() =>
                          runSave(form.participationPolicyId, buildParticipationItem(form))
                        }
                        onCancel={cancelEdit}
                      />
                    )}
                  </div>
                )}
              </div>
            );
          }

          if (category === 'PRECONDITION') {
            if (!hasGroup('PRECONDITION') && getGroupOptions('PRECONDITION').length === 0)
              return null;
            const savedItems = form.preconditions.map((p, i) => ({ p, i })).filter(({ p }) => p.id);
            const usedTypes = form.preconditions.map((p) => p.type).filter(Boolean);
            const opts = getGroupOptions('PRECONDITION');
            const canAddMore = usedTypes.length < opts.length;
            const allSaved = form.preconditions.length > 0 && form.preconditions.every((p) => p.id);

            const addDraft = () => {
              const first = opts.find((opt) => !usedTypes.includes(opt.value)) ?? opts[0];
              const defaults = first ? POLICY_DEFAULTS[first.value] : undefined;
              onChange({
                preconditions: [
                  ...form.preconditions,
                  {
                    type: first?.value ?? '',
                    name: defaults?.name ?? '',
                    description: defaults?.description ?? '',
                    count: '',
                    validationDays: '',
                    validationHours: '0',
                  },
                ],
              });
            };

            // Edit mode: no precondition was ever created — offer an explicit Add button
            if (isEditMode && form.preconditions.length === 0) {
              return (
                <div
                  key="PRECONDITION"
                  className="rounded-xl border border-dashed border-sky-300 dark:border-sky-800 bg-sky-50/20 dark:bg-sky-950/10 p-4 flex items-center justify-between"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">Preconditions</p>
                    <p className="text-xs text-muted-foreground">No preconditions created yet.</p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="shrink-0"
                    onClick={addDraft}
                  >
                    Add
                  </Button>
                </div>
              );
            }

            return (
              <div key="PRECONDITION" className="space-y-3">
                {savedItems.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-foreground">Preconditions</h3>
                    {savedItems.map(({ p, i }) =>
                      editingKey === `precondition-${i}` ? (
                        <div
                          key={p.id}
                          className="rounded-lg border border-border bg-card p-4 space-y-3"
                        >
                          <PreconditionFields
                            index={i}
                            precondition={p}
                            onChange={(patch) =>
                              onChange({
                                preconditions: form.preconditions.map((pp, idx) =>
                                  idx === i ? { ...pp, ...patch } : pp,
                                ),
                              })
                            }
                            options={getGroupOptions('PRECONDITION')}
                            usedTypes={usedTypes}
                            fieldErrors={fieldErrors}
                          />
                          <SaveCancelBar
                            saving={savingItem}
                            error={itemError}
                            onSave={() => runSave(p.id, buildPreconditionItem(p, i + 1))}
                            onCancel={cancelEdit}
                          />
                        </div>
                      ) : (
                        <PolicyItemCard
                          key={p.id}
                          auctionId={auctionId!}
                          policyId={p.id}
                          name={p.name || 'Precondition'}
                          type={p.type}
                          evaluations={p.id ? evaluationsByPolicyId[p.id] : undefined}
                          editable
                          onEdit={() => setEditingKey(`precondition-${i}`)}
                          deletable
                          onDeleted={() =>
                            onChange({
                              preconditions: form.preconditions.filter((_, idx) => idx !== i),
                            })
                          }
                        />
                      ),
                    )}
                  </div>
                )}
                {/*
                 * When every precondition is already saved, the full editor below would
                 * render an empty draft list ("No preconditions") right under the saved
                 * cards — show a lightweight Add affordance instead.
                 */}
                {allSaved ? (
                  canAddMore && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="gap-1"
                      onClick={addDraft}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add precondition
                    </Button>
                  )
                ) : (
                  <PolicyPreconditionsSection
                    preconditions={form.preconditions}
                    onChange={(v) => onChange({ preconditions: v })}
                    options={getGroupOptions('PRECONDITION')}
                    fieldErrors={fieldErrors}
                    groupDescription={getGroupDescription('PRECONDITION')}
                  />
                )}
              </div>
            );
          }

          if (category === 'PRICE_PROGRESSION') {
            if (!hasGroup('PRICE_PROGRESSION')) return null;
            return (
              <div key="PRICE_PROGRESSION">
                {form.priceProgressionPolicyId && editingKey !== 'priceProgression' ? (
                  <div className="rounded-xl border border-blue-200 dark:border-blue-900/50 bg-blue-50/30 dark:bg-blue-950/10 p-1">
                    <PolicyItemCard
                      auctionId={auctionId!}
                      policyId={form.priceProgressionPolicyId}
                      name="Price Progression"
                      type="PRICE_PROGRESSION_POLICY"
                      evaluations={evaluationsByPolicyId[form.priceProgressionPolicyId]}
                      editable
                      onEdit={() => setEditingKey('priceProgression')}
                      deletable
                      onDeleted={() =>
                        onChange({ priceProgressionPolicyId: undefined, policies: [] })
                      }
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <PolicyPriceProgressionSection
                      policies={form.policies}
                      onPoliciesChange={(v) => onChange({ policies: v })}
                      options={PRICE_CHANGE_TYPE_OPTIONS}
                      fieldErrors={fieldErrors}
                      groupDescription={getGroupDescription('PRICE_PROGRESSION')}
                      onAddSubPolicy={
                        form.priceProgressionPolicyId && auctionId
                          ? async (item) => {
                              const subItem = buildPriceProgressionWrapper([item]);
                              if (!subItem?.policies?.[0]) return;
                              await auctionsApi.addSubPolicy(
                                auctionId,
                                form.priceProgressionPolicyId!,
                                subItem.policies[0],
                              );
                              const saved = await auctionsApi.getAuctionPolicies(auctionId);
                              const patch = mapSavedPolicies(saved);
                              onChange({ policies: patch.policies ?? form.policies });
                            }
                          : undefined
                      }
                      onDeleteSubPolicy={
                        form.priceProgressionPolicyId && auctionId
                          ? async (index) => {
                              const subId = form.policies[index]?.id;
                              if (!subId) {
                                onChange({
                                  policies: form.policies.filter((_, i) => i !== index),
                                });
                                return;
                              }
                              await auctionsApi.deleteSubPolicy(
                                auctionId,
                                form.priceProgressionPolicyId!,
                                subId,
                              );
                              onChange({ policies: form.policies.filter((_, i) => i !== index) });
                            }
                          : undefined
                      }
                    />
                    {editingKey === 'priceProgression' && (
                      <SaveCancelBar
                        saving={savingItem}
                        error={itemError}
                        onSave={() =>
                          runSave(
                            form.priceProgressionPolicyId,
                            buildPriceProgressionWrapper(form.policies),
                          )
                        }
                        onCancel={cancelEdit}
                      />
                    )}
                  </div>
                )}
              </div>
            );
          }

          if (category === 'EXTENSION') {
            if (!hasExtension) return null;
            return (
              <div key="EXTENSION">
                {form.extensionPolicyId && editingKey !== 'extension' ? (
                  <div className="rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/30 dark:bg-amber-950/10 p-1">
                    <PolicyItemCard
                      auctionId={auctionId!}
                      policyId={form.extensionPolicyId}
                      name={form.extensionName || 'Extension Policy'}
                      type={form.extensionType}
                      evaluations={evaluationsByPolicyId[form.extensionPolicyId]}
                      editable
                      onEdit={() => setEditingKey('extension')}
                      deletable
                      onDeleted={() =>
                        onChange({
                          extensionEnabled: false,
                          extensionPolicyId: undefined,
                          extensionType: '',
                          extensionName: '',
                          extensionDescription: '',
                        })
                      }
                    />
                  </div>
                ) : isEditMode &&
                  !form.extensionEnabled &&
                  !form.extensionPolicyId &&
                  !editingKey ? (
                  <div className="rounded-xl border border-dashed border-amber-300 dark:border-amber-800 bg-amber-50/20 dark:bg-amber-950/10 p-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">Extension</p>
                      <p className="text-xs text-muted-foreground">
                        No extension policy created yet.
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="shrink-0"
                      onClick={() => {
                        const opts = getGroupOptions('EXTENSION');
                        const first = opts[0];
                        const defaults = first ? POLICY_DEFAULTS[first.value] : undefined;
                        onChange({
                          extensionEnabled: true,
                          extensionType: first?.value ?? '',
                          extensionName: defaults?.name ?? '',
                          extensionDescription: defaults?.description ?? '',
                        });
                      }}
                    >
                      Add
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <PolicyExtensionSection
                      extensionEnabled={form.extensionEnabled}
                      extensionType={form.extensionType}
                      extensionName={form.extensionName}
                      extensionDescription={form.extensionDescription}
                      extensionReference={form.extensionReference}
                      extensionDurationMinutes={form.extensionDurationMinutes}
                      extensionLimit={form.extensionLimit}
                      onAdd={() => {
                        const opts = getGroupOptions('EXTENSION');
                        const first = opts[0];
                        const defaults = first ? POLICY_DEFAULTS[first.value] : undefined;
                        onChange({
                          extensionEnabled: true,
                          extensionType: first?.value ?? '',
                          extensionName: defaults?.name ?? '',
                          extensionDescription: defaults?.description ?? '',
                        });
                      }}
                      onRemove={() =>
                        onChange({
                          extensionEnabled: false,
                          extensionType: '',
                          extensionName: '',
                          extensionDescription: '',
                        })
                      }
                      onFieldChange={setField}
                      options={getGroupOptions('EXTENSION')}
                      fieldErrors={fieldErrors}
                      groupDescription={getGroupDescription('EXTENSION')}
                    />
                    {editingKey === 'extension' && (
                      <SaveCancelBar
                        saving={savingItem}
                        error={itemError}
                        onSave={() => runSave(form.extensionPolicyId, buildExtensionItem(form))}
                        onCancel={cancelEdit}
                      />
                    )}
                  </div>
                )}
              </div>
            );
          }

          if (category === 'WINNER') {
            if (!hasGroup('WINNER_DETERMINATION') && !hasGroup('WINNER_PRICE_DETERMINATION'))
              return null;
            const winnerFullySaved =
              (!hasGroup('WINNER_DETERMINATION') || Boolean(form.winnerDeterminationPolicyId)) &&
              (!hasGroup('WINNER_PRICE_DETERMINATION') ||
                Boolean(form.winnerPriceDeterminationPolicyId));

            if (winnerFullySaved && editingKey !== 'winner') {
              return (
                <div
                  key="WINNER"
                  className="space-y-3 rounded-xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/30 dark:bg-emerald-950/10 p-1"
                >
                  {form.winnerDeterminationPolicyId && (
                    <PolicyItemCard
                      auctionId={auctionId!}
                      policyId={form.winnerDeterminationPolicyId}
                      name={form.winnerDeterminationName || 'Winner Determination'}
                      type={form.winnerDeterminationType}
                      evaluations={evaluationsByPolicyId[form.winnerDeterminationPolicyId]}
                      editable
                      onEdit={() => setEditingKey('winner')}
                      deletable
                      onDeleted={() =>
                        onChange({
                          winnerDeterminationPolicyId: undefined,
                          winnerDeterminationType: '',
                          winnerDeterminationName: '',
                          winnerDeterminationDescription: '',
                          winnerDeterminationKth: '1',
                        })
                      }
                    />
                  )}
                  {form.winnerPriceDeterminationPolicyId && (
                    <PolicyItemCard
                      auctionId={auctionId!}
                      policyId={form.winnerPriceDeterminationPolicyId}
                      name={form.winnerPriceDeterminationName || 'Winner Price Determination'}
                      type={form.winnerPriceDeterminationType}
                      evaluations={evaluationsByPolicyId[form.winnerPriceDeterminationPolicyId]}
                      editable
                      onEdit={() => setEditingKey('winner')}
                      deletable
                      onDeleted={() =>
                        onChange({
                          winnerPriceDeterminationPolicyId: undefined,
                          winnerPriceDeterminationType: '',
                          winnerPriceDeterminationName: '',
                          winnerPriceDeterminationDescription: '',
                          winnerPriceDeterminationKth: '1',
                        })
                      }
                    />
                  )}
                </div>
              );
            }

            const neitherCreated =
              isEditMode &&
              !form.winnerDeterminationPolicyId &&
              !form.winnerPriceDeterminationPolicyId &&
              !form.winnerDeterminationType &&
              !form.winnerPriceDeterminationType &&
              !editingKey;

            if (neitherCreated) {
              return (
                <div
                  key="WINNER"
                  className="rounded-xl border border-dashed border-emerald-300 dark:border-emerald-800 bg-emerald-50/20 dark:bg-emerald-950/10 p-4 flex items-center justify-between"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      Winner &amp; Price Determination
                    </p>
                    <p className="text-xs text-muted-foreground">No winner policies created yet.</p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="shrink-0"
                    onClick={() => {
                      const wOpts = getGroupOptions('WINNER_DETERMINATION');
                      const wFirst = wOpts[0];
                      const wDefaults = wFirst ? POLICY_DEFAULTS[wFirst.value] : undefined;
                      const wpOpts = getGroupOptions('WINNER_PRICE_DETERMINATION');
                      const wpFirst = wpOpts[0];
                      const wpDefaults = wpFirst ? POLICY_DEFAULTS[wpFirst.value] : undefined;
                      onChange({
                        winnerDeterminationType: wFirst?.value ?? '',
                        winnerDeterminationName: wDefaults?.name ?? '',
                        winnerDeterminationDescription: wDefaults?.description ?? '',
                        winnerPriceDeterminationType: wpFirst?.value ?? '',
                        winnerPriceDeterminationName: wpDefaults?.name ?? '',
                        winnerPriceDeterminationDescription: wpDefaults?.description ?? '',
                      });
                    }}
                  >
                    Add
                  </Button>
                </div>
              );
            }

            return (
              <div key="WINNER" className="space-y-2">
                <PolicyWinnerSection
                  direction={direction}
                  winnerDeterminationType={form.winnerDeterminationType}
                  winnerDeterminationKth={form.winnerDeterminationKth}
                  winnerDeterminationName={form.winnerDeterminationName}
                  winnerDeterminationDescription={form.winnerDeterminationDescription}
                  winnerPriceDeterminationType={form.winnerPriceDeterminationType}
                  winnerPriceDeterminationKth={form.winnerPriceDeterminationKth}
                  winnerPriceDeterminationName={form.winnerPriceDeterminationName}
                  winnerPriceDeterminationDescription={form.winnerPriceDeterminationDescription}
                  onFieldChange={setField}
                  onWinnerAdd={() => {
                    const opts = getGroupOptions('WINNER_DETERMINATION');
                    const first = opts[0];
                    const defaults = first ? POLICY_DEFAULTS[first.value] : undefined;
                    onChange({
                      winnerDeterminationType: first?.value ?? '',
                      winnerDeterminationName: defaults?.name ?? '',
                      winnerDeterminationDescription: defaults?.description ?? '',
                    });
                  }}
                  onWinnerRemove={() =>
                    onChange({
                      winnerDeterminationType: '',
                      winnerDeterminationName: '',
                      winnerDeterminationDescription: '',
                      winnerDeterminationKth: '1',
                    })
                  }
                  onWinnerPriceAdd={() => {
                    const opts = getGroupOptions('WINNER_PRICE_DETERMINATION');
                    const first = opts[0];
                    const defaults = first ? POLICY_DEFAULTS[first.value] : undefined;
                    onChange({
                      winnerPriceDeterminationType: first?.value ?? '',
                      winnerPriceDeterminationName: defaults?.name ?? '',
                      winnerPriceDeterminationDescription: defaults?.description ?? '',
                    });
                  }}
                  onWinnerPriceRemove={() =>
                    onChange({
                      winnerPriceDeterminationType: '',
                      winnerPriceDeterminationName: '',
                      winnerPriceDeterminationDescription: '',
                      winnerPriceDeterminationKth: '1',
                    })
                  }
                  winnerDeterminationOptions={getGroupOptions('WINNER_DETERMINATION')}
                  winnerPriceOptions={getGroupOptions('WINNER_PRICE_DETERMINATION')}
                  fieldErrors={fieldErrors}
                  winnerGroupInfo={getGroupDescription('WINNER_DETERMINATION')}
                  winnerPriceGroupInfo={getGroupDescription('WINNER_PRICE_DETERMINATION')}
                />
                {editingKey === 'winner' && (
                  <SaveCancelBar
                    saving={savingItem}
                    error={itemError}
                    onSave={saveWinnerBoth}
                    onCancel={cancelEdit}
                  />
                )}
              </div>
            );
          }

          return null;
        })}

        <div className="flex justify-between gap-3">
          <Button type="button" variant="outline" onClick={onBack} disabled={saving}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <Button type="submit" disabled={saving} className="gap-2">
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : isEditMode && onSkip ? (
              'Skip'
            ) : (
              'Preview & Continue'
            )}
          </Button>
        </div>
      </form>
      <ConfirmDialog
        open={deleteAllOpen}
        title="Delete all policies?"
        description={
          deleteAllError ??
          'This permanently removes every policy from this auction. This action cannot be undone.'
        }
        confirmLabel={deletingAll ? 'Deleting...' : 'Delete all'}
        onConfirm={handleDeleteAllPolicies}
        onCancel={() => {
          if (!deletingAll) {
            setDeleteAllOpen(false);
            setDeleteAllError(null);
          }
        }}
      />

      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Review policy evaluation</DialogTitle>
          </DialogHeader>

          {reviewLoading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm">Evaluating policies...</span>
            </div>
          ) : (
            <div className="space-y-3 py-1">
              {reviewData.participation && (
                <ReviewSection title="Participation" evaluations={reviewData.participation} />
              )}
              {reviewData.preconditions.map((p, i) => (
                <ReviewSection
                  key={`precondition-${i}`}
                  title={p.label}
                  evaluations={p.evaluations!}
                />
              ))}
              {reviewData.priceProgression && (
                <ReviewSection
                  title="Price Progression"
                  evaluations={reviewData.priceProgression}
                />
              )}
              {reviewData.extension && (
                <ReviewSection title="Extension" evaluations={reviewData.extension} />
              )}
              {reviewData.winnerDetermination && (
                <ReviewSection
                  title="Winner Determination"
                  evaluations={reviewData.winnerDetermination}
                />
              )}
              {reviewData.winnerPriceDetermination && (
                <ReviewSection
                  title="Winner Price Determination"
                  evaluations={reviewData.winnerPriceDetermination}
                />
              )}
              {!reviewHasContent && (
                <p className="text-sm text-muted-foreground text-center py-6">
                  No policy evaluations available.
                </p>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={() => setReviewOpen(false)}
              disabled={saving}
            >
              Back to edit
            </Button>
            <Button
              type="button"
              onClick={confirmAndSubmit}
              disabled={saving || reviewLoading}
              className="gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  {isEditMode ? 'Continue' : 'Save & Continue'} <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

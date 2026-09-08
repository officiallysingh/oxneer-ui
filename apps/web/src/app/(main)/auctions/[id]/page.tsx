'use client';

import { use, useCallback, useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import {
  auctionsApi,
  participantsApi,
  type AuctionVM,
  type AuctionWorkflowStep,
  type ParticipantVM,
} from '@repo/api';
import { useAuthStore } from '@/store/authStore';
import { resolveStr, formatLabel, formatDateTime } from '@/components/common/admin/format';
import {
  Loader2,
  AlertCircle,
  Calendar,
  Clock,
  ArrowLeft,
  Gavel,
  Globe,
  Lock,
  TrendingUp,
  TrendingDown,
  IndianRupee,
  Users,
  Tag,
  CheckCircle2,
  ClipboardList,
  Settings2,
  DollarSign,
  GitFork,
} from 'lucide-react';
import { Button, Badge, Dialog, DialogContent, DialogHeader, DialogTitle, toast } from '@repo/ui';
import { WorkflowWizard } from '../_components/WorkflowWizard';
import { WorkflowStagesTimeline } from '../../../(admin)/admin/auctions/_components/timeline/WorkflowStagesTimeline';
import type { TimelineNode } from '../../../(admin)/admin/auctions/_components/timeline/types';
import {
  stepTypeMeta,
  PaymentStepDetails,
  BankDetailStepDetails,
  ParticipationFormStepDetails,
  TnCStepDetails,
  FormStepDetails,
} from '../../../(admin)/admin/auctions/_components/WorkflowStepDetails';

// ── Helpers ───────────────────────────────────────────────────────────────────

function resolveAccessibilityIcon(value?: unknown) {
  return resolveStr(value) === 'PUBLIC' ? Globe : Lock;
}

function resolveDirectionIcon(value?: unknown) {
  return resolveStr(value) === 'REVERSE' ? TrendingDown : TrendingUp;
}

function formatSchedule(startIso?: string, endIso?: string): string {
  if (!startIso) return 'Not yet scheduled';
  const start = formatDateTime(startIso);
  if (!endIso) return `Starts ${start}`;
  return `${start} — ${formatDateTime(endIso)}`;
}

function auctionIsJoinable(status?: unknown): boolean {
  const s = resolveStr(status);
  return s === 'PUBLISHED' || s === 'LIVE' || s === 'SCHEDULED';
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PublicAuctionViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useAuthStore();
  const isLoggedIn = !!user?.authenticated;

  const [auction, setAuction] = useState<AuctionVM | null>(null);
  const [workflow, setWorkflow] = useState<AuctionWorkflowStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Participant / join state
  const [participant, setParticipant] = useState<ParticipantVM | null>(null);
  const [joining, setJoining] = useState(false);
  // Did the user join in this session (vs. already a participant on load)?
  const [justJoined, setJustJoined] = useState(false);

  // Workflow wizard
  const [wizardOpen, setWizardOpen] = useState(false);

  // ── Load auction + participant status ───────────────────────────────────────
  const loadData = useCallback(async () => {
    try {
      const [auctionData, selfParticipant, workflowData] = await Promise.all([
        auctionsApi.getPublicAuctionById(id),
        isLoggedIn
          ? participantsApi.getSelfParticipant(id).catch(() => null)
          : Promise.resolve(null),
        auctionsApi.getAuctionWorkflow(id).catch(() => [] as AuctionWorkflowStep[]),
      ]);
      setAuction(auctionData);
      setParticipant(selfParticipant);
      setWorkflow(workflowData);
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 404) {
        setError('Auction not found. It may have been removed or the link is invalid.');
      } else if (status !== 401 && status !== 403) {
        setError('Failed to load auction details. Please try again later.');
      }
    } finally {
      setLoading(false);
    }
  }, [id, isLoggedIn]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Join auction ────────────────────────────────────────────────────────────
  const handleJoin = async () => {
    if (!isLoggedIn) {
      router.push(`/login?callbackUrl=/auctions/${id}`);
      return;
    }
    setJoining(true);
    try {
      await participantsApi.createSelfParticipant(id);
      // Reload participant to get their record with workflowStatus
      const selfP = await participantsApi.getSelfParticipant(id).catch(() => null);
      setParticipant(selfP);
      setJustJoined(true);
      toast?.success?.('You have joined this auction.');
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 409) {
        const selfP = await participantsApi.getSelfParticipant(id).catch(() => null);
        setParticipant(selfP);
        toast?.success?.('You are already registered for this auction.');
      } else {
        toast?.error?.('Failed to join auction. Please try again.');
      }
    } finally {
      setJoining(false);
    }
  };

  // ── Workflow helpers ────────────────────────────────────────────────────────
  const isParticipant = !!participant;

  const workflowHasSteps =
    participant?.workflowStatus !== undefined
      ? Object.keys(participant.workflowStatus).length > 0
      : false;

  // All steps completed check (all values are COMPLETED/DONE/APPROVED)
  const workflowAllDone =
    isParticipant &&
    workflowHasSteps &&
    Object.values(participant!.workflowStatus!).every((s) => {
      const t = resolveStr(s.type);
      return t === 'COMPLETED' || t === 'DONE' || t === 'APPROVED';
    });

  // Refresh participant after wizard completes
  const handleWizardClose = async () => {
    setWizardOpen(false);
    const selfP = await participantsApi.getSelfParticipant(id).catch(() => null);
    setParticipant(selfP);
  };

  // ── Guards ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-sm">Loading auction details…</p>
        </div>
      </div>
    );
  }

  if (error || !auction) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="rounded-xl border border-border bg-card p-8 text-center max-w-md">
          <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
          </div>
          <h1 className="text-xl font-semibold text-foreground mb-2">Auction Unavailable</h1>
          <p className="text-muted-foreground mb-6">
            {error ?? 'This auction could not be loaded.'}
          </p>
          <Button onClick={() => router.push('/')}>Go to Homepage</Button>
        </div>
      </div>
    );
  }

  // ── Derived values ──────────────────────────────────────────────────────────
  const status = resolveStr(auction.status);
  const accessibility = resolveStr(auction.protocol?.accessibility);
  const direction = resolveStr(auction.protocol?.direction);
  const AccessibilityIcon = resolveAccessibilityIcon(auction.protocol?.accessibility);
  const DirectionIcon = resolveDirectionIcon(auction.protocol?.direction);
  const joinable = auctionIsJoinable(auction.status);
  const currency = resolveStr(auction.monetaryOptions?.currencyUnit);

  const statusColorMap: Record<string, string> = {
    LIVE: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30',
    PUBLISHED: 'bg-blue-500/10 text-blue-600 border-blue-500/30',
    SCHEDULED: 'bg-amber-500/10 text-amber-600 border-amber-500/30',
    DRAFT: 'bg-muted text-muted-foreground border-border',
    CANCELLED: 'bg-red-500/10 text-red-600 border-red-500/30',
    COMPLETED: 'bg-violet-500/10 text-violet-600 border-violet-500/30',
  };
  const statusColor = statusColorMap[status] ?? 'bg-muted text-muted-foreground border-border';

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <>
      <div className="container  mx-auto px-4 py-10 space-y-8">
        {/* Back */}
        <button
          type="button"
          onClick={() => router.push('/')}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to auctions
        </button>

        {/* ── Header card ───────────────────────────────────────────────────── */}
        <div className="rounded-2xl border border-border bg-card p-6 md:p-8 shadow-sm space-y-6">
          {/* Status + badges */}
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${statusColor}`}
            >
              {status === 'LIVE' && (
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              )}
              {formatLabel(auction.status)}
            </span>
            {accessibility && (
              <Badge variant="outline" className="text-xs gap-1">
                <AccessibilityIcon className="h-3 w-3" />
                {formatLabel(accessibility)}
              </Badge>
            )}
            {auction.referenceId && (
              <Badge variant="outline" className="font-mono text-xs">
                {auction.referenceId}
              </Badge>
            )}
            {isParticipant && (
              <Badge
                variant="outline"
                className="text-xs gap-1 border-emerald-500/40 text-emerald-600"
              >
                <CheckCircle2 className="h-3 w-3" />
                Registered
              </Badge>
            )}
          </div>

          {/* Title + description */}
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 shrink-0">
              <Gavel className="h-6 w-6 text-primary" />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl md:text-3xl font-bold text-foreground leading-tight">
                {auction.title}
              </h1>
              {auction.description && (
                <p className="mt-2 text-muted-foreground leading-relaxed">{auction.description}</p>
              )}
            </div>
          </div>

          {/* Key details grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-2 border-t border-border/60">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-muted shrink-0">
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                  Schedule
                </p>
                <p className="text-sm font-semibold text-foreground mt-0.5">
                  {formatSchedule(auction.schedule?.startTime, auction.schedule?.endTime)}
                </p>
              </div>
            </div>

            {direction && (
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-muted shrink-0">
                  <DirectionIcon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                    Direction
                  </p>
                  <p className="text-sm font-semibold text-foreground mt-0.5">
                    {formatLabel(direction)}{' '}
                    {direction === 'FORWARD' ? 'auction' : '(reverse) auction'}
                  </p>
                </div>
              </div>
            )}

            {auction.unit?.openingPrice != null && (
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-muted shrink-0">
                  <IndianRupee className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                    Opening Price
                  </p>
                  <p className="text-sm font-semibold text-foreground mt-0.5">
                    {currency} {auction.unit.openingPrice.toLocaleString()}
                  </p>
                </div>
              </div>
            )}

            {auction.format && (
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-muted shrink-0">
                  <Tag className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                    Format
                  </p>
                  <p className="text-sm font-semibold text-foreground mt-0.5">
                    {formatLabel(auction.format)}
                  </p>
                </div>
              </div>
            )}

            {auction.protocol?.participantVisibility && (
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-muted shrink-0">
                  <Users className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                    Participants
                  </p>
                  <p className="text-sm font-semibold text-foreground mt-0.5">
                    {formatLabel(auction.protocol.participantVisibility)}
                  </p>
                </div>
              </div>
            )}

            {auction.schedule?.endTime && (
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-muted shrink-0">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                    Closes
                  </p>
                  <p className="text-sm font-semibold text-foreground mt-0.5">
                    {formatDateTime(auction.schedule.endTime)}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* ── CTA area ────────────────────────────────────────────────────── */}
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-border/60">
            {/* Already a participant */}
            {isParticipant ? (
              <div className="flex flex-wrap items-center gap-3 w-full">
                <div className="flex items-center gap-2 text-emerald-600 font-medium text-sm">
                  <CheckCircle2 className="h-5 w-5" />
                  {justJoined
                    ? "You've joined this auction"
                    : 'You are registered for this auction'}
                </div>

                {/* Complete workflow button — only shown when auction has workflow steps */}
                {joinable && (
                  <>
                    {workflowAllDone ? (
                      <div className="flex items-center gap-1.5 text-sm text-emerald-600 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20">
                        <CheckCircle2 className="h-4 w-4" />
                        All registration steps completed
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setWizardOpen(true)}
                        className="gap-2 border-primary/40 text-primary hover:bg-primary/5"
                      >
                        <ClipboardList className="h-4 w-4" />
                        Complete Registration Steps
                      </Button>
                    )}
                  </>
                )}
              </div>
            ) : joinable ? (
              /* Not a participant yet — show Join button */
              <Button
                size="lg"
                onClick={handleJoin}
                disabled={joining}
                className="gap-2 min-w-[160px]"
              >
                {joining ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Joining…
                  </>
                ) : (
                  <>
                    <Gavel className="h-4 w-4" />
                    {isLoggedIn ? 'Join Auction' : 'Sign in to join'}
                  </>
                )}
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                {status === 'COMPLETED'
                  ? 'This auction has ended.'
                  : status === 'CANCELLED'
                    ? 'This auction has been cancelled.'
                    : 'Registration is not yet open.'}
              </p>
            )}
          </div>
        </div>

        {/* ── Workflow status summary (when participant has steps) ─────────── */}
        {isParticipant &&
          participant?.workflowStatus &&
          Object.keys(participant.workflowStatus).length > 0 && (
            <WorkflowStatusCard
              workflowStatus={participant.workflowStatus}
              onOpenWizard={() => setWizardOpen(true)}
              allDone={workflowAllDone}
            />
          )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {/* ── Unit / item details ────────────────────────────────────────── */}
          {auction.unit && (
            <div className="h-full rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                  <Tag className="h-5 w-5 text-primary" />
                </div>
                <h2 className="text-base font-semibold text-foreground">Auction Item</h2>
              </div>
              <div className="space-y-3 text-sm">
                <PublicDetailRow label="Unit type">
                  {formatLabel(auction.unit.type) || '—'}
                </PublicDetailRow>
                {auction.unit.openingPrice != null && (
                  <PublicDetailRow label="Opening price">
                    {currency} {auction.unit.openingPrice.toLocaleString()}
                  </PublicDetailRow>
                )}
                {auction.unit.standingPrice != null && (
                  <PublicDetailRow label="Current price">
                    <span className="text-primary">
                      {currency} {auction.unit.standingPrice.toLocaleString()}
                    </span>
                  </PublicDetailRow>
                )}
              </div>
            </div>
          )}

          <PublicAuctionOverview auction={auction} />
        </div>
        {workflow.length > 0 && <PublicWorkflow workflow={workflow} auction={auction} />}
      </div>

      {/* ── Workflow Wizard Dialog ─────────────────────────────────────────── */}
      <Dialog open={wizardOpen} onOpenChange={(o) => !o && handleWizardClose()}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden max-h-[90vh] flex flex-col">
          <DialogHeader className="px-6 py-4 border-b border-border shrink-0">
            <DialogTitle className="flex items-center gap-2 text-base">
              <ClipboardList className="h-5 w-5 text-primary" />
              Complete Registration
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-auto">
            <WorkflowWizard auctionId={id} onClose={handleWizardClose} />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function PublicAuctionOverview({ auction }: { auction: AuctionVM }) {
  return (
    <>
      <div className="h-full rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10 shrink-0">
            <DollarSign className="h-5 w-5 text-primary" />
          </div>
          <h2 className="text-base font-semibold text-foreground">Monetary options</h2>
        </div>
        <div className="space-y-3 text-sm">
          <PublicDetailRow label="Currency unit">
            {resolveStr(auction.monetaryOptions?.currencyUnit) || '—'}
          </PublicDetailRow>
          <PublicDetailRow label="Precision">
            {auction.monetaryOptions?.precision != null
              ? `${auction.monetaryOptions.precision} decimal places`
              : '—'}
          </PublicDetailRow>
          <PublicDetailRow label="Rounding mode">
            {formatLabel(auction.monetaryOptions?.roundingMode) || '—'}
          </PublicDetailRow>
        </div>
      </div>

      <div className="h-full rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10 shrink-0">
            <Settings2 className="h-5 w-5 text-primary" />
          </div>
          <h2 className="text-base font-semibold text-foreground">Auction settings</h2>
        </div>
        <div className="space-y-3 text-sm">
          <PublicDetailRow label="Accessibility">
            {formatLabel(auction.protocol?.accessibility) || '—'}
          </PublicDetailRow>
          <PublicDetailRow label="Dimension">
            {formatLabel(auction.protocol?.dimension) || '—'}
          </PublicDetailRow>
          <PublicDetailRow label="Participant visibility">
            {formatLabel(auction.protocol?.participantVisibility) || '—'}
          </PublicDetailRow>
          <PublicDetailRow label="Offer visibility">
            {formatLabel(auction.protocol?.offerVisibility) || '—'}
          </PublicDetailRow>
        </div>
      </div>
    </>
  );
}

function PublicDetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border/50 pb-2 last:border-0 last:pb-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground text-right">{children}</span>
    </div>
  );
}

function PublicWorkflow({
  workflow,
  auction,
}: {
  workflow: AuctionWorkflowStep[];
  auction: AuctionVM;
}) {
  const preAuctionNodes = buildPublicWorkflowNodes(
    workflow.filter((step) => publicWorkflowPhase(step) === 'PRE_AUCTION'),
  );
  const postAuctionNodes = buildPublicWorkflowNodes(
    workflow.filter((step) => publicWorkflowPhase(step) === 'POST_AUCTION'),
  );

  return (
    <section className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-5">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-primary/10 shrink-0">
          <GitFork className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-foreground">Participation workflow</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Follow these steps to complete your registration for the auction.
          </p>
        </div>
      </div>

      <WorkflowStagesTimeline
        preAuctionNodes={preAuctionNodes}
        postAuctionNodes={postAuctionNodes}
        auction={auction}
      />
    </section>
  );
}

function publicWorkflowPhase(step: AuctionWorkflowStep): 'PRE_AUCTION' | 'POST_AUCTION' {
  return resolveStr(step.phase) === 'POST_AUCTION' || step.postPayment === true
    ? 'POST_AUCTION'
    : 'PRE_AUCTION';
}

function publicStepDetails(step: AuctionWorkflowStep): ReactNode {
  switch (resolveStr(step.type)) {
    case 'PAYMENT_STEP':
      return <PaymentStepDetails step={step} />;
    case 'BANK_DETAIL_FORM_STEP':
      return <BankDetailStepDetails />;
    case 'PARTICIPATION_FORM_STEP':
      return <ParticipationFormStepDetails step={step} />;
    case 'TNC_FORM_STEP':
      return <TnCStepDetails step={step} />;
    case 'FORM_STEP':
      return <FormStepDetails step={step} />;
    default:
      return null;
  }
}

function buildPublicWorkflowNodes(workflow: AuctionWorkflowStep[]): TimelineNode[] {
  return [...workflow]
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((step, index) => {
      const type = resolveStr(step.type);
      const meta = stepTypeMeta(type);
      const details = publicStepDetails(step);

      return {
        id: step.id ?? `public-workflow-step-${index}`,
        label: formatLabel(type) || 'Workflow step',
        Icon: meta.Icon,
        dotClass: meta.dot,
        labelClass: meta.text,
        borderClass: meta.border,
        title: step.name || formatLabel(type) || `Step ${index + 1}`,
        subs: step.description ? [step.description] : [],
        details,
      };
    });
}

// ── Workflow status summary card ──────────────────────────────────────────────

import type { ParticipantWorkflowStepStatus } from '@repo/api';

function WorkflowStatusCard({
  workflowStatus,
  onOpenWizard,
  allDone,
}: {
  workflowStatus: Record<string, ParticipantWorkflowStepStatus>;
  onOpenWizard: () => void;
  allDone: boolean;
}) {
  const entries = Object.entries(workflowStatus);
  const completedCount = entries.filter(([, s]) => {
    const t = resolveStr(s.type);
    return t === 'COMPLETED' || t === 'DONE' || t === 'APPROVED';
  }).length;

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-primary" />
          Registration Steps
        </h2>
        {!allDone && (
          <Button size="sm" variant="outline" onClick={onOpenWizard} className="gap-1.5">
            <ClipboardList className="h-3.5 w-3.5" />
            Continue
          </Button>
        )}
      </div>

      {/* Progress bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {completedCount} of {entries.length} completed
          </span>
          <span>{Math.round((completedCount / entries.length) * 100)}%</span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${allDone ? 'bg-emerald-500' : 'bg-primary'}`}
            style={{ width: `${(completedCount / entries.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Step list */}
      <div className="space-y-1.5">
        {entries.map(([stepId, s]) => {
          const t = resolveStr(s.type);
          const done = t === 'COMPLETED' || t === 'DONE' || t === 'APPROVED';
          const pending = t === 'PENDING' || t === 'IN_PROGRESS';
          return (
            <div
              key={stepId}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm ${
                done
                  ? 'bg-emerald-500/5 text-emerald-700'
                  : pending
                    ? 'bg-amber-500/5 text-amber-700'
                    : 'bg-muted/30 text-muted-foreground'
              }`}
            >
              {done ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
              ) : pending ? (
                <Loader2 className="h-4 w-4 shrink-0 text-amber-500" />
              ) : (
                <div className="h-4 w-4 shrink-0 rounded-full border-2 border-current opacity-40" />
              )}
              <span className="flex-1 truncate">{formatLabel(t) || 'Step'}</span>
              {s.updatedAt && (
                <span className="text-[10px] text-muted-foreground shrink-0">
                  {formatDateTime(s.updatedAt)}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {allDone && (
        <div className="flex items-center gap-2 text-sm text-emerald-600 bg-emerald-500/10 px-4 py-2.5 rounded-lg">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          All registration steps completed. You are fully registered to participate.
        </div>
      )}
    </div>
  );
}

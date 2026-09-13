// 'use client';

// import { useEffect, useState } from 'react';
// import { useParams, useRouter } from 'next/navigation';
// import {
//   auctionsApi,
//   AuctionVM,
//   PolicyItemRQ,
//   AuctionPoliciesRQ,
//   PolicyEvaluationMap,
//   AuctionWorkflowStep,
// } from '@repo/api';
// import { AuctionUnitSection } from '../../_components/AuctionUnitSection';
// import {
//   groupPoliciesByCategory,
//   buildEvaluationsByPolicy,
//   parseIsoDurationMs,
//   humanizeIsoDuration,
//   fmtLabel,
// } from '../../_components/PolicyShared';
// import {
//   ArrowLeft,
//   Pencil,
//   Calendar,
//   DollarSign,
//   IndianRupee,
//   Settings2,
//   Layers,
//   AlertCircle,
//   Info,
//   Copy,
//   Check,
//   RefreshCw,
//   Clock,
//   ShieldCheck,
//   Sparkles,
//   ChevronRight,
//   TrendingUp,
//   Users,
//   CreditCard,
//   FileText,
//   Landmark,
//   UserCheck,
//   GitFork,
// } from 'lucide-react';
// import {
//   Button,
//   Badge,
//   Tabs,
//   TabsList,
//   TabsTrigger,
//   TabsContent,
//   Card,
//   CardHeader,
//   CardTitle,
//   CardContent,
//   toast,
// } from '@repo/ui';
// import { StatusBadge } from '@/components/common/admin/AuctionStatusBadge';
// import { formatDateTime, formatLabel, resolveStr } from '@/components/common/admin/format';
// import { DetailRow, PageLoading, SectionCard } from '@/components/common/admin/SectionCard';

// // ── Timeline model ────────────────────────────────────────────────────────────

// interface TimelineNode {
//   id: string;
//   label: string;
//   Icon: typeof Clock;
//   dotClass: string;
//   labelClass: string;
//   /** Left-border accent color for the content card, e.g. 'border-rose-500' */
//   borderClass: string;
//   title: string;
//   /** Single point in time (or start of range). */
//   time?: string;
//   /** End of range — shown below `time` for price windows. */
//   timeTo?: string;
//   subs: string[];
// }

// const WINDOW_COLORS = [
//   { dot: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400' },
//   { dot: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400' },
//   { dot: 'bg-blue-500', text: 'text-blue-600 dark:text-blue-400' },
//   { dot: 'bg-indigo-500', text: 'text-indigo-600 dark:text-indigo-400' },
//   { dot: 'bg-violet-500', text: 'text-violet-600 dark:text-violet-400' },
//   { dot: 'bg-rose-500', text: 'text-rose-600 dark:text-rose-400' },
// ];

// const PARTICIPATION_STEP_TYPES = [
//   'FORM_STEP',
//   'TNC_FORM_STEP',
//   'BANK_DETAIL_FORM_STEP',
//   'PARTICIPATION_FORM_STEP',
// ];

// function headsSummary(heads?: AuctionWorkflowStep['heads']): string {
//   return (heads ?? [])
//     .map((head) => {
//       const amount =
//         resolveStr(head.basis) === 'PERCENTAGE_BASED'
//           ? `${head.value}%`
//           : `₹${head.value?.toLocaleString() ?? head.value}`;
//       return `${head.name} ${amount}${head.refundable ? ' (refundable)' : ''}`;
//     })
//     .join(', ');
// }

// /** Folds schedule + policies + workflow into a chronological list of dated
//  *  milestones: pre-payment deadlines, participant validation, bidding open,
//  *  price-progression windows, close (+ extension rule) and post-payment.
//  *  Offsets resolve against start/end once scheduled; unscheduled auctions
//  *  fall back to relative descriptions ("24h before start"). */
// function buildScheduleTimeline(
//   auction: AuctionVM,
//   policies: AuctionPoliciesRQ | null,
//   workflow: AuctionWorkflowStep[],
// ): TimelineNode[] {
//   const nodes: TimelineNode[] = [];
//   const startIso = auction.schedule?.startTime ?? auction.startTime;
//   const endIso = auction.schedule?.endTime ?? auction.endTime;
//   const startMs = startIso ? new Date(startIso).getTime() : null;
//   const endMs = endIso ? new Date(endIso).getTime() : null;

//   // Pre-payment deadlines — due within `offset` before the auction starts.
//   workflow
//     .filter(
//       (step) =>
//         resolveStr(step.type) === 'PAYMENT_STEP' &&
//         (resolveStr(step.phase) === 'PRE_PAYMENT' || step.prePayment === true),
//     )
//     .forEach((step) => {
//       const off = parseIsoDurationMs(step.offset);
//       const heads = headsSummary(step.heads);
//       nodes.push({
//         id: `prepay-${step.id}`,
//         label: 'Pre-Payment Due',
//         Icon: CreditCard,
//         dotClass: 'bg-rose-500',
//         labelClass: 'text-rose-600 dark:text-rose-400',
//         borderClass: 'border-rose-500',
//         title: step.name || 'Pre Payment',
//         time: startMs != null ? formatDateTime(new Date(startMs - off).toISOString()) : undefined,
//         subs: [
//           startMs != null
//             ? `Must be completed ${humanizeIsoDuration(off)} before bidding opens.`
//             : `Due ${humanizeIsoDuration(off)} before bidding opens (start not scheduled yet).`,
//           heads && `Heads: ${heads}`,
//         ].filter((s): s is string => Boolean(s)),
//       });
//     });

//   // Participant validation cutoffs (e.g. minimum participants) — checked
//   // `preStartValidationDuration` before start; unmet means cancellation.
//   (policies ?? [])
//     .filter(
//       (policy) =>
//         resolveStr(policy.phase) === 'PARTICIPATION' &&
//         (policy.preStartValidationDuration || policy.count != null),
//     )
//     .forEach((policy) => {
//       const dur = parseIsoDurationMs(policy.preStartValidationDuration);
//       nodes.push({
//         id: `validate-${policy.id ?? policy.order ?? policy.name}`,
//         label: 'Participant Validation',
//         Icon: Users,
//         dotClass: 'bg-amber-500',
//         labelClass: 'text-amber-600 dark:text-amber-400',
//         borderClass: 'border-amber-500',
//         title: policy.name || fmtLabel(policy.type) || 'Validation',
//         time:
//           startMs != null && dur > 0
//             ? formatDateTime(new Date(startMs - dur).toISOString())
//             : undefined,
//         subs: [
//           policy.count != null
//             ? `Requires at least ${policy.count} participants, otherwise the auction is cancelled.`
//             : '',
//           dur > 0 ? `Checked ${humanizeIsoDuration(dur)} before the start time.` : '',
//         ].filter((s): s is string => Boolean(s)),
//       });
//     });

//   if (startIso) {
//     const participationSteps = workflow.filter((step) =>
//       PARTICIPATION_STEP_TYPES.includes(resolveStr(step.type)),
//     );
//     nodes.push({
//       id: 'start',
//       label: 'Auction Opens',
//       Icon: Calendar,
//       dotClass: 'bg-emerald-500',
//       labelClass: 'text-emerald-600 dark:text-emerald-400',
//       borderClass: 'border-emerald-500',
//       title: 'Bidding opens',
//       time: formatDateTime(startIso),
//       subs: [
//         participationSteps.length > 0
//           ? `Participation flow: ${participationSteps.map((step) => step.name).join(' → ')}`
//           : '',
//       ].filter(Boolean),
//     });
//   }

//   // Price progression windows — sequential by each child's windowDuration;
//   // a zero duration (`PT0S`) or the final child runs until close.
//   let windowNo = 0;
//   (policies ?? [])
//     .filter((policy) => resolveStr(policy.type) === 'PRICE_PROGRESSION_POLICY')
//     .forEach((wrapper) => {
//       const children = [...(wrapper.policies ?? [])].sort(
//         (a, b) => (a.order ?? 0) - (b.order ?? 0),
//       );
//       let cum = 0;
//       children.forEach((child, i) => {
//         const color = WINDOW_COLORS[windowNo % WINDOW_COLORS.length]!;
//         windowNo += 1;
//         const dur = parseIsoDurationMs(child.windowDuration);
//         const runsTillEnd = i === children.length - 1 || dur === 0;
//         const fromMs = startMs != null ? startMs + cum : null;
//         const toMs = fromMs != null && endMs != null ? (runsTillEnd ? endMs : fromMs + dur) : null;
//         nodes.push({
//           id: `window-${child.id ?? `${wrapper.id}-${i}`}`,
//           label: 'Price Window',
//           Icon: TrendingUp,
//           dotClass: color.dot,
//           labelClass: color.text,
//           borderClass: color.dot.replace('bg-', 'border-'),
//           title: child.name || fmtLabel(child.type) || 'Price change',
//           time: fromMs != null ? formatDateTime(new Date(fromMs).toISOString()) : undefined,
//           timeTo: toMs != null ? formatDateTime(new Date(toMs).toISOString()) : undefined,
//           subs: [
//             fromMs == null
//               ? runsTillEnd
//                 ? `Applies from ${humanizeIsoDuration(cum)} after start until close.`
//                 : `Applies between ${humanizeIsoDuration(cum)} and ${humanizeIsoDuration(cum + dur)} after start.`
//               : '',
//             child.value != null
//               ? `Bid step of ₹${child.value.toLocaleString()} with multiplier${
//                   (child.steps?.length ?? 0) > 1 ? 's' : ''
//                 } ${(child.steps ?? []).join(', ')}.`
//               : '',
//           ].filter((s): s is string => Boolean(s)),
//         });
//         cum += dur;
//       });
//     });

//   if (endIso) {
//     const ext = (policies ?? []).find((policy) => resolveStr(policy.type) === 'EXTENSION_POLICY');
//     nodes.push({
//       id: 'end',
//       label: 'Auction Closes',
//       Icon: Clock,
//       dotClass: 'bg-indigo-500',
//       labelClass: 'text-indigo-600 dark:text-indigo-400',
//       borderClass: 'border-indigo-500',
//       title: 'Bidding closes',
//       time: formatDateTime(endIso),
//       subs: [
//         ext
//           ? `Late bids extend the close by ${humanizeIsoDuration(parseIsoDurationMs(ext.duration))}${
//               (ext.limit ?? 0) > 0 ? `, up to ${ext.limit} extensions` : ' (unlimited extensions)'
//             }.`
//           : '',
//         'Winner determination applies once bidding closes.',
//       ].filter(Boolean),
//     });

//     // Post-payment deadlines — settle within `offset` after the close.
//     workflow
//       .filter(
//         (step) =>
//           resolveStr(step.type) === 'PAYMENT_STEP' &&
//           (resolveStr(step.phase) === 'POST_PAYMENT' || step.postPayment === true),
//       )
//       .forEach((step) => {
//         const off = parseIsoDurationMs(step.offset);
//         const heads = headsSummary(step.heads);
//         nodes.push({
//           id: `postpay-${step.id}`,
//           label: 'Post-Payment Due',
//           Icon: CreditCard,
//           dotClass: 'bg-violet-500',
//           labelClass: 'text-violet-600 dark:text-violet-400',
//           borderClass: 'border-violet-500',
//           title: step.name || 'Post Payment',
//           time: formatDateTime(new Date(endMs! + off).toISOString()),
//           subs: [
//             `Must be settled within ${humanizeIsoDuration(off)} after the auction closes.`,
//             heads && `Heads: ${heads}`,
//           ].filter((s): s is string => Boolean(s)),
//         });
//       });
//   }

//   return nodes;
// }

// // ── Workflow timeline ─────────────────────────────────────────────────────────

// const STEP_TYPE_COLORS: Record<string, { dot: string; text: string; border: string }> = {
//   PARTICIPATION_FORM_STEP: {
//     dot: 'bg-violet-500',
//     text: 'text-violet-600 dark:text-violet-400',
//     border: 'border-violet-500',
//   },
//   FORM_STEP: {
//     dot: 'bg-blue-500',
//     text: 'text-blue-600 dark:text-blue-400',
//     border: 'border-blue-500',
//   },
//   TNC_FORM_STEP: {
//     dot: 'bg-amber-500',
//     text: 'text-amber-600 dark:text-amber-400',
//     border: 'border-amber-500',
//   },
//   BANK_DETAIL_FORM_STEP: {
//     dot: 'bg-emerald-500',
//     text: 'text-emerald-600 dark:text-emerald-400',
//     border: 'border-emerald-500',
//   },
//   PAYMENT_STEP: {
//     dot: 'bg-rose-500',
//     text: 'text-rose-600 dark:text-rose-400',
//     border: 'border-rose-500',
//   },
// };

// function stepTypeIcon(type: string): typeof Clock {
//   switch (type) {
//     case 'PAYMENT_STEP':
//       return CreditCard;
//     case 'BANK_DETAIL_FORM_STEP':
//       return Landmark;
//     case 'TNC_FORM_STEP':
//       return ShieldCheck;
//     case 'PARTICIPATION_FORM_STEP':
//       return UserCheck;
//     default:
//       return FileText;
//   }
// }

// function buildWorkflowTimeline(
//   workflow: AuctionWorkflowStep[],
//   startIso?: string,
//   endIso?: string,
// ): TimelineNode[] {
//   const startMs = startIso ? new Date(startIso).getTime() : null;
//   const endMs = endIso ? new Date(endIso).getTime() : null;

//   return [...workflow]
//     .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
//     .map((step): TimelineNode => {
//       const typeStr = resolveStr(step.type);
//       const color = STEP_TYPE_COLORS[typeStr] ?? {
//         dot: 'bg-muted-foreground',
//         text: 'text-muted-foreground',
//         border: 'border-muted-foreground',
//       };
//       const Icon = stepTypeIcon(typeStr);
//       const phase = resolveStr(step.phase);
//       const label = fmtLabel(typeStr) || 'Step';

//       // Compute the absolute datetime for payment steps
//       let time: string | undefined;
//       let timeTo: string | undefined;
//       if (typeStr === 'PAYMENT_STEP' && step.offset) {
//         const off = parseIsoDurationMs(step.offset);
//         if (phase === 'PRE_PAYMENT' && startMs != null) {
//           time = formatDateTime(new Date(startMs - off).toISOString());
//         } else if (phase === 'POST_PAYMENT' && endMs != null) {
//           time = formatDateTime(new Date(endMs + off).toISOString());
//         }
//       }
//       // Participation-type steps — relative to auction start (validation window)
//       if (typeStr === 'PARTICIPATION_FORM_STEP' && step.preStartValidationDuration) {
//         const dur = parseIsoDurationMs(step.preStartValidationDuration);
//         if (startMs != null && dur > 0) {
//           time = formatDateTime(new Date(startMs - dur).toISOString());
//           timeTo = startIso ? formatDateTime(startIso) : undefined;
//         }
//       }

//       const subs: string[] = [];
//       if (step.description) subs.push(step.description);
//       if (typeStr === 'PAYMENT_STEP') {
//         const heads = headsSummary(step.heads);
//         if (heads) subs.push(`Heads: ${heads}`);
//       }
//       if (step.manualApproval) subs.push('Requires manual approval');

//       return {
//         id: step.id ?? `step-${step.order}`,
//         label,
//         Icon,
//         dotClass: color.dot,
//         labelClass: color.text,
//         borderClass: color.border,
//         title: step.name || label,
//         time,
//         timeTo,
//         subs,
//       };
//     });
// }

// // ── Main Auction View Page ─────────────────────────────────────────────────────

// export default function AuctionViewPage() {
//   const { id } = useParams<{ id: string }>();
//   const router = useRouter();

//   const [loading, setLoading] = useState(true);
//   const [reloadingPolicies, setReloadingPolicies] = useState(false);
//   const [copied, setCopied] = useState(false);
//   const [activeTab, setActiveTab] = useState('overview');
//   const [auction, setAuction] = useState<AuctionVM | null>(null);
//   const [policies, setPolicies] = useState<AuctionPoliciesRQ | null>(null);
//   const [workflow, setWorkflow] = useState<AuctionWorkflowStep[]>([]);
//   const [evaluationsByPolicyId, setEvaluationsByPolicyId] = useState<
//     Record<string, PolicyEvaluationMap>
//   >({});
//   // When we last fetched evaluations — shown to admins so they know whether the
//   // "Re-evaluate All" badge result is fresh or stale.
//   const [evaluationsEvaluatedAt, setEvaluationsEvaluatedAt] = useState<Date | null>(null);

//   const fetchEvaluations = async (items: AuctionPoliciesRQ | null) => {
//     if (!items) return;
//     const policyIds = Array.from(
//       new Set(items.map((p) => p.id).filter((policyId): policyId is string => Boolean(policyId))),
//     );
//     if (policyIds.length === 0) {
//       setEvaluationsByPolicyId({});
//       setEvaluationsEvaluatedAt(new Date());
//       return;
//     }
//     // Evaluate every policy in a single bulk request (POST /policies/evaluate),
//     // matching the auction policy step, instead of N+1 per-policy calls.
//     const evaluations = await auctionsApi.evaluateAuctionPolicies(id, policyIds).catch(() => null);
//     setEvaluationsByPolicyId(buildEvaluationsByPolicy(evaluations, items));
//     setEvaluationsEvaluatedAt(new Date());
//   };

//   useEffect(() => {
//     let cancelled = false;
//     Promise.all([
//       auctionsApi.getAuctionById(id, ['*']),
//       auctionsApi.getAuctionPolicies(id).catch(() => null),
//       auctionsApi.getAuctionWorkflow(id).catch(() => [] as AuctionWorkflowStep[]),
//     ])
//       .then(([a, pol, wf]) => {
//         if (cancelled) return;
//         setAuction(a);
//         setPolicies(pol);
//         setWorkflow(wf ?? []);
//         // Only auto-evaluate on first load when the auction is in a state where
//         // evaluation results could have moved (SCHEDULED / RUNNING). For CREATED
//         // / COMPLETED / CANCELLED, evaluations are stable — skip the N+1 to
//         // save server round-trips and let the admin click Re-evaluate when needed.
//         const status = resolveStr(a.status);
//         const live = status === 'SCHEDULED' || status === 'RUNNING';
//         if (live) {
//           return fetchEvaluations(pol);
//         }
//         return null;
//       })
//       .catch(() => {})
//       .finally(() => {
//         if (!cancelled) setLoading(false);
//       });
//     return () => {
//       cancelled = true;
//     };
//   }, [id]);

//   const handleRefreshPolicies = async () => {
//     setReloadingPolicies(true);
//     try {
//       const pol = await auctionsApi.getAuctionPolicies(id).catch(() => null);
//       setPolicies(pol);
//       await fetchEvaluations(pol);
//       toast?.success?.('Policies re-evaluated successfully');
//     } catch {
//       toast?.error?.('Failed to re-evaluate policies');
//     } finally {
//       setReloadingPolicies(false);
//     }
//   };

//   const handleTabChange = (value: string) => {
//     setActiveTab(value);
//     // Evaluations only auto-fetch on mount for SCHEDULED/RUNNING auctions (see
//     // above). For every other status, the first visit to the Policies tab is
//     // what should trigger the fetch, instead of leaving it blank until the
//     // admin clicks "Re-evaluate All".
//     if (value === 'policies' && !evaluationsEvaluatedAt && !reloadingPolicies) {
//       setReloadingPolicies(true);
//       fetchEvaluations(policies).finally(() => setReloadingPolicies(false));
//     }
//   };

//   const handleCopyId = () => {
//     if (id) {
//       navigator.clipboard.writeText(id);
//       setCopied(true);
//       setTimeout(() => setCopied(false), 2000);
//       toast?.success?.('Auction ID copied to clipboard');
//     }
//   };

//   if (loading) {
//     return <PageLoading message="Loading auction details..." />;
//   }

//   if (!auction) {
//     return (
//       <div className="flex flex-col items-center justify-center py-24 gap-4">
//         <div className="p-4 rounded-full bg-rose-500/10 text-rose-500">
//           <AlertCircle className="h-10 w-10" />
//         </div>
//         <p className="text-base font-semibold text-foreground">Auction not found</p>
//         <p className="text-sm text-muted-foreground max-w-sm text-center">
//           The requested auction ID could not be found or you may not have authorization to view it.
//         </p>
//         <Button variant="outline" size="sm" onClick={() => router.push('/admin/auctions')}>
//           <ArrowLeft className="h-4 w-4 mr-1.5" />
//           Back to Auctions
//         </Button>
//       </div>
//     );
//   }

//   const format = formatLabel(auction.format);
//   const auctionType = formatLabel(auction.type);

//   // Policy entries grouped back into named categories client-side — the backend
//   // now returns a flat policies array (see PolicyShared.groupPoliciesByCategory).
//   const policyEntries: [string, PolicyItemRQ[]][] = groupPoliciesByCategory(policies ?? []);

//   const totalPolicyCount = policyEntries.reduce((sum, [, items]) => sum + items.length, 0);

//   // Policies timeline: fold the flat group list into ordered auction-lifecycle
//   // stages (start → running → complete → winner) so the tab reads like the
//   // auction's actual sequence of events.
//   const byUpperKey =
//     (keys: string[]) =>
//     ([key]: [string, PolicyItemRQ[]]) =>
//       keys.includes(key.toUpperCase());

//   // "Before Auction Start" captures validation/precondition rules (e.g. the
//   // minimum required participants policy) that must be satisfied ahead of the
//   // auction opening, so it appears as its own stage prior to "Auction Start".
//   const beforeStartGroups = policyEntries.filter(byUpperKey(['PARTICIPATION', 'PRECONDITION']));
//   const auctionRunningGroups = policyEntries.filter(byUpperKey(['EXTENSION', 'PRICE_PROGRESSION']));
//   const winnerGroups = policyEntries.filter(
//     byUpperKey(['WINNER_DETERMINATION', 'WINNER_PRICE_DETERMINATION']),
//   );

//   const placedKeys = new Set(
//     [...beforeStartGroups, ...auctionRunningGroups, ...winnerGroups].map(([key]) => key),
//   );
//   const otherGroups = policyEntries.filter(([key]) => !placedKeys.has(key));

//   interface PolicyStage {
//     id: string;
//     label: string;
//     dotClassName: string;
//     textClassName: string;
//     dateLine?: string;
//     subLine?: string;
//     groups: [string, PolicyItemRQ[]][];
//   }

//   const policyStages: PolicyStage[] = [];

//   if (beforeStartGroups.length > 0) {
//     const startMs = auction.schedule?.startTime
//       ? new Date(auction.schedule.startTime).getTime()
//       : null;
//     const maxDur = beforeStartGroups
//       .flatMap(([, items]) => items)
//       .reduce((max, p) => {
//         const d = parseIsoDurationMs(p.preStartValidationDuration);
//         return d > max ? d : max;
//       }, 0);
//     const beforeStartCutoff =
//       startMs != null && maxDur > 0
//         ? formatDateTime(new Date(startMs - maxDur).toISOString())
//         : undefined;
//     policyStages.push({
//       id: 'before-start',
//       label: 'Before Auction Start',
//       dotClassName: 'bg-teal-500',
//       textClassName: 'text-teal-600 dark:text-teal-400',
//       dateLine: beforeStartCutoff,
//       subLine: 'Preconditions that must be met ahead of the auction opening (e.g. minimum participants).',
//       groups: beforeStartGroups,
//     });
//   }

//   if (auction.schedule?.startTime || auctionRunningGroups.length > 0) {
//     policyStages.push({
//       id: 'auction-start',
//       label: 'Auction Start',
//       dotClassName: 'bg-emerald-500',
//       textClassName: 'text-emerald-600 dark:text-emerald-400',
//       dateLine: auction.schedule?.startTime
//         ? `Auction opens — ${formatDateTime(auction.schedule.startTime)}`
//         : undefined,
//       groups: [],
//     });
//   }

//   if (auctionRunningGroups.length > 0) {
//     policyStages.push({
//       id: 'auction-running',
//       label: 'Auction Running',
//       dotClassName: 'bg-blue-500',
//       textClassName: 'text-blue-600 dark:text-blue-400',
//       subLine: 'Extension and price-progression rules apply while bidding is open.',
//       groups: auctionRunningGroups,
//     });
//   }

//   // Auction Complete only appears once the auction actually has an end time scheduled.
//   if (auction.schedule?.endTime) {
//     policyStages.push({
//       id: 'auction-complete',
//       label: 'Auction Complete',
//       dotClassName: 'bg-indigo-500',
//       textClassName: 'text-indigo-600 dark:text-indigo-400',
//       dateLine: `Auction closes — ${formatDateTime(auction.schedule.endTime)}`,
//       groups: [],
//     });
//   }

//   if (winnerGroups.length > 0) {
//     policyStages.push({
//       id: 'winner',
//       label: 'Winner',
//       dotClassName: 'bg-violet-500',
//       textClassName: 'text-violet-600 dark:text-violet-400',
//       groups: winnerGroups,
//     });
//   }

//   if (otherGroups.length > 0) {
//     policyStages.push({
//       id: 'other',
//       label: 'Other Policies',
//       dotClassName: 'bg-muted-foreground',
//       textClassName: 'text-muted-foreground',
//       groups: otherGroups,
//     });
//   }

//   // Dated milestones for the Schedule & Timeline tab (payment deadlines,
//   // validation cutoff, price windows, close, settlement).
//   const timelineNodes = buildScheduleTimeline(auction, policies, workflow);
//   const workflowNodes = buildWorkflowTimeline(
//     workflow,
//     auction.schedule?.startTime ?? auction.startTime,
//     auction.schedule?.endTime ?? auction.endTime,
//   );

//   return (
//     <div className="space-y-6 pb-12 max-w-7xl mx-auto">
//       {/* Top Banner Header */}
//       <div className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-4">
//         <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
//           <div className="space-y-1.5">
//             <div className="flex items-center gap-2.5 flex-wrap">
//               <StatusBadge value={auction.status} />
//               {auction.referenceId && (
//                 <Badge variant="outline" className="font-mono text-xs">
//                   Ref: {auction.referenceId}
//                 </Badge>
//               )}
//               {auctionType && (
//                 <Badge variant="secondary" className="text-xs">
//                   {auctionType}
//                 </Badge>
//               )}
//             </div>
//             <h1 className="text-2xl font-extrabold text-foreground tracking-tight">
//               {auction.title}
//             </h1>
//             <p className="text-sm text-muted-foreground line-clamp-2 max-w-3xl">
//               {auction.description || 'No description provided for this auction.'}
//             </p>
//           </div>

//           <div className="flex items-center gap-2 shrink-0 flex-wrap">
//             <Button
//               variant="outline"
//               size="sm"
//               onClick={handleCopyId}
//               className="gap-1.5 text-xs rounded-xl"
//             >
//               {copied ? (
//                 <Check className="h-3.5 w-3.5 text-emerald-500" />
//               ) : (
//                 <Copy className="h-3.5 w-3.5" />
//               )}
//               <span>{copied ? 'Copied' : 'Copy ID'}</span>
//             </Button>
//             <Button
//               variant="outline"
//               size="sm"
//               onClick={() => router.push('/admin/auctions')}
//               className="gap-1.5 text-xs rounded-xl"
//             >
//               <ArrowLeft className="h-3.5 w-3.5" />
//               <span>Back</span>
//             </Button>
//             <Button
//               size="sm"
//               onClick={() => router.push(`/admin/auctions/${id}/edit`)}
//               className="gap-1.5 text-xs rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
//             >
//               <Pencil className="h-3.5 w-3.5" />
//               <span>Edit Auction</span>
//             </Button>
//           </div>
//         </div>

//         {/* Schedule Bar */}
//         {auction.schedule?.startTime && (
//           <div className="flex items-center gap-2 pt-3 border-t border-border/40 text-xs font-medium text-muted-foreground">
//             <Calendar className="h-4 w-4 text-primary shrink-0" />
//             <span>
//               Start:{' '}
//               <strong className="text-foreground">
//                 {formatDateTime(auction.schedule.startTime)}
//               </strong>
//             </span>
//             {auction.schedule.endTime && (
//               <>
//                 <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60" />
//                 <span>
//                   End:{' '}
//                   <strong className="text-foreground">
//                     {formatDateTime(auction.schedule.endTime)}
//                   </strong>
//                 </span>
//               </>
//             )}
//           </div>
//         )}
//       </div>

//       {/* Metric KPI Cards */}
//       <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
//         <Card className="rounded-2xl border-border bg-card shadow-xs">
//           <CardContent className="p-4 flex items-center justify-between">
//             <div className="space-y-0.5">
//               <p className="text-xs text-muted-foreground font-medium">Opening Price</p>
//               <p className="text-lg font-bold text-foreground">
//                 {auction.unit?.openingPrice != null ? (
//                   <>
//                     {resolveStr(auction.monetaryOptions?.currencyUnit)}{' '}
//                     {auction.unit.openingPrice.toLocaleString()}
//                   </>
//                 ) : (
//                   '—'
//                 )}
//               </p>
//             </div>
//             <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600">
//               <IndianRupee className="h-5 w-5" />
//             </div>
//           </CardContent>
//         </Card>

//         <Card className="rounded-2xl border-border bg-card shadow-xs">
//           <CardContent className="p-4 flex items-center justify-between">
//             <div className="space-y-0.5">
//               <p className="text-xs text-muted-foreground font-medium">Direction</p>
//               <p className="text-sm font-bold text-foreground">
//                 {formatLabel(auction.protocol?.direction) || '—'}
//               </p>
//             </div>
//             <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600">
//               <TrendingUp className="h-5 w-5" />
//             </div>
//           </CardContent>
//         </Card>

//         <Card className="rounded-2xl border-border bg-card shadow-xs">
//           <CardContent className="p-4 flex items-center justify-between">
//             <div className="space-y-0.5">
//               <p className="text-xs text-muted-foreground font-medium">Format</p>
//               <p className="text-sm font-bold text-foreground truncate max-w-[110px]">
//                 {format || '—'}
//               </p>
//             </div>
//             <div className="p-2.5 rounded-xl bg-violet-500/10 text-violet-600">
//               <Sparkles className="h-5 w-5" />
//             </div>
//           </CardContent>
//         </Card>

//         <Card className="rounded-2xl border-border bg-card shadow-xs">
//           <CardContent className="p-4 flex items-center justify-between">
//             <div className="space-y-0.5">
//               <p className="text-xs text-muted-foreground font-medium">Configured Policies</p>
//               <p className="text-lg font-bold text-foreground">{totalPolicyCount}</p>
//             </div>
//             <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600">
//               <ShieldCheck className="h-5 w-5" />
//             </div>
//           </CardContent>
//         </Card>
//       </div>

//       {/* Main Tabbed Interface */}
//       <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
//         <TabsList className="grid w-full grid-cols-4 rounded-xl p-1 bg-muted/60">
//           <TabsTrigger value="overview" className="rounded-lg text-xs font-semibold gap-2 py-2">
//             <Info className="h-3.5 w-3.5" />
//             <span>Overview</span>
//           </TabsTrigger>
//           <TabsTrigger value="unit" className="rounded-lg text-xs font-semibold gap-2 py-2">
//             <Layers className="h-3.5 w-3.5" />
//             <span>Unit & Items</span>
//           </TabsTrigger>
//           <TabsTrigger value="policies" className="rounded-lg text-xs font-semibold gap-2 py-2">
//             <Settings2 className="h-3.5 w-3.5" />
//             <span>Policies ({totalPolicyCount})</span>
//           </TabsTrigger>
//           <TabsTrigger value="timeline" className="rounded-lg text-xs font-semibold gap-2 py-2">
//             <GitFork className="h-3.5 w-3.5" />
//             <span>Workflow</span>
//           </TabsTrigger>
//         </TabsList>

//         {/* TAB 1: OVERVIEW */}
//         <TabsContent value="overview" className="space-y-6 outline-none">
//           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//             <div className="space-y-6">
//               <SectionCard title="Basic Information" icon={Info}>
//                 <DetailRow label="Auction Title">{auction.title || '—'}</DetailRow>
//                 <DetailRow label="Description">{auction.description || '—'}</DetailRow>
//                 <DetailRow label="Reference ID">
//                   {auction.referenceId ? (
//                     <Badge variant="outline" className="font-mono text-xs">
//                       {auction.referenceId}
//                     </Badge>
//                   ) : (
//                     '—'
//                   )}
//                 </DetailRow>
//                 <DetailRow label="Auction Type">
//                   {auctionType ? (
//                     <Badge variant="secondary" className="text-xs font-semibold">
//                       {auctionType}
//                     </Badge>
//                   ) : (
//                     '—'
//                   )}
//                 </DetailRow>
//                 <DetailRow label="Format">{format || '—'}</DetailRow>
//                 <DetailRow label="Status">
//                   <StatusBadge value={auction.status} />
//                 </DetailRow>
//               </SectionCard>

//               <SectionCard title="Monetary Options" icon={DollarSign}>
//                 <DetailRow label="Currency Unit">
//                   <span className="font-mono font-bold text-foreground">
//                     {resolveStr(auction.monetaryOptions?.currencyUnit) || '—'}
//                   </span>
//                 </DetailRow>
//                 <DetailRow label="Precision">
//                   {auction.monetaryOptions?.precision != null
//                     ? `${auction.monetaryOptions.precision} decimal places`
//                     : '—'}
//                 </DetailRow>
//                 <DetailRow label="Rounding Mode">
//                   {formatLabel(auction.monetaryOptions?.roundingMode) || '—'}
//                 </DetailRow>
//               </SectionCard>
//             </div>

//             <div className="space-y-6">
//               <SectionCard title="Protocol Settings" icon={Settings2}>
//                 <DetailRow label="Accessibility">
//                   <Badge
//                     variant="outline"
//                     className={`text-xs font-medium ${resolveStr(auction.protocol?.accessibility) === 'PUBLIC' ? 'border-blue-500 text-blue-600' : 'border-violet-500 text-violet-600'}`}
//                   >
//                     {formatLabel(auction.protocol?.accessibility) || '—'}
//                   </Badge>
//                 </DetailRow>
//                 <DetailRow label="Direction">
//                   <Badge
//                     variant="outline"
//                     className={`text-xs font-medium ${resolveStr(auction.protocol?.direction) === 'FORWARD' ? 'border-emerald-500 text-emerald-600' : 'border-amber-500 text-amber-600'}`}
//                   >
//                     {formatLabel(auction.protocol?.direction) || '—'}
//                   </Badge>
//                 </DetailRow>
//                 <DetailRow label="Dimension">
//                   {formatLabel(auction.protocol?.dimension) || '—'}
//                 </DetailRow>
//                 <DetailRow label="Participant Visibility">
//                   {formatLabel(auction.protocol?.participantVisibility) || '—'}
//                 </DetailRow>
//                 <DetailRow label="Offer Visibility">
//                   {formatLabel(auction.protocol?.offerVisibility) || '—'}
//                 </DetailRow>
//               </SectionCard>

//               <SectionCard title="Schedule Overview" icon={Calendar}>
//                 <DetailRow label="Start Time">
//                   {formatDateTime(auction.schedule?.startTime)}
//                 </DetailRow>
//                 <DetailRow label="End Time">{formatDateTime(auction.schedule?.endTime)}</DetailRow>
//               </SectionCard>
//             </div>
//           </div>
//         </TabsContent>

//         {/* TAB 2: UNIT & ITEMS */}
//         <TabsContent value="unit" className="outline-none">
//           <AuctionUnitSection auction={auction} />
//         </TabsContent>

//         {/* TAB 3: POLICIES */}
//         <TabsContent value="policies" className="space-y-4 outline-none">
//           <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
//             <div className="flex items-start justify-between px-5 py-4 bg-muted/30 border-b border-border gap-3">
//               <div className="flex items-start gap-3 min-w-0 flex-1">
//                 <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0">
//                   <Settings2 className="h-5 w-5" />
//                 </div>
//                 <div className="min-w-0 flex-1">
//                   <h3 className="text-sm font-bold text-foreground truncate">Policies</h3>
//                   <p className="text-xs text-muted-foreground">
//                     {totalPolicyCount} polic{totalPolicyCount !== 1 ? 'ies' : 'y'} configured
//                   </p>
//                 </div>
//               </div>
//               <Button
//                 variant="outline"
//                 size="sm"
//                 onClick={() => router.push(`/admin/auctions/${id}/edit`)}
//                 className="gap-1.5 text-xs rounded-xl shrink-0"
//               >
//                 <Pencil className="h-3.5 w-3.5" />
//                 Edit
//               </Button>
//             </div>

//             {policyEntries.length === 0 ? (
//               <div className="flex flex-col items-center justify-center text-center px-5 py-10 gap-3">
//                 <div className="p-3 rounded-full bg-muted text-muted-foreground">
//                   <ShieldCheck className="h-6 w-6" />
//                 </div>
//                 <div className="space-y-1">
//                   <p className="text-sm font-semibold text-foreground">No policies configured</p>
//                   <p className="text-xs text-muted-foreground max-w-sm">
//                     Add precondition, extension, and winner-determination rules so the auction knows how to run.
//                   </p>
//                 </div>
//                 <Button
//                   variant="outline"
//                   size="sm"
//                   onClick={() => router.push(`/admin/auctions/${id}/edit`)}
//                   className="gap-1.5 text-xs"
//                 >
//                   <Pencil className="h-3.5 w-3.5" />
//                   Configure policies
//                 </Button>
//               </div>
//             ) : (
//               <div className="p-5">
//                 <div className="relative space-y-4">
//                   <div className="absolute left-[9.5rem] top-0 bottom-0 w-0.5 bg-primary/20 pointer-events-none" />
//                   {policyStages.map((stage, idx) => (
//                     <div key={stage.id} className="relative flex items-start gap-4">
//                       {/* Time column */}
//                       <div className="w-32 shrink-0 text-right pt-3">
//                         {stage.dateLine ? (
//                           <p className="text-xs font-medium text-foreground/80 leading-tight">
//                             {stage.dateLine.includes('—')
//                               ? stage.dateLine.split('—')[1]?.trim()
//                               : stage.dateLine}
//                           </p>
//                         ) : (
//                           <p className="text-xs text-muted-foreground leading-tight italic">—</p>
//                         )}
//                       </div>
//                       {/* Dot */}
//                       <div
//                         className={`shrink-0 relative z-10 h-4 w-4 rounded-full ${stage.dotClassName} ring-4 ring-background mt-3.5`}
//                       />
//                       {/* Content card */}
//                       <div
//                         className={`flex-1 rounded-lg border-l-4 ${stage.dotClassName.replace('bg-', 'border-')} px-4 py-3 space-y-2 ${
//                           idx % 2 === 0 ? 'bg-muted/40 dark:bg-muted/20' : 'bg-background border border-border/60 border-l-4'
//                         }`}
//                       >
//                         <p className={`text-xs font-bold uppercase tracking-wider ${stage.textClassName}`}>
//                           {stage.label}
//                         </p>
//                         {stage.subLine && (
//                           <p className="text-xs text-muted-foreground">{stage.subLine}</p>
//                         )}
//                         {stage.groups.length > 0 && (
//                           <div className="space-y-3 pt-1">
//                             {/* Auction Running — render price-progression windows as a
//                                 compact nested timeline with their key data (value, steps,
//                                 duration), matching the other timelines in the view. */}
//                             {stage.id === 'auction-running' &&
//                               stage.groups
//                                 .filter(([key]) => key.toUpperCase() === 'PRICE_PROGRESSION')
//                                 .map(([key, items]) => {
//                                   const auctionStartMs = auction.schedule?.startTime
//                                     ? new Date(auction.schedule.startTime).getTime()
//                                     : null;
//                                   const auctionEndMs = auction.schedule?.endTime
//                                     ? new Date(auction.schedule.endTime).getTime()
//                                     : null;
//                                   let cum = 0;
//                                   return (
//                                     <div key={key} className="relative space-y-3">
//                                       <div className="absolute left-[9.5rem] top-0 bottom-0 w-0.5 bg-primary/20 pointer-events-none" />
//                                       {items.flatMap((wrapper, wi) =>
//                                         (wrapper.policies ?? []).map((child, ci) => {
//                                           const color = WINDOW_COLORS[ci % WINDOW_COLORS.length]!;
//                                           const isLast = ci === (wrapper.policies?.length ?? 0) - 1;
//                                           const dur = parseIsoDurationMs(child.windowDuration);
//                                           const fromMs = auctionStartMs != null ? auctionStartMs + cum : null;
//                                           const toMs =
//                                             fromMs != null && auctionEndMs != null
//                                               ? isLast || dur === 0
//                                                 ? auctionEndMs
//                                                 : fromMs + dur
//                                               : null;
//                                           cum += dur;
//                                           return (
//                                             <div key={`${wi}-${ci}`} className="relative flex items-start gap-4">
//                                               {/* Time column */}
//                                               <div className="w-32 shrink-0 text-right pt-3 space-y-0.5">
//                                                 {fromMs != null ? (
//                                                   <>
//                                                     <p className="text-xs font-medium text-foreground/80 leading-tight">
//                                                       {formatDateTime(new Date(fromMs).toISOString())}
//                                                     </p>
//                                                     {toMs != null && (
//                                                       <>
//                                                         <p className="text-[10px] text-muted-foreground leading-none">↓</p>
//                                                         <p className="text-xs font-medium text-foreground/80 leading-tight">
//                                                           {formatDateTime(new Date(toMs).toISOString())}
//                                                         </p>
//                                                       </>
//                                                     )}
//                                                   </>
//                                                 ) : (
//                                                   <p className="text-xs text-muted-foreground leading-tight italic">—</p>
//                                                 )}
//                                               </div>
//                                               {/* Dot */}
//                                               <div
//                                                 className={`shrink-0 relative z-10 h-3 w-3 rounded-full ${color.dot} ring-4 ring-background mt-3.5`}
//                                               />
//                                               {/* Content card */}
//                                               <div
//                                                 className={`flex-1 rounded-lg border-l-4 ${color.dot.replace('bg-', 'border-')} border-border/60 bg-background px-3 py-2 space-y-1`}
//                                               >
//                                                 <div className="flex items-center gap-2">
//                                                   <span className="text-xs font-semibold text-foreground">
//                                                     {child.name || fmtLabel(child.type) || 'Price change'}
//                                                   </span>
//                                                   {child.type && (
//                                                     <span className="text-[10px] text-muted-foreground font-normal">
//                                                       {fmtLabel(child.type)}
//                                                     </span>
//                                                   )}
//                                                 </div>
//                                                 {(child.value != null ||
//                                                   (child.steps?.length ?? 0) > 0 ||
//                                                   child.windowDuration) && (
//                                                   <div className="flex flex-wrap gap-1.5">
//                                                     {child.value != null && (
//                                                       <span className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-muted/30 px-1.5 py-0.5 text-[10px] text-foreground">
//                                                         <span className="font-medium">Value:</span>
//                                                         <span>{child.value}</span>
//                                                       </span>
//                                                     )}
//                                                     {(child.steps?.length ?? 0) > 0 && (
//                                                       <span className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-muted/30 px-1.5 py-0.5 text-[10px] text-foreground">
//                                                         <span className="font-medium">Steps:</span>
//                                                         <span>{(child.steps ?? []).join(', ')}</span>
//                                                       </span>
//                                                     )}
//                                                     {child.windowDuration && (
//                                                       <span className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-muted/30 px-1.5 py-0.5 text-[10px] text-muted-foreground">
//                                                         {isLast
//                                                           ? 'Until close'
//                                                           : `${humanizeIsoDuration(dur)} window`}
//                                                       </span>
//                                                     )}
//                                                   </div>
//                                                 )}
//                                               </div>
//                                             </div>
//                                           );
//                                         }),
//                                       )}
//                                     </div>
//                                   );
//                                 })}
//                             {/* Remaining policies in the stage render as chips; for the
//                                 "Before Auction Start" stage show the minimum participants
//                                 count (e.g. "5") alongside the policy name. */}
//                             {stage.groups.some(
//                               ([key]) =>
//                                 stage.id !== 'auction-running' ||
//                                 key.toUpperCase() !== 'PRICE_PROGRESSION',
//                             ) && (
//                               <div className="flex flex-wrap gap-2">
//                                 {stage.groups
//                                   .filter(
//                                     ([key]) =>
//                                       stage.id !== 'auction-running' ||
//                                       key.toUpperCase() !== 'PRICE_PROGRESSION',
//                                   )
//                                   .flatMap(([, items]) =>
//                                     items.map((item) => (
//                                       <span
//                                         key={item.id ?? item.name}
//                                         className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-background px-2.5 py-1 text-xs font-medium text-foreground"
//                                       >
//                                         {item.name || fmtLabel(item.type)}
//                                         {item.type && (
//                                           <span className="text-[10px] text-muted-foreground font-normal">
//                                             {fmtLabel(item.type)}
//                                           </span>
//                                         )}
//                                         {item.count != null && (
//                                           <span className="text-[11px] font-bold text-foreground">
//                                             {item.count}
//                                           </span>
//                                         )}
//                                       </span>
//                                     )),
//                                   )}
//                               </div>
//                             )}
//                           </div>
//                         )}
//                       </div>
//                     </div>
//                   ))}
//                 </div>
//               </div>
//             )}
//           </div>
//         </TabsContent>

//         {/* TAB 4: WORKFLOW */}
//         <TabsContent value="timeline" className="outline-none">
//           <Card className="rounded-2xl border-border bg-card shadow-xs">
//             <CardHeader className="border-b border-border bg-muted/30 p-5">
//               <CardTitle className="text-base font-bold flex items-center gap-2.5">
//                 <GitFork className="h-5 w-5 text-primary" />
//                 <span>Workflow</span>
//               </CardTitle>
//             </CardHeader>
//             <CardContent className="p-6">
//               {workflowNodes.length === 0 ? (
//                 <div className="flex flex-col items-center justify-center text-center py-6 gap-3">
//                   <div className="p-3 rounded-full bg-muted text-muted-foreground">
//                     <GitFork className="h-6 w-6" />
//                   </div>
//                   <div className="space-y-1">
//                     <p className="text-sm font-semibold text-foreground">No workflow steps</p>
//                     <p className="text-xs text-muted-foreground max-w-sm">
//                       This auction doesn&apos;t have any workflow steps configured yet.
//                     </p>
//                   </div>
//                   <Button
//                     variant="outline"
//                     size="sm"
//                     onClick={() => router.push(`/admin/auctions/${id}/edit`)}
//                     className="gap-1.5 text-xs"
//                   >
//                     <Pencil className="h-3.5 w-3.5" />
//                     Configure workflow
//                   </Button>
//                 </div>
//               ) : (
//                 <div className="relative space-y-4">
//                   <div className="absolute left-[9.5rem] top-0 bottom-0 w-0.5 bg-primary/20 pointer-events-none" />
//                   {workflowNodes.map((node, idx) => (
//                     <div key={node.id} className="relative flex items-start gap-4">
//                       {/* Time / order column */}
//                       <div className="w-32 shrink-0 text-right pt-3 space-y-0.5">
//                         {node.time ? (
//                           <>
//                             <p className="text-xs font-medium text-foreground/80 leading-tight">{node.time}</p>
//                             {node.timeTo && (
//                               <>
//                                 <p className="text-[10px] text-muted-foreground leading-none">↓</p>
//                                 <p className="text-xs font-medium text-foreground/80 leading-tight">{node.timeTo}</p>
//                               </>
//                             )}
//                           </>
//                         ) : (
//                           <p className="text-xs text-muted-foreground leading-tight italic">step {idx + 1}</p>
//                         )}
//                       </div>
//                       {/* Dot */}
//                       <div
//                         className={`shrink-0 relative z-10 h-4 w-4 rounded-full ${node.dotClass} ring-4 ring-background mt-3.5`}
//                       />
//                       {/* Content card */}
//                       <div
//                         className={`flex-1 rounded-lg border-l-4 ${node.borderClass} px-4 py-3 space-y-1 ${
//                           idx % 2 === 0 ? 'bg-muted/40 dark:bg-muted/20' : 'bg-background border border-border/60 border-l-4'
//                         }`}
//                       >
//                         <p className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${node.labelClass}`}>
//                           <node.Icon className="h-3 w-3" />
//                           {node.label}
//                         </p>
//                         <p className="text-sm font-semibold text-foreground">{node.title}</p>
//                         {node.subs.map((sub, i) => (
//                           <p key={i} className="text-xs text-muted-foreground">{sub}</p>
//                         ))}
//                       </div>
//                     </div>
//                   ))}
//                 </div>
//               )}
//             </CardContent>
//           </Card>
//         </TabsContent>
//       </Tabs>
//     </div>
//   );
// }

'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  auctionsApi,
  AuctionVM,
  PolicyItemRQ,
  AuctionPoliciesRQ,
  PolicyEvaluationMap,
  AuctionWorkflowStep,
} from '@repo/api';
import { AuctionUnitSection } from '../../_components/AuctionUnitSection';
import {
  groupPoliciesByCategory,
  buildEvaluationsByPolicy,
  parseIsoDurationMs,
  humanizeIsoDuration,
  fmtLabel,
} from '../../_components/PolicyShared';
import {
  ArrowLeft,
  Pencil,
  Calendar,
  DollarSign,
  IndianRupee,
  Settings2,
  Layers,
  AlertCircle,
  Info,
  Copy,
  Check,
  Clock,
  ShieldCheck,
  Sparkles,
  ChevronRight,
  TrendingUp,
  Users,
  CreditCard,
  GitFork,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import {
  Button,
  Badge,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Card,
  CardContent,
  toast,
} from '@repo/ui';
import { StatusBadge } from '@/components/common/admin/AuctionStatusBadge';
import { formatDateTime, formatLabel, resolveStr } from '@/components/common/admin/format';
import { DetailRow, PageLoading, SectionCard } from '@/components/common/admin/SectionCard';
import ConfirmDialog from '@/components/common/admin/ConfirmDialog';

// ── Timeline Components ───────────────────────────────────────────────────────
import { PoliciesTimeline } from './../../_components/timeline/PoliciesTimeline';
import { WorkflowStagesTimeline } from './../../_components/timeline/WorkflowStagesTimeline';
import { TimelineNode } from './../../_components/timeline/types';
import {
  stepTypeMeta,
  PaymentStepDetails,
  BankDetailStepDetails,
  ParticipationFormStepDetails,
  TnCStepDetails,
  FormStepDetails,
} from './../../_components/WorkflowStepDetails';
import { AuctionParticipantsTab } from './../../_components/AuctionParticipantsTab';

// ── Timeline model ────────────────────────────────────────────────────────────

const WINDOW_COLORS = [
  { dot: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400' },
  { dot: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400' },
  { dot: 'bg-blue-500', text: 'text-blue-600 dark:text-blue-400' },
  { dot: 'bg-indigo-500', text: 'text-indigo-600 dark:text-indigo-400' },
  { dot: 'bg-violet-500', text: 'text-violet-600 dark:text-violet-400' },
  { dot: 'bg-rose-500', text: 'text-rose-600 dark:text-rose-400' },
];

const PARTICIPATION_STEP_TYPES = [
  'FORM_STEP',
  'TNC_FORM_STEP',
  'BANK_DETAIL_FORM_STEP',
  'PARTICIPATION_FORM_STEP',
];

function headsSummary(heads?: AuctionWorkflowStep['heads']): string {
  return (heads ?? [])
    .map((head) => {
      const amount =
        resolveStr(head.basis) === 'PERCENTAGE_BASED'
          ? `${head.value}%`
          : `₹${head.value?.toLocaleString() ?? head.value}`;
      return `${head.name} ${amount}${head.refundable ? ' (refundable)' : ''}`;
    })
    .join(', ');
}

function buildScheduleTimeline(
  auction: AuctionVM,
  policies: AuctionPoliciesRQ | null,
  workflow: AuctionWorkflowStep[],
): TimelineNode[] {
  const nodes: TimelineNode[] = [];
  const startIso = auction.schedule?.startTime ?? auction.startTime;
  const endIso = auction.schedule?.endTime ?? auction.endTime;
  const startMs = startIso ? new Date(startIso).getTime() : null;
  const endMs = endIso ? new Date(endIso).getTime() : null;

  // Pre-payment deadlines
  let prePayOrder = 0;
  workflow
    .filter(
      (step) =>
        resolveStr(step.type) === 'PAYMENT_STEP' &&
        (resolveStr(step.phase) === 'PRE_AUCTION' || step.prePayment === true),
    )
    .forEach((step) => {
      prePayOrder += 1;
      const off = parseIsoDurationMs(step.offset);
      const heads = headsSummary(step.heads);
      nodes.push({
        id: `prepay-${step.id}`,
        label: 'Pre-Payment Due',
        Icon: CreditCard,
        dotClass: 'bg-rose-500',
        labelClass: 'text-rose-600 dark:text-rose-400',
        borderClass: 'border-rose-500',
        title: `Pre Payment ${prePayOrder}`,
        time: startMs != null ? formatDateTime(new Date(startMs - off).toISOString()) : undefined,
        subs: [
          startMs != null
            ? `Must be completed ${humanizeIsoDuration(off)} before bidding opens.`
            : `Due ${humanizeIsoDuration(off)} before bidding opens (start not scheduled yet).`,
          heads && `Heads: ${heads}`,
        ].filter((s): s is string => Boolean(s)),
      });
    });

  // Participant validation
  (policies ?? [])
    .filter(
      (policy) =>
        resolveStr(policy.phase) === 'PARTICIPATION' &&
        (policy.preStartValidationDuration || policy.count != null),
    )
    .forEach((policy) => {
      const dur = parseIsoDurationMs(policy.preStartValidationDuration);
      nodes.push({
        id: `validate-${policy.id ?? policy.order ?? policy.name}`,
        label: 'Participant Validation',
        Icon: Users,
        dotClass: 'bg-amber-500',
        labelClass: 'text-amber-600 dark:text-amber-400',
        borderClass: 'border-amber-500',
        title: policy.name || fmtLabel(policy.type) || 'Validation',
        time:
          startMs != null && dur > 0
            ? formatDateTime(new Date(startMs - dur).toISOString())
            : undefined,
        subs: [
          policy.count != null
            ? `Requires at least ${policy.count} participants, otherwise the auction is cancelled.`
            : '',
          dur > 0 ? `Checked ${humanizeIsoDuration(dur)} before the start time.` : '',
        ].filter((s): s is string => Boolean(s)),
      });
    });

  if (startIso) {
    const participationSteps = workflow.filter((step) =>
      PARTICIPATION_STEP_TYPES.includes(resolveStr(step.type)),
    );
    nodes.push({
      id: 'start',
      label: 'Auction Opens',
      Icon: Calendar,
      dotClass: 'bg-emerald-500',
      labelClass: 'text-emerald-600 dark:text-emerald-400',
      borderClass: 'border-emerald-500',
      title: 'Bidding opens',
      time: formatDateTime(startIso),
      subs: [
        participationSteps.length > 0
          ? `Participation flow: ${participationSteps.map((step) => step.name).join(' → ')}`
          : '',
      ].filter(Boolean),
    });
  }

  // Price progression windows
  let windowNo = 0;
  (policies ?? [])
    .filter((policy) => resolveStr(policy.type) === 'PRICE_PROGRESSION_POLICY')
    .forEach((wrapper) => {
      const children = [...(wrapper.policies ?? [])].sort(
        (a, b) => (a.order ?? 0) - (b.order ?? 0),
      );
      let cum = 0;
      children.forEach((child, i) => {
        const color = WINDOW_COLORS[windowNo % WINDOW_COLORS.length]!;
        windowNo += 1;
        const dur = parseIsoDurationMs(child.windowDuration);
        const runsTillEnd = i === children.length - 1 || dur === 0;
        const fromMs = startMs != null ? startMs + cum : null;
        const toMs = fromMs != null && endMs != null ? (runsTillEnd ? endMs : fromMs + dur) : null;
        nodes.push({
          id: `window-${child.id ?? `${wrapper.id}-${i}`}`,
          label: 'Price Window',
          Icon: TrendingUp,
          dotClass: color.dot,
          labelClass: color.text,
          borderClass: color.dot.replace('bg-', 'border-'),
          title: child.name || fmtLabel(child.type) || 'Price change',
          time: fromMs != null ? formatDateTime(new Date(fromMs).toISOString()) : undefined,
          timeTo: toMs != null ? formatDateTime(new Date(toMs).toISOString()) : undefined,
          subs: [
            fromMs == null
              ? runsTillEnd
                ? `Applies from ${humanizeIsoDuration(cum)} after start until close.`
                : `Applies between ${humanizeIsoDuration(cum)} and ${humanizeIsoDuration(cum + dur)} after start.`
              : '',
            child.value != null
              ? `Bid step of ₹${child.value.toLocaleString()} with multiplier${
                  (child.steps?.length ?? 0) > 1 ? 's' : ''
                } ${(child.steps ?? []).join(', ')}.`
              : '',
          ].filter((s): s is string => Boolean(s)),
        });
        cum += dur;
      });
    });

  if (endIso) {
    const ext = (policies ?? []).find((policy) => resolveStr(policy.type) === 'EXTENSION_POLICY');
    nodes.push({
      id: 'end',
      label: 'Auction Closes',
      Icon: Clock,
      dotClass: 'bg-indigo-500',
      labelClass: 'text-indigo-600 dark:text-indigo-400',
      borderClass: 'border-indigo-500',
      title: 'Bidding closes',
      time: formatDateTime(endIso),
      subs: [
        ext
          ? `Late bids extend the close by ${humanizeIsoDuration(parseIsoDurationMs(ext.duration))}${
              (ext.limit ?? 0) > 0 ? `, up to ${ext.limit} extensions` : ' (unlimited extensions)'
            }.`
          : '',
        'Winner determination applies once bidding closes.',
      ].filter(Boolean),
    });

    // Post-payment
    let postPayOrder = 0;
    workflow
      .filter(
        (step) =>
          resolveStr(step.type) === 'PAYMENT_STEP' &&
          (resolveStr(step.phase) === 'POST_AUCTION' || step.postPayment === true),
      )
      .forEach((step) => {
        postPayOrder += 1;
        const off = parseIsoDurationMs(step.offset);
        const heads = headsSummary(step.heads);
        nodes.push({
          id: `postpay-${step.id}`,
          label: 'Post-Payment Due',
          Icon: CreditCard,
          dotClass: 'bg-violet-500',
          labelClass: 'text-violet-600 dark:text-violet-400',
          borderClass: 'border-violet-500',
          title: `Post Payment ${postPayOrder}`,
          time: formatDateTime(new Date(endMs! + off).toISOString()),
          subs: [
            `Must be settled within ${humanizeIsoDuration(off)} after the auction closes.`,
            heads && `Heads: ${heads}`,
          ].filter((s): s is string => Boolean(s)),
        });
      });
  }

  return nodes;
}

// ── Workflow timeline ─────────────────────────────────────────────────────────

/** TNC_FORM_STEP and PARTICIPATION_FORM_STEP are hardcoded PRE_AUCTION server-side
 *  and never carry an explicit `phase`; Bank Detail steps don't carry one either
 *  but are always collected before the auction closes. Everything else (Payment,
 *  Custom Form) now carries an explicit PRE_AUCTION/POST_AUCTION phase. */
function effectiveStepPhase(step: AuctionWorkflowStep): 'PRE_AUCTION' | 'POST_AUCTION' {
  return resolveStr(step.phase) === 'POST_AUCTION' ? 'POST_AUCTION' : 'PRE_AUCTION';
}

/** Reuses the same per-step-type detail body the workflow builder's cards render,
 *  so the read-only view and the editable builder never drift apart. */
function stepDetails(step: AuctionWorkflowStep): ReactNode {
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

function buildWorkflowTimeline(
  workflow: AuctionWorkflowStep[],
  startIso?: string,
  endIso?: string,
): TimelineNode[] {
  const startMs = startIso ? new Date(startIso).getTime() : null;
  const endMs = endIso ? new Date(endIso).getTime() : null;

  // Track separate counters for pre/post payment steps for naming
  let prePaySeq = 0;
  let postPaySeq = 0;

  return [...workflow]
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((step): TimelineNode => {
      const typeStr = resolveStr(step.type);
      const { Icon, dot, text, border } = stepTypeMeta(typeStr);
      const phase = effectiveStepPhase(step);
      const label = fmtLabel(typeStr) || 'Step';

      // Payment steps get deterministic names ignoring whatever name the backend stored
      let title: string;
      if (typeStr === 'PAYMENT_STEP') {
        if (phase === 'PRE_AUCTION') {
          prePaySeq += 1;
          title = `Pre Payment ${prePaySeq}`;
        } else {
          postPaySeq += 1;
          title = `Post Payment ${postPaySeq}`;
        }
      } else {
        title = step.name || label;
      }

      let time: string | undefined;
      let timeTo: string | undefined;

      if (typeStr === 'PAYMENT_STEP' && step.offset) {
        const off = parseIsoDurationMs(step.offset);
        if (phase === 'PRE_AUCTION' && startMs != null) {
          time = formatDateTime(new Date(startMs - off).toISOString());
        } else if (phase === 'POST_AUCTION' && endMs != null) {
          time = formatDateTime(new Date(endMs + off).toISOString());
        }
      }

      if (typeStr === 'PARTICIPATION_FORM_STEP' && step.preStartDeadlineDuration) {
        const dur = parseIsoDurationMs(step.preStartDeadlineDuration);
        if (startMs != null && dur > 0) {
          time = formatDateTime(new Date(startMs - dur).toISOString());
          timeTo = startIso ? formatDateTime(startIso) : undefined;
        }
      }

      // Payment steps have no free-text description shown
      const subs: string[] = [];
      if (typeStr !== 'PAYMENT_STEP' && step.description) subs.push(step.description);

      return {
        id: step.id ?? `step-${step.order}`,
        label,
        Icon,
        dotClass: dot,
        labelClass: text,
        borderClass: border,
        title,
        time,
        timeTo,
        subs,
        details: stepDetails(step),
      };
    });
}

// ── Main Auction View Page ─────────────────────────────────────────────────────

export default function AuctionViewPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [reloadingPolicies, setReloadingPolicies] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [auction, setAuction] = useState<AuctionVM | null>(null);
  const [policies, setPolicies] = useState<AuctionPoliciesRQ | null>(null);
  const [workflow, setWorkflow] = useState<AuctionWorkflowStep[]>([]);
  const [evaluationsByPolicyId, setEvaluationsByPolicyId] = useState<
    Record<string, PolicyEvaluationMap>
  >({});
  const [evaluationsEvaluatedAt, setEvaluationsEvaluatedAt] = useState<Date | null>(null);

  // Delete-all state
  const [confirmDeletePolicies, setConfirmDeletePolicies] = useState(false);
  const [confirmDeleteWorkflow, setConfirmDeleteWorkflow] = useState(false);
  const [deletingPolicies, setDeletingPolicies] = useState(false);
  const [deletingWorkflow, setDeletingWorkflow] = useState(false);

  const fetchEvaluations = useCallback(
    async (items: AuctionPoliciesRQ | null) => {
      if (!items) return;
      const policyIds = Array.from(
        new Set(items.map((p) => p.id).filter((policyId): policyId is string => Boolean(policyId))),
      );
      if (policyIds.length === 0) {
        setEvaluationsByPolicyId({});
        setEvaluationsEvaluatedAt(new Date());
        return;
      }
      const evaluations = await auctionsApi
        .evaluateAuctionPolicies(id, policyIds)
        .catch(() => null);
      setEvaluationsByPolicyId(buildEvaluationsByPolicy(evaluations, items));
      setEvaluationsEvaluatedAt(new Date());
    },
    [id],
  );

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      auctionsApi.getAuctionById(id, ['*']),
      auctionsApi.getAuctionPolicies(id).catch(() => null),
      auctionsApi.getAuctionWorkflow(id).catch(() => [] as AuctionWorkflowStep[]),
    ])
      .then(([a, pol, wf]) => {
        if (cancelled) return;
        setAuction(a);
        setPolicies(pol);
        setWorkflow(wf ?? []);
        const status = resolveStr(a.status);
        const live = status === 'SCHEDULED' || status === 'PUBLISHED' || status === 'LIVE';
        if (live) {
          return fetchEvaluations(pol);
        }
        return null;
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, fetchEvaluations]);

  const handleRefreshPolicies = async () => {
    setReloadingPolicies(true);
    try {
      const pol = await auctionsApi.getAuctionPolicies(id).catch(() => null);
      setPolicies(pol);
      await fetchEvaluations(pol);
      toast?.success?.('Policies re-evaluated successfully');
    } catch {
      toast?.error?.('Failed to re-evaluate policies');
    } finally {
      setReloadingPolicies(false);
    }
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    if (value === 'policies' && !evaluationsEvaluatedAt && !reloadingPolicies) {
      setReloadingPolicies(true);
      fetchEvaluations(policies).finally(() => setReloadingPolicies(false));
    }
  };

  const handleCopyId = () => {
    if (id) {
      navigator.clipboard.writeText(id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast?.success?.('Auction ID copied to clipboard');
    }
  };

  const handleDeleteAllPolicies = async () => {
    setDeletingPolicies(true);
    setConfirmDeletePolicies(false);
    try {
      await auctionsApi.deleteAuctionPolicies(id);
      setPolicies([]);
      setEvaluationsByPolicyId({});
      toast?.success?.('All policies deleted');
    } catch {
      toast?.error?.('Failed to delete policies');
    } finally {
      setDeletingPolicies(false);
    }
  };

  const handleDeleteWorkflow = async () => {
    setDeletingWorkflow(true);
    setConfirmDeleteWorkflow(false);
    try {
      await auctionsApi.deleteWorkflow(id);
      setWorkflow([]);
      toast?.success?.('Workflow deleted');
    } catch {
      toast?.error?.('Failed to delete workflow');
    } finally {
      setDeletingWorkflow(false);
    }
  };

  if (loading) {
    return <PageLoading message="Loading auction details..." />;
  }

  if (!auction) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="p-4 rounded-full bg-rose-500/10 text-rose-500">
          <AlertCircle className="h-10 w-10" />
        </div>
        <p className="text-base font-semibold text-foreground">Auction not found</p>
        <p className="text-sm text-muted-foreground max-w-sm text-center">
          The requested auction ID could not be found or you may not have authorization to view it.
        </p>
        <Button variant="outline" size="sm" onClick={() => router.push('/admin/auctions')}>
          <ArrowLeft className="h-4 w-4 mr-1.5" />
          Back to Auctions
        </Button>
      </div>
    );
  }

  const format = formatLabel(auction.format);
  const auctionType = formatLabel(auction.type);

  const policyEntries: [string, PolicyItemRQ[]][] = groupPoliciesByCategory(policies ?? []);
  const totalPolicyCount = policyEntries.reduce((sum, [, items]) => sum + items.length, 0);

  const byUpperKey =
    (keys: string[]) =>
    ([key]: [string, PolicyItemRQ[]]) =>
      keys.includes(key.toUpperCase());

  const beforeStartGroups = policyEntries.filter(byUpperKey(['PARTICIPATION', 'PRECONDITION']));
  const auctionRunningGroups = policyEntries.filter(byUpperKey(['EXTENSION', 'PRICE_PROGRESSION']));
  const winnerGroups = policyEntries.filter(
    byUpperKey(['WINNER_DETERMINATION', 'WINNER_PRICE_DETERMINATION']),
  );

  const placedKeys = new Set(
    [...beforeStartGroups, ...auctionRunningGroups, ...winnerGroups].map(([key]) => key),
  );
  const otherGroups = policyEntries.filter(([key]) => !placedKeys.has(key));

  interface PolicyStage {
    id: string;
    label: string;
    dotClassName: string;
    textClassName: string;
    dateLine?: string;
    subLine?: string;
    groups: [string, PolicyItemRQ[]][];
  }

  const policyStages: PolicyStage[] = [];

  if (beforeStartGroups.length > 0) {
    const startMs = auction.schedule?.startTime
      ? new Date(auction.schedule.startTime).getTime()
      : null;
    const maxDur = beforeStartGroups
      .flatMap(([, items]) => items)
      .reduce((max, p) => {
        const d = parseIsoDurationMs(p.preStartValidationDuration);
        return d > max ? d : max;
      }, 0);
    const beforeStartCutoff =
      startMs != null && maxDur > 0
        ? formatDateTime(new Date(startMs - maxDur).toISOString())
        : undefined;
    policyStages.push({
      id: 'before-start',
      label: 'Before Auction Start',
      dotClassName: 'bg-teal-500',
      textClassName: 'text-teal-600 dark:text-teal-400',
      dateLine: beforeStartCutoff,
      subLine:
        'Preconditions that must be met ahead of the auction opening (e.g. minimum participants).',
      groups: beforeStartGroups,
    });
  }

  if (auction.schedule?.startTime || auctionRunningGroups.length > 0) {
    policyStages.push({
      id: 'auction-start',
      label: 'Auction Start',
      dotClassName: 'bg-emerald-500',
      textClassName: 'text-emerald-600 dark:text-emerald-400',
      dateLine: auction.schedule?.startTime
        ? `Auction opens — ${formatDateTime(auction.schedule.startTime)}`
        : undefined,
      groups: [],
    });
  }

  if (auctionRunningGroups.length > 0) {
    policyStages.push({
      id: 'auction-running',
      label: 'Auction Running',
      dotClassName: 'bg-blue-500',
      textClassName: 'text-blue-600 dark:text-blue-400',
      subLine: 'Extension and price-progression rules apply while bidding is open.',
      groups: auctionRunningGroups,
    });
  }

  if (auction.schedule?.endTime) {
    policyStages.push({
      id: 'auction-complete',
      label: 'Auction Complete',
      dotClassName: 'bg-indigo-500',
      textClassName: 'text-indigo-600 dark:text-indigo-400',
      dateLine: `Auction closes — ${formatDateTime(auction.schedule.endTime)}`,
      groups: [],
    });
  }

  if (winnerGroups.length > 0) {
    policyStages.push({
      id: 'winner',
      label: 'Winner',
      dotClassName: 'bg-violet-500',
      textClassName: 'text-violet-600 dark:text-violet-400',
      groups: winnerGroups,
    });
  }

  if (otherGroups.length > 0) {
    policyStages.push({
      id: 'other',
      label: 'Other Policies',
      dotClassName: 'bg-muted-foreground',
      textClassName: 'text-muted-foreground',
      groups: otherGroups,
    });
  }

  const workflowStartIso = auction.schedule?.startTime ?? auction.startTime;
  const workflowEndIso = auction.schedule?.endTime ?? auction.endTime;
  const preAuctionWorkflowNodes = buildWorkflowTimeline(
    workflow.filter((s) => effectiveStepPhase(s) === 'PRE_AUCTION'),
    workflowStartIso,
    workflowEndIso,
  );
  const postAuctionWorkflowNodes = buildWorkflowTimeline(
    workflow.filter((s) => effectiveStepPhase(s) === 'POST_AUCTION'),
    workflowStartIso,
    workflowEndIso,
  );

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto">
      {/* Top Banner Header */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5 flex-wrap">
              <StatusBadge value={auction.status} />
              {auction.referenceId && (
                <Badge variant="outline" className="font-mono text-xs">
                  Ref: {auction.referenceId}
                </Badge>
              )}
              {auctionType && (
                <Badge variant="secondary" className="text-xs">
                  {auctionType}
                </Badge>
              )}
            </div>
            <h1 className="text-2xl font-extrabold text-foreground tracking-tight">
              {auction.title}
            </h1>
            <p className="text-sm text-muted-foreground line-clamp-2 max-w-3xl">
              {auction.description || 'No description provided for this auction.'}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyId}
              className="gap-1.5 text-xs rounded-xl"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-emerald-500" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
              <span>{copied ? 'Copied' : 'Copy ID'}</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/admin/auctions')}
              className="gap-1.5 text-xs rounded-xl"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back</span>
            </Button>
            <Button
              size="sm"
              onClick={() => router.push(`/admin/auctions/${id}/edit`)}
              className="gap-1.5 text-xs rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Pencil className="h-3.5 w-3.5" />
              <span>Edit Auction</span>
            </Button>
          </div>
        </div>

        {auction.schedule?.startTime && (
          <div className="flex items-center gap-2 pt-3 border-t border-border/40 text-xs font-medium text-muted-foreground">
            <Calendar className="h-4 w-4 text-primary shrink-0" />
            <span>
              Start:{' '}
              <strong className="text-foreground">
                {formatDateTime(auction.schedule.startTime)}
              </strong>
            </span>
            {auction.schedule.endTime && (
              <>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60" />
                <span>
                  End:{' '}
                  <strong className="text-foreground">
                    {formatDateTime(auction.schedule.endTime)}
                  </strong>
                </span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Metric KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="rounded-2xl border-border bg-card shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-xs text-muted-foreground font-medium">Opening Price</p>
              <p className="text-lg font-bold text-foreground">
                {auction.unit?.openingPrice != null ? (
                  <>
                    {resolveStr(auction.monetaryOptions?.currencyUnit)}{' '}
                    {auction.unit.openingPrice.toLocaleString()}
                  </>
                ) : (
                  '—'
                )}
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600">
              <IndianRupee className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border bg-card shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-xs text-muted-foreground font-medium">Direction</p>
              <p className="text-sm font-bold text-foreground">
                {formatLabel(auction.protocol?.direction) || '—'}
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600">
              <TrendingUp className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border bg-card shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-xs text-muted-foreground font-medium">Format</p>
              <p className="text-sm font-bold text-foreground truncate max-w-[110px]">
                {format || '—'}
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-violet-500/10 text-violet-600">
              <Sparkles className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border bg-card shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-xs text-muted-foreground font-medium">Configured Policies</p>
              <p className="text-lg font-bold text-foreground">{totalPolicyCount}</p>
            </div>
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600">
              <ShieldCheck className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabbed Interface */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5 rounded-xl p-1 bg-muted/60">
          <TabsTrigger value="overview" className="rounded-lg text-xs font-semibold gap-2 py-2">
            <Info className="h-3.5 w-3.5" />
            <span>Overview</span>
          </TabsTrigger>
          <TabsTrigger value="unit" className="rounded-lg text-xs font-semibold gap-2 py-2">
            <Layers className="h-3.5 w-3.5" />
            <span>Unit & Items</span>
          </TabsTrigger>
          <TabsTrigger value="policies" className="rounded-lg text-xs font-semibold gap-2 py-2">
            <Settings2 className="h-3.5 w-3.5" />
            <span>Policies ({totalPolicyCount})</span>
          </TabsTrigger>
          <TabsTrigger value="timeline" className="rounded-lg text-xs font-semibold gap-2 py-2">
            <GitFork className="h-3.5 w-3.5" />
            <span>Workflow</span>
          </TabsTrigger>
          <TabsTrigger value="invitations" className="rounded-lg text-xs font-semibold gap-2 py-2">
            <Users className="h-3.5 w-3.5" />
            <span>Invitations</span>
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: OVERVIEW */}
        <TabsContent value="overview" className="space-y-6 outline-none">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-6">
              <SectionCard title="Basic Information" icon={Info}>
                <DetailRow label="Auction Title">{auction.title || '—'}</DetailRow>
                <DetailRow label="Description">{auction.description || '—'}</DetailRow>
                <DetailRow label="Reference ID">
                  {auction.referenceId ? (
                    <Badge variant="outline" className="font-mono text-xs">
                      {auction.referenceId}
                    </Badge>
                  ) : (
                    '—'
                  )}
                </DetailRow>
                <DetailRow label="Auction Type">
                  {auctionType ? (
                    <Badge variant="secondary" className="text-xs font-semibold">
                      {auctionType}
                    </Badge>
                  ) : (
                    '—'
                  )}
                </DetailRow>
                <DetailRow label="Format">{format || '—'}</DetailRow>
                <DetailRow label="Status">
                  <StatusBadge value={auction.status} />
                </DetailRow>
              </SectionCard>

              <SectionCard title="Monetary Options" icon={DollarSign}>
                <DetailRow label="Currency Unit">
                  <span className="font-mono font-bold text-foreground">
                    {resolveStr(auction.monetaryOptions?.currencyUnit) || '—'}
                  </span>
                </DetailRow>
                <DetailRow label="Precision">
                  {auction.monetaryOptions?.precision != null
                    ? `${auction.monetaryOptions.precision} decimal places`
                    : '—'}
                </DetailRow>
                <DetailRow label="Rounding Mode">
                  {formatLabel(auction.monetaryOptions?.roundingMode) || '—'}
                </DetailRow>
              </SectionCard>
            </div>

            <div className="space-y-6">
              <SectionCard title="Protocol Settings" icon={Settings2}>
                <DetailRow label="Accessibility">
                  <Badge
                    variant="outline"
                    className={`text-xs font-medium ${
                      resolveStr(auction.protocol?.accessibility) === 'PUBLIC'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-violet-500 text-violet-600'
                    }`}
                  >
                    {formatLabel(auction.protocol?.accessibility) || '—'}
                  </Badge>
                </DetailRow>
                <DetailRow label="Direction">
                  <Badge
                    variant="outline"
                    className={`text-xs font-medium ${
                      resolveStr(auction.protocol?.direction) === 'FORWARD'
                        ? 'border-emerald-500 text-emerald-600'
                        : 'border-amber-500 text-amber-600'
                    }`}
                  >
                    {formatLabel(auction.protocol?.direction) || '—'}
                  </Badge>
                </DetailRow>
                <DetailRow label="Dimension">
                  {formatLabel(auction.protocol?.dimension) || '—'}
                </DetailRow>
                <DetailRow label="Participant Visibility">
                  {formatLabel(auction.protocol?.participantVisibility) || '—'}
                </DetailRow>
                <DetailRow label="Offer Visibility">
                  {formatLabel(auction.protocol?.offerVisibility) || '—'}
                </DetailRow>
              </SectionCard>

              <SectionCard title="Schedule Overview" icon={Calendar}>
                <DetailRow label="Start Time">
                  {formatDateTime(auction.schedule?.startTime)}
                </DetailRow>
                <DetailRow label="End Time">{formatDateTime(auction.schedule?.endTime)}</DetailRow>
              </SectionCard>
            </div>
          </div>
        </TabsContent>

        {/* TAB 2: UNIT & ITEMS */}
        <TabsContent value="unit" className="outline-none">
          <AuctionUnitSection auction={auction} />
        </TabsContent>

        {/* TAB 3: POLICIES */}
        <TabsContent value="policies" className="space-y-4 outline-none">
          <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
            <div className="flex items-start justify-between px-5 py-4 bg-muted/30 border-b border-border gap-3">
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0">
                  <Settings2 className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-bold text-foreground truncate">Policies Timeline</h3>
                  <p className="text-xs text-muted-foreground">
                    {totalPolicyCount} polic{totalPolicyCount !== 1 ? 'ies' : 'y'} configured
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefreshPolicies}
                  disabled={reloadingPolicies}
                  className="gap-1.5 text-xs rounded-xl"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${reloadingPolicies ? 'animate-spin' : ''}`} />
                  Re-evaluate
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push(`/admin/auctions/${id}/edit`)}
                  className="gap-1.5 text-xs rounded-xl"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Edit
                </Button>
                {totalPolicyCount > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setConfirmDeletePolicies(true)}
                    disabled={deletingPolicies}
                    className="gap-1.5 text-xs rounded-xl text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
                  >
                    {deletingPolicies ? (
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                    Delete all
                  </Button>
                )}
              </div>
            </div>

            <div className="p-6">
              <PoliciesTimeline
                stages={policyStages}
                auction={auction}
                evaluationsByPolicyId={evaluationsByPolicyId}
              />
            </div>
          </div>
        </TabsContent>

        {/* TAB 4: WORKFLOW */}
        <TabsContent value="timeline" className="space-y-4 outline-none">
          <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
            <div className="flex items-start justify-between px-5 py-4 bg-muted/30 border-b border-border gap-3">
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0">
                  <GitFork className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-bold text-foreground truncate">Workflow Timeline</h3>
                  <p className="text-xs text-muted-foreground">
                    {workflow.length} step{workflow.length !== 1 ? 's' : ''} configured
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push(`/admin/auctions/${id}/edit`)}
                  className="gap-1.5 text-xs rounded-xl"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Edit
                </Button>
                {workflow.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setConfirmDeleteWorkflow(true)}
                    disabled={deletingWorkflow}
                    className="gap-1.5 text-xs rounded-xl text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
                  >
                    {deletingWorkflow ? (
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                    Delete all
                  </Button>
                )}
              </div>
            </div>

            <div className="p-6">
              <WorkflowStagesTimeline
                preAuctionNodes={preAuctionWorkflowNodes}
                postAuctionNodes={postAuctionWorkflowNodes}
                auction={auction}
              />
            </div>
          </div>
        </TabsContent>

        {/* TAB 5: INVITATIONS */}
        <TabsContent value="invitations" className="space-y-4 outline-none">
          <AuctionParticipantsTab auctionId={id} />
        </TabsContent>
      </Tabs>

      {/* Confirm: delete all policies */}
      <ConfirmDialog
        open={confirmDeletePolicies}
        title="Delete all policies?"
        description="This will permanently remove all configured policies from this auction. This cannot be undone."
        confirmLabel="Delete all"
        onConfirm={handleDeleteAllPolicies}
        onCancel={() => setConfirmDeletePolicies(false)}
      />

      {/* Confirm: delete workflow */}
      <ConfirmDialog
        open={confirmDeleteWorkflow}
        title="Delete entire workflow?"
        description="This will permanently remove all workflow steps from this auction. This cannot be undone."
        confirmLabel="Delete workflow"
        onConfirm={handleDeleteWorkflow}
        onCancel={() => setConfirmDeleteWorkflow(false)}
      />
    </div>
  );
}

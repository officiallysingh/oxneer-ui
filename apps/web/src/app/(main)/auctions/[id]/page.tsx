'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, ArrowLeft, Lock } from 'lucide-react';
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, Skeleton } from '@oxneer/ui';
import { resolveStr } from '@/components/common/admin/format';
import { WorkflowWizard } from '../_components/WorkflowWizard';
import { AuctionActionPanel } from './_components/AuctionActionPanel';
import { AuctionFacts } from './_components/AuctionFacts';
import { PublicWorkflow } from './_components/PublicAuctionSections';
import { WorkflowStatusCard } from './_components/WorkflowStatusCard';
import { usePublicAuction } from './_hooks/usePublicAuction';

export default function PublicAuctionViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const state = usePublicAuction(id);
  const [stepsOpen, setStepsOpen] = useState(false);

  if (state.loading) return <AuctionPageSkeleton />;
  if (state.error || !state.auction) return <AuctionUnavailable message={state.error} />;

  const { auction, participant } = state;
  const workflow = auction.workflow ?? [];
  const categories = [...(auction.categories ?? []), ...(auction.subCategories ?? [])]
    .map((c) => c.name)
    .join(' · ');
  const isPrivate = resolveStr(auction.accessibility) === 'PRIVATE';

  const closeSteps = async () => {
    setStepsOpen(false);
    await state.refreshParticipant();
  };

  return (
    <>
      <div className="container mx-auto px-4 py-8 md:px-6 md:py-10">
        <Link
          href="/#auctions"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          All auctions
        </Link>

        <div className="mt-6 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-12">
          <div className="min-w-0 space-y-10">
            <header>
              <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                {categories && <span>{categories}</span>}
                {auction.referenceId && <span className="tabular-nums">{auction.referenceId}</span>}
                {isPrivate && (
                  <span className="inline-flex items-center gap-1">
                    <Lock className="h-3.5 w-3.5" aria-hidden />
                    Invite only
                  </span>
                )}
              </p>
              <h1 className="mt-3 font-display text-3xl font-semibold leading-tight tracking-tight text-foreground text-balance md:text-4xl">
                {auction.title}
              </h1>
              {auction.description && (
                <p className="mt-4 max-w-[68ch] leading-relaxed text-muted-foreground">
                  {auction.description}
                </p>
              )}
            </header>

            {/* On narrow screens the decision panel comes straight after the title. */}
            <div className="lg:hidden">
              <AuctionActionPanel state={state} onOpenSteps={() => setStepsOpen(true)} />
            </div>

            {participant?.workflowStatus && state.hasSteps && (
              <WorkflowStatusCard
                workflow={workflow}
                workflowStatus={participant.workflowStatus}
                onOpenWizard={() => setStepsOpen(true)}
                allDone={state.allStepsDone}
              />
            )}

            <AuctionFacts auction={auction} />

            {workflow.length > 0 && <PublicWorkflow workflow={workflow} auction={auction} />}
          </div>

          <div className="hidden lg:block">
            <AuctionActionPanel state={state} onOpenSteps={() => setStepsOpen(true)} />
          </div>
        </div>
      </div>

      <Dialog open={stepsOpen} onOpenChange={(open) => !open && closeSteps()}>
        <DialogContent className="flex max-h-[90vh] max-w-3xl flex-col overflow-hidden p-0">
          <DialogHeader className="shrink-0 border-b border-border px-6 py-4">
            <DialogTitle className="text-base">Complete registration</DialogTitle>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-auto">
            <WorkflowWizard auctionId={id} workflow={workflow} onClose={closeSteps} />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function AuctionPageSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading auction"
      className="container mx-auto px-4 py-8 md:px-6 md:py-10"
    >
      <Skeleton className="h-4 w-24" />
      <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-12">
        <div className="space-y-4">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-9 w-4/5" />
          <Skeleton className="h-4 w-full max-w-[60ch]" />
          <Skeleton className="h-4 w-3/4 max-w-[60ch]" />
        </div>
        <Skeleton className="h-72 w-full rounded-xl" />
      </div>
    </div>
  );
}

function AuctionUnavailable({ message }: { message: string | null }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="max-w-md text-center">
        <span className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-destructive/10 text-destructive">
          <AlertCircle className="h-6 w-6" aria-hidden />
        </span>
        <h1 className="font-display text-xl font-semibold text-foreground">Auction unavailable</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {message ?? 'This auction could not be loaded.'}
        </p>
        <Button asChild variant="outline" className="mt-6">
          <Link href="/#auctions">Browse auctions</Link>
        </Button>
      </div>
    </div>
  );
}

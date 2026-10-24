'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { Button } from '@repo/ui';
import ErrorAlert from '@/components/common/admin/ErrorAlert';
import { AuctionWizardProvider, type AuctionWizardConfig } from '../../_context';
import { AuctionWizard } from '../../_components/wizard/AuctionWizard';
import { WizardSkeleton } from '../../_components/wizard/shell/WizardSkeleton';
import { useAuctionEditSnapshot } from '../../_hooks/useAuctionEditSnapshot';

/** The edit route originally had six steps. Keep existing deep links working
 *  while accepting the new seven-step numbers. */
function requestedStep(raw: string | null): number {
  const requested = parseInt(raw ?? '', 10);
  if (Number.isNaN(requested)) return 1;
  const legacy: Record<number, number> = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 3, 6: 7 };
  return legacy[requested] ?? (requested >= 1 && requested <= 7 ? requested : 1);
}

export default function EditAuctionPage() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const initialStep = requestedStep(searchParams.get('step'));
  const { data, loading, error } = useAuctionEditSnapshot(id);

  const config = useMemo<AuctionWizardConfig | null>(() => {
    if (!data) return null;
    const { snapshot, savedPolicies, workflowCounts } = data;
    return {
      mode: 'edit',
      auctionId: id,
      auctionType: snapshot.auctionType,
      initialState: snapshot.state,
      initialStep,
      published: snapshot.status === 'PUBLISHED' || snapshot.status === 'LIVE',
      savedPolicies,
      workflowCounts,
      unit: {
        id: snapshot.unitId,
        rawType: snapshot.rawUnitType,
        supported: snapshot.unitSupported,
      },
      startTimeFallback: snapshot.startTime,
    };
    // The step only seeds the wizard; later URL changes don't reset it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, id]);

  if (loading) return <WizardSkeleton />;

  if (error || !config) {
    return (
      <div className="mx-auto max-w-lg space-y-4 py-16">
        <ErrorAlert message={error ?? 'Could not load the auction.'} />
        <Button asChild variant="outline" size="sm">
          <Link href="/admin/auctions">Back to auctions</Link>
        </Button>
      </div>
    );
  }

  return (
    // Keyed by id so moving between auctions starts from a clean wizard.
    <AuctionWizardProvider key={id} config={config}>
      <AuctionWizard />
    </AuctionWizardProvider>
  );
}

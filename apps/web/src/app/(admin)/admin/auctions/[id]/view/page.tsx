'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { auctionsApi } from '@repo/api';
import { Tabs, TabsList, TabsTrigger, TabsContent, Button, toast } from '@repo/ui';
import {
  Building2,
  Layers,
  ShieldCheck,
  GitFork,
  Users,
  AlertCircle,
  ArrowLeft,
} from 'lucide-react';
import { PageLoading } from '@/components/common/admin/SectionCard';
import ConfirmDialog from '@/components/common/admin/ConfirmDialog';
import { useAuctionDetails } from '@/hooks/useAuctionDetails';
import { AuctionViewHeader } from './_components/AuctionViewHeader';
import { AuctionOverviewTab } from './_components/AuctionOverviewTab';
import { AuctionPoliciesTab } from './_components/AuctionPoliciesTab';
import { AuctionWorkflowTab } from './_components/AuctionWorkflowTab';
import { AuctionUnitSection } from '../../_components/AuctionUnitSection';
import { AuctionParticipantsTab } from '../../_components/AuctionParticipantsTab';

type ConfirmAction = 'auction' | 'policies' | 'workflow' | null;

export default function AuctionViewPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('overview');
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);

  const {
    loading,
    auction,
    policies,
    workflow,
    evaluationsByPolicyId,
    evaluationsEvaluatedAt,
    reloadingPolicies,
    refreshData,
    handleRefreshPolicies,
    fetchEvaluations,
  } = useAuctionDetails(id);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    if (value === 'policies' && !evaluationsEvaluatedAt && !reloadingPolicies && policies) {
      fetchEvaluations(policies);
    }
  };

  const runConfirmedAction = async () => {
    const action = confirmAction;
    setConfirmAction(null);
    if (!action) return;

    try {
      if (action === 'auction') {
        await auctionsApi.deleteAuction(id);
        toast.success('Auction deleted successfully');
        router.push('/admin/auctions');
        return;
      }
      if (action === 'policies') {
        await auctionsApi.deleteAuctionPolicies(id);
        toast.success('All policies deleted');
        refreshData();
        return;
      }
      await auctionsApi.deleteWorkflow(id);
      toast.success('Workflow deleted');
      refreshData();
    } catch {
      toast.error(
        action === 'auction'
          ? 'Failed to delete auction'
          : action === 'policies'
            ? 'Failed to delete policies'
            : 'Failed to delete workflow',
      );
    }
  };

  const confirmCopy: Record<
    Exclude<ConfirmAction, null>,
    { title: string; description: string; confirmLabel: string }
  > = {
    auction: {
      title: 'Delete auction?',
      description: 'This will permanently remove the auction and related configuration.',
      confirmLabel: 'Delete auction',
    },
    policies: {
      title: 'Delete all policies?',
      description: 'This will remove every policy mapped to this auction.',
      confirmLabel: 'Delete policies',
    },
    workflow: {
      title: 'Delete workflow?',
      description: 'This will remove the entire workflow for this auction.',
      confirmLabel: 'Delete workflow',
    },
  };

  if (loading) {
    return <PageLoading message="Loading auction details..." />;
  }

  if (!auction) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="p-4 rounded-full bg-rose-500/10 text-rose-500">
          <AlertCircle className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-bold text-foreground">Auction Not Found</h2>
        <p className="text-sm text-muted-foreground">
          The requested auction ID could not be found or has been removed.
        </p>
        <Button onClick={() => router.push('/admin/auctions')} className="gap-2 mt-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Auctions
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto">
      <AuctionViewHeader
        auction={auction}
        onRefreshPolicies={handleRefreshPolicies}
        reloadingPolicies={reloadingPolicies}
        onDelete={() => setConfirmAction('auction')}
      />

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList className="bg-card border border-border p-1 rounded-2xl flex flex-wrap gap-1">
          <TabsTrigger value="overview" className="gap-2 rounded-xl text-xs sm:text-sm font-medium">
            <Building2 className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="units" className="gap-2 rounded-xl text-xs sm:text-sm font-medium">
            <Layers className="h-4 w-4" />
            Asset Units
            {auction.units && auction.units.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-muted text-[10px] font-bold">
                {auction.units.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="policies" className="gap-2 rounded-xl text-xs sm:text-sm font-medium">
            <ShieldCheck className="h-4 w-4" />
            Rules & Policies
            {policies && policies.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold">
                {policies.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="workflow" className="gap-2 rounded-xl text-xs sm:text-sm font-medium">
            <GitFork className="h-4 w-4" />
            Workflow Timeline
            {workflow && workflow.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-muted text-[10px] font-bold">
                {workflow.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="invitations"
            className="gap-2 rounded-xl text-xs sm:text-sm font-medium"
          >
            <Users className="h-4 w-4" />
            Participants
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="outline-none">
          <AuctionOverviewTab auction={auction} />
        </TabsContent>

        <TabsContent value="units" className="outline-none">
          <AuctionUnitSection auction={auction} />
        </TabsContent>

        <TabsContent value="policies" className="outline-none">
          <AuctionPoliciesTab
            auctionId={id}
            policies={policies}
            evaluationsByPolicyId={evaluationsByPolicyId}
            evaluationsEvaluatedAt={evaluationsEvaluatedAt}
            reloadingPolicies={reloadingPolicies}
            onRefreshPolicies={handleRefreshPolicies}
            onDeletePolicies={() => setConfirmAction('policies')}
          />
        </TabsContent>

        <TabsContent value="workflow" className="outline-none">
          <AuctionWorkflowTab
            auctionId={id}
            auction={auction}
            workflow={workflow}
            onDeleteWorkflow={() => setConfirmAction('workflow')}
          />
        </TabsContent>

        <TabsContent value="invitations" className="outline-none">
          <AuctionParticipantsTab auctionId={id} />
        </TabsContent>
      </Tabs>

      <ConfirmDialog
        open={confirmAction !== null}
        title={confirmAction ? confirmCopy[confirmAction].title : undefined}
        description={confirmAction ? confirmCopy[confirmAction].description : undefined}
        confirmLabel={confirmAction ? confirmCopy[confirmAction].confirmLabel : 'Delete'}
        onConfirm={runConfirmedAction}
        onCancel={() => setConfirmAction(null)}
      />
    </div>
  );
}

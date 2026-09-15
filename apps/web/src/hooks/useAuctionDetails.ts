import { useEffect, useState, useCallback } from 'react';
import {
  auctionsApi,
  AuctionVM,
  AuctionPoliciesRQ,
  PolicyEvaluationMap,
  AuctionWorkflowStep,
} from '@repo/api';
import { toast } from '@repo/ui';
import {
  buildEvaluationsByPolicy,
  resolveStr,
} from '../app/(admin)/admin/auctions/_components/PolicyShared';

export function useAuctionDetails(id: string) {
  const [loading, setLoading] = useState(true);
  const [reloadingPolicies, setReloadingPolicies] = useState(false);
  const [auction, setAuction] = useState<AuctionVM | null>(null);
  const [policies, setPolicies] = useState<AuctionPoliciesRQ | null>(null);
  const [workflow, setWorkflow] = useState<AuctionWorkflowStep[]>([]);
  const [evaluationsByPolicyId, setEvaluationsByPolicyId] = useState<
    Record<string, PolicyEvaluationMap>
  >({});
  const [evaluationsEvaluatedAt, setEvaluationsEvaluatedAt] = useState<Date | null>(null);

  const fetchEvaluations = useCallback(
    async (items: AuctionPoliciesRQ | null) => {
      if (!items || items.length === 0) {
        setEvaluationsByPolicyId({});
        setEvaluationsEvaluatedAt(new Date());
        return;
      }
      const policyIds = Array.from(
        new Set(items.map((p) => p.id).filter((policyId): policyId is string => Boolean(policyId))),
      );
      if (policyIds.length === 0) {
        setEvaluationsByPolicyId({});
        setEvaluationsEvaluatedAt(new Date());
        return;
      }

      try {
        const evaluations = await auctionsApi
          .evaluateAuctionPolicies(id, policyIds)
          .catch(() => null);
        setEvaluationsByPolicyId(buildEvaluationsByPolicy(evaluations, items));
        setEvaluationsEvaluatedAt(new Date());
      } catch {
        // silent fallback for evaluations
      }
    },
    [id],
  );

  const refreshData = useCallback(async () => {
    setLoading(true);
    try {
      const [a, pol, wf] = await Promise.all([
        auctionsApi.getAuctionById(id, ['*']),
        auctionsApi.getAuctionPolicies(id).catch(() => null),
        auctionsApi.getAuctionWorkflow(id).catch(() => [] as AuctionWorkflowStep[]),
      ]);
      setAuction(a);
      setPolicies(pol);
      setWorkflow(wf ?? []);

      const status = resolveStr(a?.status);
      const live = status === 'SCHEDULED' || status === 'RUNNING';
      if (live && pol) {
        await fetchEvaluations(pol);
      }
    } catch {
      toast?.error?.('Failed to fetch auction details');
    } finally {
      setLoading(false);
    }
  }, [id, fetchEvaluations]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

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

  return {
    loading,
    auction,
    policies,
    workflow,
    evaluationsByPolicyId,
    evaluationsEvaluatedAt,
    reloadingPolicies,
    setPolicies,
    setWorkflow,
    refreshData,
    handleRefreshPolicies,
    fetchEvaluations,
  };
}

'use client';

import { useRouter } from 'next/navigation';
import { AuctionPoliciesRQ, PolicyEvaluationMap, PolicyItemRQ } from '@repo/api';
import { Button } from '@repo/ui';
import { ShieldCheck, Pencil, Trash2, RefreshCw, Layers } from 'lucide-react';
import { groupPoliciesByCategory } from '../../../_components/PolicyShared';
import { PolicyItemCard } from '../../../_components/PolicyEvaluationDisplay';

interface AuctionPoliciesTabProps {
  auctionId: string;
  policies: AuctionPoliciesRQ | null;
  evaluationsByPolicyId: Record<string, PolicyEvaluationMap>;
  evaluationsEvaluatedAt: Date | null;
  reloadingPolicies: boolean;
  onRefreshPolicies: () => void;
  onDeletePolicies?: () => void;
}

export function AuctionPoliciesTab({
  auctionId,
  policies,
  evaluationsByPolicyId,
  evaluationsEvaluatedAt,
  reloadingPolicies,
  onRefreshPolicies,
  onDeletePolicies,
}: AuctionPoliciesTabProps) {
  const router = useRouter();
  const safePolicies: PolicyItemRQ[] = policies ?? [];
  const policyStages = groupPoliciesByCategory(safePolicies);
  const totalPolicies = safePolicies.length;

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
        <div className="flex flex-wrap items-center justify-between px-5 py-4 bg-muted/30 border-b border-border gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">Auction Policies & Rules</h3>
              <p className="text-xs text-muted-foreground">
                {totalPolicies} policies configured across {policyStages.length} categories
                {evaluationsEvaluatedAt && (
                  <span className="ml-2 font-mono text-[11px] text-muted-foreground/80">
                    (evaluated {evaluationsEvaluatedAt.toLocaleTimeString()})
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onRefreshPolicies}
              disabled={reloadingPolicies}
              className="gap-1.5 text-xs rounded-xl"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${reloadingPolicies ? 'animate-spin' : ''}`} />
              Re-evaluate All
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/admin/auctions/${auctionId}/edit`)}
              className="gap-1.5 text-xs rounded-xl"
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </Button>
            {totalPolicies > 0 && onDeletePolicies && (
              <Button
                variant="outline"
                size="sm"
                onClick={onDeletePolicies}
                className="gap-1.5 text-xs rounded-xl text-destructive hover:bg-destructive/10 border-destructive/30"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete all
              </Button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {totalPolicies === 0 ? (
            <div className="text-center py-12 space-y-3">
              <Layers className="h-10 w-10 text-muted-foreground/40 mx-auto" />
              <p className="text-sm font-medium text-muted-foreground">No policies configured</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(`/admin/auctions/${auctionId}/edit`)}
              >
                Add Policies
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {safePolicies.map((pol) => (
                <PolicyItemCard
                  key={pol.id ?? pol.name}
                  auctionId={auctionId}
                  policyId={pol.id}
                  name={pol.name}
                  type={pol.type}
                  evaluations={pol.id ? evaluationsByPolicyId[pol.id] : null}
                  loadingEvaluation={reloadingPolicies}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

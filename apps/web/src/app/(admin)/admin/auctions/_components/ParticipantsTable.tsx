'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Loader2,
  RefreshCw,
  RotateCcw,
  Search,
  Trash2,
  X,
  ChevronLeft,
  ChevronRight,
  Users,
} from 'lucide-react';
import { Button, Label } from '@repo/ui';
import { participantsApi, type ParticipantVM, type InvitationStatus } from '@repo/api';
import { UserAvatar } from '@/components/common/admin/UserAvatar';
import { parseApiError } from '@/lib/api-errors';
import { DismissibleError } from './AuctionShared';

// ── Helpers ───────────────────────────────────────────────────────────────────

export function resolveInvitationStatus(p: ParticipantVM): string {
  const status = p.invitation?.status;
  if (!status) return 'NA';
  return typeof status === 'string' ? status : ((Object.values(status)[0] as string) ?? 'NA');
}

export function statusBadgeClass(status: string): string {
  switch (status) {
    case 'ACCEPTED':
      return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
    case 'DECLINED':
    case 'EXPIRED':
      return 'bg-destructive/10 text-destructive border-destructive/20';
    case 'PENDING':
    case 'INVITED':
      return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
    case 'NA':
      return 'bg-muted text-muted-foreground border-border';
    default:
      return 'bg-muted text-muted-foreground border-border';
  }
}

const ALL_STATUSES: InvitationStatus[] = [
  'INVITED',
  'PENDING',
  'ACCEPTED',
  'DECLINED',
  'EXPIRED',
  'NA',
];

const PAGE_SIZE = 10;

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  auctionId: string;
  /** If provided, called after a participant is deleted so the parent can react. */
  onParticipantRemoved?: (id: string) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ParticipantsTable({ auctionId, onParticipantRemoved }: Props) {
  const [participants, setParticipants] = useState<ParticipantVM[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [reinvitingId, setReinvitingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Pagination
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalRecords, setTotalRecords] = useState(0);

  // Filters
  const [phraseInput, setPhraseInput] = useState('');
  const [appliedPhrase, setAppliedPhrase] = useState('');
  const [selectedStatuses, setSelectedStatuses] = useState<InvitationStatus[]>([]);

  const fetchParticipants = useCallback(
    async (
      opts: {
        phrases?: string[];
        invitationStatuses?: InvitationStatus[];
        page?: number;
      } = {},
    ) => {
      setLoading(true);
      try {
        const result = await participantsApi.getAllParticipants(auctionId, {
          phrases: opts.phrases?.length ? opts.phrases : undefined,
          invitationStatus: opts.invitationStatuses?.length
            ? opts.invitationStatuses[0]
            : undefined,
          page: opts.page ?? 0,
          size: PAGE_SIZE,
        });
        setParticipants(result.content ?? []);
        setTotalPages(result.page?.totalPages ?? 0);
        setTotalRecords(result.page?.totalRecords ?? 0);
        setPage(opts.page ?? 0);
      } catch {
        setParticipants([]);
      } finally {
        setLoading(false);
      }
    },
    [auctionId],
  );

  useEffect(() => {
    fetchParticipants();
  }, [fetchParticipants]);

  const handleSearch = () => {
    const phrase = phraseInput.trim();
    setAppliedPhrase(phrase);
    fetchParticipants({
      phrases: phrase ? [phrase] : undefined,
      invitationStatuses: selectedStatuses,
      page: 0,
    });
  };

  const handleReset = () => {
    setPhraseInput('');
    setAppliedPhrase('');
    setSelectedStatuses([]);
    fetchParticipants({ page: 0 });
  };

  const handlePageChange = (delta: number) => {
    const next = page + delta;
    fetchParticipants({
      phrases: appliedPhrase ? [appliedPhrase] : undefined,
      invitationStatuses: selectedStatuses,
      page: next,
    });
  };

  const toggleStatus = (s: InvitationStatus) => {
    setSelectedStatuses((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  };

  const handleRemove = async (participantId: string) => {
    setRemovingId(participantId);
    setError(null);
    try {
      await participantsApi.deleteParticipant(participantId);
      setParticipants((prev) => prev.filter((p) => p.id !== participantId));
      setTotalRecords((n) => Math.max(0, n - 1));
      onParticipantRemoved?.(participantId);
    } catch (err) {
      setError(parseApiError(err).general ?? 'Failed to remove participant.');
    } finally {
      setRemovingId(null);
    }
  };

  const handleReinvite = async (participant: ParticipantVM) => {
    if (!participant.emailId && !participant.mobileNo) {
      setError('This participant has no email or phone number to reinvite.');
      return;
    }
    setReinvitingId(participant.id);
    setError(null);
    try {
      await participantsApi.inviteParticipant(auctionId, {
        emailId: participant.emailId,
        mobileNo: participant.mobileNo,
        forceReInvite: true,
      });
      await fetchParticipants({
        phrases: appliedPhrase ? [appliedPhrase] : undefined,
        invitationStatuses: selectedStatuses,
        page,
      });
    } catch (err) {
      setError(parseApiError(err).general ?? 'Failed to send the invitation again.');
    } finally {
      setReinvitingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <DismissibleError message={error} />

      {/* Filter bar */}
      <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-3">
        <div className="flex flex-wrap items-end gap-3">
          {/* Phrase search */}
          <div className="flex-1 min-w-[180px] space-y-1">
            <Label className="text-xs text-muted-foreground font-medium">Search</Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                value={phraseInput}
                onChange={(e) => setPhraseInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Name, email or phone..."
                className="w-full pl-8 pr-3 py-1.5 text-sm rounded-md border border-input bg-background outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pb-0.5">
            <Button size="sm" onClick={handleSearch} className="gap-1.5">
              <Search className="h-3.5 w-3.5" />
              Search
            </Button>
            <Button size="sm" variant="outline" onClick={handleReset} className="gap-1.5">
              <X className="h-3.5 w-3.5" />
              Reset
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() =>
                fetchParticipants({
                  phrases: appliedPhrase ? [appliedPhrase] : undefined,
                  invitationStatuses: selectedStatuses,
                  page,
                })
              }
              disabled={loading}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Status filter pills */}
        <div className="flex flex-wrap gap-1.5">
          <span className="text-xs text-muted-foreground self-center pr-1">Status:</span>
          {ALL_STATUSES.map((s) => {
            const active = selectedStatuses.includes(s);
            return (
              <button
                key={s}
                type="button"
                onClick={() => toggleStatus(s)}
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border transition-colors ${
                  active
                    ? statusBadgeClass(s) + ' ring-1 ring-current'
                    : 'border-border text-muted-foreground hover:border-primary/40 hover:text-foreground'
                }`}
              >
                {s}
              </button>
            );
          })}
          {selectedStatuses.length > 0 && (
            <button
              type="button"
              onClick={() => setSelectedStatuses([])}
              className="text-[10px] text-muted-foreground hover:text-foreground underline"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Summary */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5" />
          {loading ? 'Loading...' : `${totalRecords} participant${totalRecords !== 1 ? 's' : ''}`}
          {(appliedPhrase || selectedStatuses.length > 0) && ' (filtered)'}
        </p>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {loading ? (
          <div className="flex items-center gap-2 justify-center py-10 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading participants...
          </div>
        ) : participants.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-muted-foreground">
            <Users className="h-8 w-8 opacity-40" />
            <p className="text-sm">No participants found.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">
                  Participant
                </th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground hidden sm:table-cell">
                  Contact
                </th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">
                  Status
                </th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground hidden md:table-cell">
                  Issued
                </th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground hidden md:table-cell">
                  Responded
                </th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {participants.map((p) => {
                const status = resolveInvitationStatus(p);
                const issuedAt = p.invitation?.issuedAt
                  ? new Date(p.invitation.issuedAt).toLocaleDateString()
                  : '—';
                const respondedAt = p.invitation?.respondedAt
                  ? new Date(p.invitation.respondedAt).toLocaleDateString()
                  : '—';
                return (
                  <tr key={p.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <UserAvatar
                          firstName={p.name?.split(' ')[0]}
                          lastName={p.name?.split(' ').slice(1).join(' ')}
                          username={p.username || p.emailId}
                          src={p.profilePicture || p.avatar}
                          size={28}
                          className="h-7 w-7 shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="font-medium text-foreground truncate text-sm">
                            {p.name || p.username || p.emailId || p.mobileNo || '—'}
                          </p>
                          {p.username && (
                            <p className="text-xs text-muted-foreground truncate">@{p.username}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <div className="text-xs text-muted-foreground space-y-0.5">
                        {p.emailId && <p className="truncate max-w-[180px]">{p.emailId}</p>}
                        {p.mobileNo && <p>{p.mobileNo}</p>}
                        {!p.emailId && !p.mobileNo && '—'}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${statusBadgeClass(status)}`}
                      >
                        {status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground hidden md:table-cell">
                      {issuedAt}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground hidden md:table-cell">
                      {respondedAt}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => handleReinvite(p)}
                          disabled={reinvitingId === p.id || removingId === p.id}
                          title="Re-invite participant"
                          className="p-1 rounded text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors disabled:opacity-50"
                        >
                          {reinvitingId === p.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <RotateCcw className="h-3.5 w-3.5" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemove(p.id)}
                          disabled={removingId === p.id}
                          title="Remove participant"
                          className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
                        >
                          {removingId === p.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-1">
          <p className="text-xs text-muted-foreground">
            Page {page + 1} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => handlePageChange(-1)}
              disabled={page === 0 || loading}
              className="h-7 px-2 gap-1"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Prev
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handlePageChange(1)}
              disabled={page >= totalPages - 1 || loading}
              className="h-7 px-2 gap-1"
            >
              Next
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

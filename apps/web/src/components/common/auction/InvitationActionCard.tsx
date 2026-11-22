'use client';

import { useState } from 'react';
import { participantsApi } from '@repo/api';
import type { AuctionVM } from '@repo/api';
import { useAuthStore } from '@/store/authStore';
import { parseApiError } from '@/lib/api-errors';
import {
  Loader2,
  CheckCircle2,
  XCircle,
  Gavel,
  Clock,
  Calendar,
  FileText,
  ArrowRight,
} from 'lucide-react';
import { Button, Input, Label, Textarea, cn } from '@repo/ui';

const COMMENTS_MIN = 5;
const COMMENTS_MAX = 255;

/** What the email link carries. Accept needs a sign-in; decline doesn't. */
export type InvitationLink =
  | { action: 'accept'; code: string }
  | { action: 'decline'; emailId: string; code: string };

interface InvitationActionCardProps {
  auctionId: string;
  /** Null when the auction can't be shown, e.g. a visitor declining a private auction. */
  auction: AuctionVM | null;
  link: InvitationLink;
}

export function InvitationActionCard({ auctionId, auction, link }: InvitationActionCardProps) {
  const { user } = useAuthStore();
  const { action } = link;

  const [code, setCode] = useState('');
  const [comments, setComments] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const trimmedComments = comments.trim();
  const commentsValid =
    trimmedComments.length >= COMMENTS_MIN && trimmedComments.length <= COMMENTS_MAX;

  const clearFieldError = (field: string) =>
    setFieldErrors((p) => {
      const n = { ...p };
      delete n[field];
      return n;
    });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    setLoading(true);

    try {
      if (link.action === 'accept') {
        await participantsApi.acceptInvitation(auctionId, {
          loginName: user?.username ?? link.code,
          code,
        });
      } else {
        await participantsApi.declineInvitation(auctionId, {
          emailId: link.emailId,
          code: link.code,
          comments: trimmedComments,
        });
      }
      setSuccess(true);
    } catch (err) {
      const parsed = parseApiError(err);
      if (Object.keys(parsed.fieldErrors).length > 0) {
        setFieldErrors(parsed.fieldErrors);
      } else {
        setError(parsed.general ?? `Failed to ${action} invitation.`);
      }
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center">
        <div className="flex flex-col items-center gap-4">
          <div
            className={cn(
              'w-16 h-16 rounded-full flex items-center justify-center',
              action === 'accept' ? 'bg-success/15' : 'bg-destructive/15',
            )}
          >
            {action === 'accept' ? (
              <CheckCircle2 className="h-8 w-8 text-success" aria-hidden />
            ) : (
              <XCircle className="h-8 w-8 text-destructive" aria-hidden />
            )}
          </div>
          <h2 className="text-xl font-semibold text-foreground">
            {action === 'accept' ? 'Invitation Accepted!' : 'Invitation Declined'}
          </h2>
          <p className="text-muted-foreground max-w-sm">
            {action === 'accept'
              ? 'You have successfully accepted the auction invitation. You will receive further details about the auction.'
              : 'You have declined the auction invitation. The organizer has been notified.'}
          </p>
          <Button variant="outline" onClick={() => (window.location.href = '/')} className="mt-2">
            Go to Homepage
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Auction Details Header */}
      {auction && (
        <div className="px-6 py-5 border-b border-border bg-muted/30">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Gavel className="h-6 w-6 text-primary" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-lg font-semibold text-foreground truncate">{auction.title}</h1>
              {auction.description && (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {auction.description}
                </p>
              )}
              <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-muted-foreground">
                {auction.referenceId && (
                  <span className="flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5" aria-hidden />
                    Ref: {auction.referenceId}
                  </span>
                )}
                {auction.schedule?.startTime && (
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" aria-hidden />
                    {new Date(auction.schedule.startTime).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                )}
                {auction.schedule?.startTime && auction.schedule?.endTime && (
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" aria-hidden />
                    {new Date(auction.schedule.startTime).toLocaleTimeString('en-IN', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}{' '}
                    –{' '}
                    {new Date(auction.schedule.endTime).toLocaleTimeString('en-IN', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Form */}
      <div className="px-6 py-6">
        <div className="flex items-center gap-2 mb-5">
          <div
            className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center',
              action === 'accept' ? 'bg-success/15' : 'bg-destructive/15',
            )}
          >
            {action === 'accept' ? (
              <CheckCircle2 className="h-4 w-4 text-success" aria-hidden />
            ) : (
              <XCircle className="h-4 w-4 text-destructive" aria-hidden />
            )}
          </div>
          <h2 className="text-base font-semibold text-foreground">
            {action === 'accept' ? 'Accept Invitation' : 'Decline Invitation'}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {action === 'accept' && (
            <div className="space-y-1.5">
              <Label htmlFor="code" className={cn(fieldErrors.code && 'text-destructive')}>
                Verification Code
              </Label>
              <Input
                id="code"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value);
                  clearFieldError('code');
                }}
                placeholder="Enter 6-digit code from your email"
                maxLength={6}
                aria-invalid={!!fieldErrors.code}
                className={cn(
                  'font-mono tracking-widest text-center text-lg',
                  fieldErrors.code && 'border-destructive focus-visible:ring-destructive',
                )}
              />
              {fieldErrors.code && <p className="text-xs text-destructive">{fieldErrors.code}</p>}
              <p className="text-xs text-muted-foreground">
                Check your email for the 6-digit verification code.
              </p>
            </div>
          )}

          {action === 'decline' && (
            <div className="space-y-1.5">
              <Label htmlFor="comments" className={cn(fieldErrors.comments && 'text-destructive')}>
                Reason for declining
              </Label>
              <Textarea
                id="comments"
                value={comments}
                onChange={(e) => {
                  setComments(e.target.value);
                  clearFieldError('comments');
                }}
                placeholder="Let the organizer know why you're declining"
                maxLength={COMMENTS_MAX}
                rows={3}
                aria-invalid={!!fieldErrors.comments}
                aria-describedby="comments-hint"
                className={cn(
                  fieldErrors.comments && 'border-destructive focus-visible:ring-destructive',
                )}
              />
              {fieldErrors.comments && (
                <p className="text-xs text-destructive">{fieldErrors.comments}</p>
              )}
              <p id="comments-hint" className="text-xs text-muted-foreground">
                {COMMENTS_MIN}–{COMMENTS_MAX} characters ({trimmedComments.length}/{COMMENTS_MAX}).
                Declining can&apos;t be undone.
              </p>
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="rounded-md bg-destructive/10 border border-destructive/20 px-4 py-3"
            >
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <div className="flex items-center gap-3 pt-2">
            <Button
              type="submit"
              disabled={
                loading ||
                (action === 'accept' && !code.trim()) ||
                (action === 'decline' && !commentsValid)
              }
              variant={action === 'accept' ? 'default' : 'destructive'}
              className="gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  Processing...
                </>
              ) : (
                <>
                  {action === 'accept' ? 'Accept Invitation' : 'Decline Invitation'}
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

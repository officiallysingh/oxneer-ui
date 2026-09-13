'use client';

import { useCallback, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Loader2, Mail, Phone, Search, Send, UserPlus } from 'lucide-react';
import { Button, Label } from '@repo/ui';
import { participantsApi, usersApi, type UserSummary } from '@repo/api';
import { DismissibleError, FieldError } from './AuctionShared';
import { UserAvatar } from '@/components/common/admin/UserAvatar';
import { parseApiError } from '@/lib/api-errors';
import { ParticipantsTable } from './ParticipantsTable';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+?[0-9]{7,15}$/;

interface Props {
  auctionId: string;
  onBack: () => void;
  onFinish: () => void;
}

/**
 * Final, optional wizard step — invite specific people to a restricted-access
 * auction, either by searching for an existing user or entering an email /
 * phone number directly. Skippable at any time; invites can also be sent
 * later once the auction is scheduled/published.
 */
export function AuctionStep6Invitations({ auctionId, onBack, onFinish }: Props) {
  // ── Refresh trigger ──────────────────────────────────────────────────────
  const [tableKey, setTableKey] = useState(0);
  const refreshTable = () => setTableKey((k) => k + 1);

  const [emailId, setEmailId] = useState('');
  const [mobileNo, setMobileNo] = useState('');
  const [emailError, setEmailError] = useState<string | undefined>();
  const [phoneError, setPhoneError] = useState<string | undefined>();
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  // Existing-user search
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserSummary[]>([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const [invitingUser, setInvitingUser] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runSearch = useCallback((q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const phrase = q.trim();
    if (!phrase) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const data = await usersApi.getUserSummaries([phrase]);
        setResults(data);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
  }, []);

  const handleQueryChange = (q: string) => {
    setQuery(q);
    setOpen(true);
    runSearch(q);
  };

  const handleInviteUser = async (user: UserSummary) => {
    setGeneralError(null);
    setInvitingUser(user.username);
    try {
      await participantsApi.inviteParticipant(auctionId, {
        emailId: user.emailId,
        mobileNo: user.mobileNo,
      });
      setOpen(false);
      setQuery('');
      setResults([]);
      refreshTable();
    } catch (err) {
      setGeneralError(parseApiError(err).general ?? 'Failed to invite user.');
    } finally {
      setInvitingUser(null);
    }
  };

  const handleEmailChange = (value: string) => {
    setEmailId(value);
    setEmailError(
      value && !EMAIL_RE.test(value.trim()) ? 'Enter a valid email address.' : undefined,
    );
  };

  const handlePhoneChange = (value: string) => {
    setMobileNo(value);
    const normalized = value.replace(/[\s-]/g, '');
    setPhoneError(value && !PHONE_RE.test(normalized) ? 'Enter a valid phone number.' : undefined);
  };

  const handleSend = async () => {
    setGeneralError(null);
    const trimmedEmail = emailId.trim();
    const trimmedPhone = mobileNo.replace(/[\s-]/g, '');
    if (!EMAIL_RE.test(trimmedEmail)) {
      setEmailError('Enter a valid email address.');
      return;
    }
    if (trimmedPhone && !PHONE_RE.test(trimmedPhone)) {
      setPhoneError('Enter a valid phone number.');
      return;
    }
    setSending(true);
    try {
      await participantsApi.inviteParticipant(auctionId, {
        emailId: trimmedEmail,
        ...(trimmedPhone ? { mobileNo: trimmedPhone } : {}),
      });
      setEmailId('');
      setMobileNo('');
      setEmailError(undefined);
      setPhoneError(undefined);
      refreshTable();
      onFinish();
    } catch (err) {
      setGeneralError(parseApiError(err).general ?? 'Failed to send invitations.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Invite form ──────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-violet-500/10 text-violet-600 shrink-0">
            <UserPlus className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Invite participants</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Optional — search for an existing user, or invite someone by email or phone number.
              You can skip this and invite people later.
            </p>
          </div>
        </div>

        <DismissibleError message={generalError} />

        {/* Search users */}
        <div className="space-y-1.5" ref={containerRef}>
          <Label className="flex items-center gap-1.5 text-sm font-medium">
            <Search className="h-3.5 w-3.5 text-muted-foreground" />
            Search users
          </Label>
          <div className="relative">
            <input
              type="text"
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              onFocus={() => query.trim() && setOpen(true)}
              placeholder="Search by name, username, email or mobile..."
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            {open && (query.trim() || searching) && (
              <div className="absolute z-10 mt-1 w-full rounded-md border border-border bg-popover shadow-lg max-h-64 overflow-y-auto">
                {searching ? (
                  <div className="flex items-center gap-2 px-3 py-3 text-sm text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Searching...
                  </div>
                ) : results.length === 0 ? (
                  <div className="px-3 py-3 text-sm text-muted-foreground">No users found.</div>
                ) : (
                  results.map((user) => (
                    <button
                      key={user.username}
                      type="button"
                      onClick={() => handleInviteUser(user)}
                      disabled={invitingUser === user.username}
                      className="flex w-full items-center gap-2.5 px-3 py-2 text-left hover:bg-muted transition-colors disabled:opacity-60"
                    >
                      <UserAvatar
                        firstName={user.firstName}
                        lastName={user.lastName}
                        username={user.username}
                        src={user.profilePicture}
                        size={28}
                        className="h-7 w-7 shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground truncate">
                          {user.firstName} {user.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {user.emailId} · @{user.username}
                        </p>
                      </div>
                      {invitingUser === user.username ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
                      ) : (
                        <UserPlus className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      )}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 py-1 text-xs text-muted-foreground">
          <div className="h-px flex-1 bg-border" />
          <span className="font-medium uppercase tracking-wider">or</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        {/* Direct invite: email is required, phone is optional. */}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-end">
          <div className="space-y-1.5">
            <Label htmlFor="invite-email" className="flex items-center gap-1.5 text-sm font-medium">
              <Mail className="h-3.5 w-3.5 text-muted-foreground" />
              Invite by email
            </Label>
            <input
              id="invite-email"
              type="email"
              value={emailId}
              onChange={(e) => handleEmailChange(e.target.value)}
              placeholder="abc@xyz.com"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            <FieldError message={emailError} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="invite-phone" className="flex items-center gap-1.5 text-sm font-medium">
              <Phone className="h-3.5 w-3.5 text-muted-foreground" />
              Invite by phone <span className="text-xs text-muted-foreground">(optional)</span>
            </Label>
            <input
              id="invite-phone"
              type="tel"
              value={mobileNo}
              onChange={(e) => handlePhoneChange(e.target.value)}
              placeholder="7082690057"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            <FieldError message={phoneError} />
          </div>
          <Button
            type="button"
            onClick={handleSend}
            disabled={sending || !emailId.trim() || !!emailError || !!phoneError}
            className="gap-2 md:mb-0.5"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Invite
          </Button>
        </div>
      </div>

      {/* ── Participants table ───────────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <h3 className="text-sm font-semibold text-foreground">Current participants</h3>
        <ParticipantsTable key={tableKey} auctionId={auctionId} />
      </div>

      {/* ── Wizard navigation ────────────────────────────────────────────── */}
      <div className="flex justify-between gap-3">
        <Button type="button" variant="outline" onClick={onBack} disabled={sending}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <div className="flex gap-2">
          <Button type="button" variant="ghost" onClick={onFinish} disabled={sending}>
            Skip
          </Button>
          <Button type="button" onClick={handleSend} disabled={sending} className="gap-2">
            {sending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                Finish <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

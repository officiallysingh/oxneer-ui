'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, Mail, Phone, Search, Send, UserPlus } from 'lucide-react';
import { Button } from '@repo/ui';
import { participantsApi, usersApi, type UserSummary } from '@repo/api';
import { parseApiError } from '@/lib/api-errors';
import { UserAvatar } from '@/components/common/admin/UserAvatar';
import { DismissibleError } from '../../../_components/AuctionShared';
import { ChoiceCard, Field, InfoNote, inputClass } from '../shared/wizard-ui';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[0-9]{7,15}$/;
const MAX_RESULTS = 6;

type InviteMode = 'existing' | 'new';

export function InvitePanel({
  auctionId,
  invitedEmails,
  onInvited,
}: {
  auctionId: string;
  invitedEmails: Set<string>;
  onInvited: () => void;
}) {
  const [mode, setMode] = useState<InviteMode>('existing');
  const [generalError, setGeneralError] = useState<string | null>(null);

  // Existing user search
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserSummary[]>([]);
  const [searching, setSearching] = useState(false);
  const [invitingUser, setInvitingUser] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // New person form
  const [emailId, setEmailId] = useState('');
  const [mobileNo, setMobileNo] = useState('');
  const [emailError, setEmailError] = useState<string | undefined>();
  const [phoneError, setPhoneError] = useState<string | undefined>();
  const [match, setMatch] = useState<UserSummary | null>(null);
  const [lookingUp, setLookingUp] = useState(false);
  const [sending, setSending] = useState(false);
  const lookupRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadSuggestions = useCallback(async () => {
    setSearching(true);
    try {
      const data = await usersApi.getUserSummaries([]);
      setResults(data.slice(0, MAX_RESULTS));
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  const runSearch = useCallback(
    (value: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      const phrase = value.trim();
      if (!phrase) {
        void loadSuggestions();
        return;
      }
      debounceRef.current = setTimeout(async () => {
        setSearching(true);
        try {
          const data = await usersApi.getUserSummaries([phrase]);
          setResults(data.slice(0, MAX_RESULTS));
        } catch {
          setResults([]);
        } finally {
          setSearching(false);
        }
      }, 300);
    },
    [loadSuggestions],
  );

  useEffect(() => {
    void loadSuggestions();
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (lookupRef.current) clearTimeout(lookupRef.current);
    };
  }, [loadSuggestions]);

  const handleInviteUser = async (user: UserSummary) => {
    setGeneralError(null);
    setInvitingUser(user.username);
    try {
      await participantsApi.inviteParticipant(auctionId, {
        emailId: user.emailId,
        ...(user.mobileNo ? { mobileNo: user.mobileNo } : {}),
      });
      setResults((prev) => prev.filter((item) => item.username !== user.username));
      onInvited();
    } catch (err) {
      setGeneralError(parseApiError(err).general ?? 'Failed to invite this user.');
    } finally {
      setInvitingUser(null);
    }
  };

  const handleEmailChange = (value: string) => {
    setEmailId(value);
    setEmailError(
      value && !EMAIL_RE.test(value.trim()) ? 'Enter a valid email address.' : undefined,
    );
    setMatch(null);
    if (lookupRef.current) clearTimeout(lookupRef.current);
    const phrase = value.trim();
    if (!EMAIL_RE.test(phrase)) return;
    lookupRef.current = setTimeout(async () => {
      setLookingUp(true);
      try {
        const found = await usersApi.getUserSummaries([phrase]);
        setMatch(found.find((user) => user.emailId.toLowerCase() === phrase.toLowerCase()) ?? null);
      } catch {
        setMatch(null);
      } finally {
        setLookingUp(false);
      }
    }, 400);
  };

  const handlePhoneChange = (value: string) => {
    const digits = value.replace(/[^\d]/g, '');
    setMobileNo(digits);
    setPhoneError(digits && !PHONE_RE.test(digits) ? 'Enter a valid phone number.' : undefined);
  };

  const sendInvite = async (event: React.FormEvent) => {
    event.preventDefault();
    setGeneralError(null);
    const email = emailId.trim();
    if (!EMAIL_RE.test(email)) {
      setEmailError('Enter a valid email address.');
      return;
    }
    if (mobileNo && !PHONE_RE.test(mobileNo)) {
      setPhoneError('Enter a valid phone number.');
      return;
    }
    setSending(true);
    try {
      await participantsApi.inviteParticipant(auctionId, {
        emailId: email,
        ...(mobileNo ? { mobileNo: `+91${mobileNo}` } : {}),
      });
      setEmailId('');
      setMobileNo('');
      setEmailError(undefined);
      setPhoneError(undefined);
      setMatch(null);
      onInvited();
    } catch (err) {
      setGeneralError(parseApiError(err).general ?? 'Failed to send the invitation.');
    } finally {
      setSending(false);
    }
  };

  const inviteDisabled = !!invitingUser || sending;

  return (
    <section
      className="overflow-hidden rounded-lg border border-border bg-card"
      aria-label="Invite participants"
    >
      <div className="grid gap-4 px-4 py-4 md:grid-cols-[168px_minmax(0,1fr)] md:gap-6">
        <div className="space-y-1">
          <h2 className="text-sm font-semibold text-foreground">Invite</h2>
          <p className="text-[11px] leading-snug text-muted-foreground">
            Invitations go out straight away. People join by completing the steps before the
            auction.
          </p>
        </div>

        <div className="min-w-0 space-y-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <ChoiceCard
              title="Existing user"
              description="Someone already on the platform"
              selected={mode === 'existing'}
              onClick={() => setMode('existing')}
            />
            <ChoiceCard
              title="New person"
              description="Invite by email. They sign up when they accept."
              selected={mode === 'new'}
              onClick={() => setMode('new')}
            />
          </div>

          <DismissibleError message={generalError} />

          {mode === 'existing' ? (
            <div className="space-y-2">
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
                  aria-hidden
                />
                <input
                  type="search"
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    runSearch(event.target.value);
                  }}
                  placeholder="Search by name, company or email"
                  aria-label="Search people already on the platform"
                  className={`${inputClass} pl-8`}
                />
              </div>

              <div className="overflow-hidden rounded-md border border-border">
                {searching ? (
                  <div className="flex items-center gap-2 px-3 py-4 text-xs text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Searching…
                  </div>
                ) : results.length === 0 ? (
                  <p className="px-3 py-4 text-xs text-muted-foreground">
                    {query.trim()
                      ? 'No matching account. Invite them as a new person instead.'
                      : 'Type a name, company or email to find someone.'}
                  </p>
                ) : (
                  results.map((user) => {
                    const alreadyInvited = invitedEmails.has(user.emailId.toLowerCase());
                    const busy = invitingUser === user.username;
                    return (
                      <div
                        key={user.username}
                        className="flex items-center gap-2.5 border-b border-border/60 px-3 py-2 last:border-b-0"
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
                          <p className="truncate text-xs font-medium text-foreground">
                            {user.firstName} {user.lastName}
                          </p>
                          <p className="truncate text-[11px] text-muted-foreground">
                            {user.emailId}
                          </p>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant={alreadyInvited ? 'outline' : 'default'}
                          disabled={alreadyInvited || inviteDisabled}
                          onClick={() => void handleInviteUser(user)}
                          className="h-7 min-w-[64px] gap-1.5 px-2 text-xs"
                        >
                          {busy ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : alreadyInvited ? (
                            'Invited'
                          ) : (
                            <>
                              <UserPlus className="h-3 w-3" />
                              Invite
                            </>
                          )}
                        </Button>
                      </div>
                    );
                  })
                )}
              </div>

              {!searching && results.length > 0 && (
                <p className="text-[11px] text-muted-foreground">
                  {query.trim()
                    ? `Showing ${results.length} result${results.length === 1 ? '' : 's'}. Keep typing to narrow the list.`
                    : `Showing ${results.length} ${results.length === 1 ? 'person' : 'people'}. Type a name, company or email to find someone.`}
                </p>
              )}
            </div>
          ) : (
            <form onSubmit={(event) => void sendInvite(event)} className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Email" htmlFor="invite-new-email" error={emailError}>
                  <div className="relative">
                    <Mail
                      className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
                      aria-hidden
                    />
                    <input
                      id="invite-new-email"
                      type="email"
                      value={emailId}
                      onChange={(event) => handleEmailChange(event.target.value)}
                      placeholder="name@company.com"
                      className={`${inputClass} pl-8`}
                    />
                  </div>
                </Field>
                <Field label="Mobile number" htmlFor="invite-new-phone" optional error={phoneError}>
                  <div className="flex overflow-hidden rounded-md border border-input bg-background focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/30">
                    <span className="flex items-center border-r border-border px-2 text-xs text-muted-foreground">
                      +91
                    </span>
                    <div className="relative flex-1">
                      <Phone
                        className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
                        aria-hidden
                      />
                      <input
                        id="invite-new-phone"
                        type="tel"
                        value={mobileNo}
                        onChange={(event) => handlePhoneChange(event.target.value)}
                        placeholder="98765 43210"
                        className="h-9 w-full bg-transparent pl-8 pr-3 text-sm text-foreground outline-none placeholder:text-muted-foreground/70"
                      />
                    </div>
                  </div>
                </Field>
              </div>

              {lookingUp && (
                <p className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Checking this email…
                </p>
              )}

              {match && (
                <InfoNote>
                  This email belongs to {match.firstName} {match.lastName}, who is already on the
                  platform. They’ll be invited as an existing user.
                </InfoNote>
              )}

              {!lookingUp && !match && emailId.trim() && EMAIL_RE.test(emailId.trim()) && (
                <InfoNote>
                  They aren’t on the platform yet. We’ll email them a sign-up link for this auction.
                </InfoNote>
              )}

              <div className="flex flex-wrap items-center gap-3">
                <Button
                  type="submit"
                  disabled={sending || !emailId.trim() || !!emailError || !!phoneError}
                  className="gap-2"
                >
                  {sending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  Send invitation
                </Button>
                <p className="text-[11px] text-muted-foreground">
                  Goes out by email straight away, and by SMS if you add a mobile number.
                </p>
              </div>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}

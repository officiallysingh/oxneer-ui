'use client';

import { use, useState, useEffect, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { auctionsApi } from '@repo/api';
import type { AuctionVM } from '@repo/api';
import {
  InvitationActionCard,
  type InvitationLink,
} from '@/components/common/auction/InvitationActionCard';
import { useAuthStore, useAuthHydrated } from '@/store/authStore';
import { Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@repo/ui';

type DecodedPath =
  | { type: 'auction'; auctionId: string }
  | { type: 'accept'; auctionId: string; code: string }
  | { type: 'decline'; auctionId: string; emailId: string; code: string }
  | { type: 'unknown' };

/** Email links are `<frontend>/<Base64 of a path>`; these are the paths the backend sends. */
function decodeInvitationPath(slug: string[]): DecodedPath {
  try {
    const decoded = atob(decodeURIComponent(slug.join('/')));

    // /auctions/invitations/{auctionId}/{code}/accept
    const acceptMatch = decoded.match(/^\/auctions\/invitations\/([^/]+)\/([^/]+)\/accept$/);
    if (acceptMatch?.[1] && acceptMatch[2]) {
      return { type: 'accept', auctionId: acceptMatch[1], code: acceptMatch[2] };
    }

    // /auctions/invitations/{auctionId}/{emailId}/{code}/decline
    const declineMatch = decoded.match(
      /^\/auctions\/invitations\/([^/]+)\/([^/]+)\/([^/]+)\/decline$/,
    );
    if (declineMatch?.[1] && declineMatch[2] && declineMatch[3]) {
      return {
        type: 'decline',
        auctionId: declineMatch[1],
        emailId: declineMatch[2],
        code: declineMatch[3],
      };
    }

    // /auctions/{auctionId}
    const auctionMatch = decoded.match(/^\/auctions\/([^/]+)$/);
    if (auctionMatch?.[1]) {
      return { type: 'auction', auctionId: auctionMatch[1] };
    }

    return { type: 'unknown' };
  } catch {
    return { type: 'unknown' };
  }
}

function CenteredSpinner({ label }: { label: string }) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin" aria-hidden />
        <p className="text-sm">{label}</p>
      </div>
    </div>
  );
}

export default function InvitationSlugPage({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = use(params);
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuthStore();
  const hydrated = useAuthHydrated();
  const isLoggedIn = !!user?.authenticated;

  const slugKey = slug.join('/');
  // eslint-disable-next-line react-hooks/exhaustive-deps -- slugKey identifies the slug
  const decoded = useMemo(() => decodeInvitationPath(slug), [slugKey]);

  // Declining needs no sign-in (public endpoint); accepting and opening an auction do.
  const needsSignIn = decoded.type === 'accept' || decoded.type === 'auction';

  const [auction, setAuction] = useState<AuctionVM | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Redirect unauthenticated users to login, preserving return URL
  useEffect(() => {
    if (hydrated && needsSignIn && !isLoggedIn) {
      router.push(`/login?callbackUrl=${encodeURIComponent(pathname)}`);
    }
  }, [hydrated, needsSignIn, isLoggedIn, pathname, router]);

  // A plain auction link just opens the auction page, which loads the auction itself.
  useEffect(() => {
    if (hydrated && isLoggedIn && decoded.type === 'auction') {
      router.replace(`/auctions/${decoded.auctionId}`);
    }
  }, [hydrated, isLoggedIn, decoded, router]);

  useEffect(() => {
    if (!hydrated) return;
    if (decoded.type !== 'accept' && decoded.type !== 'decline') {
      setLoading(false);
      return;
    }
    if (needsSignIn && !isLoggedIn) return; // redirecting to login

    let cancelled = false;
    // The public detail shows a private auction to a signed-in invitee.
    // A visitor declining a private auction gets 404: decline still works, just without details.
    auctionsApi
      .getPublicAuctionById(decoded.auctionId)
      .then((data) => {
        if (!cancelled) setAuction(data);
      })
      .catch((err) => {
        if (cancelled || decoded.type === 'decline') return;
        const status = (err as { response?: { status?: number } })?.response?.status;
        if (status === 404) {
          setError(
            'Auction not found. The link may be invalid, the invitation may have expired, or the auction may have been removed.',
          );
        } else {
          setError('Failed to load auction details. Please try again later.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [decoded, hydrated, isLoggedIn, needsSignIn]);

  if (!hydrated || (needsSignIn && !isLoggedIn)) {
    return <CenteredSpinner label="Loading..." />;
  }

  if (decoded.type === 'unknown') {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="rounded-xl border border-border bg-card p-8 text-center max-w-md">
          <div className="w-16 h-16 rounded-full bg-destructive/15 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="h-8 w-8 text-destructive" aria-hidden />
          </div>
          <h1 className="text-xl font-semibold text-foreground mb-2">Invalid Link</h1>
          <p className="text-muted-foreground mb-6">
            This invitation link is invalid or has expired. Please check your email for the correct
            link.
          </p>
          <Button onClick={() => router.push('/')}>Go to Homepage</Button>
        </div>
      </div>
    );
  }

  if (decoded.type === 'auction') {
    return <CenteredSpinner label="Opening auction..." />;
  }

  if (loading) {
    return <CenteredSpinner label="Loading auction details..." />;
  }

  if (error || (decoded.type === 'accept' && !auction)) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="rounded-xl border border-border bg-card p-8 text-center max-w-md">
          <div className="w-16 h-16 rounded-full bg-destructive/15 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="h-8 w-8 text-destructive" aria-hidden />
          </div>
          <h1 className="text-xl font-semibold text-foreground mb-2">Error</h1>
          <p className="text-muted-foreground mb-6">{error ?? 'Auction not found.'}</p>
          <Button onClick={() => router.push('/')}>Go to Homepage</Button>
        </div>
      </div>
    );
  }

  const link: InvitationLink =
    decoded.type === 'accept'
      ? { action: 'accept', code: decoded.code }
      : { action: 'decline', emailId: decoded.emailId, code: decoded.code };

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg">
        <InvitationActionCard auctionId={decoded.auctionId} auction={auction} link={link} />
      </div>
    </div>
  );
}

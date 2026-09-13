'use client';

import { use, useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { auctionsApi } from '@repo/api';
import type { AuctionVM } from '@repo/api';
import { InvitationActionCard } from '@/components/common/auction/InvitationActionCard';
import { useAuthStore, useAuthHydrated } from '@/store/authStore';
import { Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@repo/ui';

interface DecodedPath {
  type: 'auction' | 'accept' | 'decline' | 'unknown';
  auctionId?: string;
  code?: string;
  emailId?: string;
}

function decodeInvitationPath(slug: string[]): DecodedPath {
  try {
    const decoded = atob(slug.join('/'));

    const acceptMatch = decoded.match(/^\/auctions\/invitations\/([^/]+)\/([^/]+)\/accept$/);
    if (acceptMatch) {
      return {
        type: 'accept',
        auctionId: acceptMatch[1],
        code: acceptMatch[2],
      };
    }

    const declineMatch = decoded.match(/^\/auctions\/invitations\/([^/]+)\/([^/]+)\/decline$/);
    if (declineMatch) {
      return {
        type: 'decline',
        auctionId: declineMatch[1],
        emailId: declineMatch[2],
      };
    }

    const auctionMatch = decoded.match(/^\/auctions\/([^/]+)$/);
    if (auctionMatch) {
      return {
        type: 'auction',
        auctionId: auctionMatch[1],
      };
    }

    return { type: 'unknown' };
  } catch {
    return { type: 'unknown' };
  }
}

export default function InvitationSlugPage({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = use(params);
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuthStore();
  const hydrated = useAuthHydrated();
  const isLoggedIn = !!user?.authenticated;

  const [auction, setAuction] = useState<AuctionVM | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const decoded = decodeInvitationPath(slug);

  // Redirect unauthenticated users to login, preserving return URL
  useEffect(() => {
    if (hydrated && !isLoggedIn) {
      router.push(`/login?callbackUrl=${encodeURIComponent(pathname)}`);
    }
  }, [hydrated, isLoggedIn, pathname, router]);

  useEffect(() => {
    if (!hydrated || !isLoggedIn) return; // wait for auth
    if (decoded.type === 'unknown' || !decoded.auctionId) {
      setLoading(false);
      return;
    }

    const loadAuction = async () => {
      try {
        const data = await auctionsApi.getAuctionById(decoded.auctionId!);
        setAuction(data);
      } catch (err) {
        const status = (err as { response?: { status?: number } })?.response?.status;
        if (status === 404) {
          setError(
            'Auction not found. The link may be invalid or the auction may have been removed.',
          );
        } else if (status === 401 || status === 403) {
          setError('You do not have permission to view this auction. Please log in and try again.');
        } else {
          setError('Failed to load auction details. Please try again later.');
        }
      } finally {
        setLoading(false);
      }
    };

    loadAuction();
  }, [decoded, hydrated, isLoggedIn]);

  // While auth is hydrating, or redirecting to login, show spinner
  if (!hydrated || !isLoggedIn) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (decoded.type === 'unknown') {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="rounded-xl border border-border bg-card p-8 text-center max-w-md">
          <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
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

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-sm">Loading auction details...</p>
        </div>
      </div>
    );
  }

  if (error || !auction) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="rounded-xl border border-border bg-card p-8 text-center max-w-md">
          <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
          </div>
          <h1 className="text-xl font-semibold text-foreground mb-2">Error</h1>
          <p className="text-muted-foreground mb-6">{error ?? 'Auction not found.'}</p>
          <Button onClick={() => router.push('/')}>Go to Homepage</Button>
        </div>
      </div>
    );
  }

  if (decoded.type === 'auction') {
    router.push(`/auctions/${decoded.auctionId}`);
    return null;
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg">
        <InvitationActionCard
          auction={auction}
          action={decoded.type === 'accept' ? 'accept' : 'decline'}
          identifier={decoded.type === 'accept' ? (decoded.code ?? '') : (decoded.emailId ?? '')}
        />
      </div>
    </div>
  );
}

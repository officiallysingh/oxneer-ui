'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Button, Card, CardContent } from '@repo/ui';
import { usersApi } from '@repo/api';
import { useAuthStore } from '@/store/authStore';
import { OidcNewUserForm } from './_components/OidcNewUserForm';

function OidcAuthInner() {
  const router = useRouter();
  const params = useSearchParams();
  const { setUser, setUserInfo } = useAuthStore();

  const authenticated = params.get('authenticated') === 'true';
  const isNewUser = params.get('newUser') === 'true';
  const username = params.get('username') ?? '';
  const promptChangePassword = params.get('promptChangePassword') === 'true';
  const emailId = params.get('emailId') ?? '';
  const firstName = params.get('firstName') ?? '';
  const lastName = params.get('lastName') ?? '';
  const emailIdVerified = params.get('emailIdVerified') === 'true';
  const picture = params.get('picture') ?? '';

  // Derive initial status synchronously — no setState in effect for the error case
  const initialStatus = !authenticated ? 'error' : isNewUser ? 'new_user' : 'loading';
  const initialError = !authenticated ? 'Authentication failed. Please try again.' : null;

  const [status, setStatus] = useState<'loading' | 'new_user' | 'error'>(initialStatus);
  const [errorMsg, setErrorMsg] = useState<string | null>(initialError);

  useEffect(() => {
    // Only run for existing authenticated users that need a redirect
    if (status !== 'loading') return;

    (async () => {
      try {
        const userInfo = await usersApi.getSelfInfo();
        setUser({ username, authenticated: true });
        setUserInfo(userInfo);
        if (userInfo.promptChangePassword || promptChangePassword) {
          router.replace('/change-password');
        } else {
          const isAdmin = userInfo.permissions?.some(
            (a) => a === 'superadmin' || a === 'ROLE_SUPERADMIN' || a === 'platform.superadmin',
          );
          router.replace(isAdmin ? '/admin/users' : '/');
        }
      } catch {
        setErrorMsg('Failed to load user info. Please try again.');
        setStatus('error');
      }
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm">Signing you in...</p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-sm border-0 shadow-xl">
          <CardContent className="pt-6 text-center space-y-4">
            <p className="text-destructive text-sm">{errorMsg}</p>
            <Button variant="outline" onClick={() => router.replace('/login')}>
              Back to login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <OidcNewUserForm
      emailId={emailId}
      firstName={firstName}
      lastName={lastName}
      emailIdVerified={emailIdVerified}
      picture={picture}
    />
  );
}

export default function OidcAuthPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <OidcAuthInner />
    </Suspense>
  );
}

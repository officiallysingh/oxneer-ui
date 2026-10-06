'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Lock, Eye, EyeOff, ArrowRight, Loader2, HelpCircle } from 'lucide-react';
import {
  Button,
  Input,
  Label,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@repo/ui';
import { authApi } from '@repo/api';
import { useAuthStore, useAuthHydrated } from '@/store/authStore';
import { AuthIllustration } from '@/components/auth/AuthIllustration';
import { PASSWORD_PATTERN, PASSWORD_ERROR, PASSWORD_RULES } from '@/lib/validation';

export default function ChangePasswordPage() {
  const router = useRouter();
  const { user, userInfo, setUserInfo, clearUser, needsChangePassword } = useAuthStore();
  const hydrated = useAuthHydrated();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  useEffect(() => {
    if (!hydrated) return;
    if (!user?.authenticated) {
      router.replace('/login');
      return;
    }
    if (userInfo && !needsChangePassword()) {
      router.replace('/');
    }
  }, [hydrated, user, userInfo, needsChangePassword, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setPasswordError(null);
    if (!PASSWORD_PATTERN.test(newPassword)) {
      setPasswordError(PASSWORD_ERROR);
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation do not match.');
      return;
    }
    if (newPassword === currentPassword) {
      setPasswordError('New password must be different from current password.');
      return;
    }

    setIsLoading(true);
    try {
      await authApi.changePassword({ currentPassword, newPassword });
      if (userInfo) {
        setUserInfo({ ...userInfo, promptChangePassword: false });
      }
      router.push('/');
    } catch (err: unknown) {
      console.error('Change password failed:', err);
      let message: string | undefined;
      if (err && typeof err === 'object' && 'response' in err) {
        const response = (err as { response?: { data?: { message?: string } } }).response;
        message = response?.data?.message;
      }
      setError(message || 'Failed to change password. Please check your current password.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!hydrated || !user?.authenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-background text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden />
        <p className="text-sm font-medium">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 bg-primary relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:4rem_4rem]" />
        <div className="relative z-10 flex flex-col items-center justify-center w-full px-12">
          <AuthIllustration />
          <div className="text-center mt-8 max-w-md">
            <h2 className="text-3xl font-bold text-primary-foreground mb-4">
              Update your password
            </h2>
            <p className="text-primary-foreground/80 text-lg leading-relaxed">
              Choose a strong password to keep your account secure.
            </p>
          </div>
        </div>
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 bg-background">
        <div className="w-full max-w-md">
          <div className="text-center mb-8 lg:hidden">
            <Link href="/" className="inline-flex items-center gap-2 mb-6">
              <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-xl">O</span>
              </div>
              <span className="text-xl font-bold text-foreground">Oxneer</span>
            </Link>
          </div>

          <Card className="border-0 shadow-xl">
            <CardHeader className="space-y-1 text-center pb-4">
              <div className="flex justify-center">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Lock className="h-6 w-6 text-primary" />
                </div>
              </div>
              <CardTitle className="text-2xl font-bold">Change password</CardTitle>
              <CardDescription>You must set a new password before continuing.</CardDescription>
            </CardHeader>
            <CardContent>
              {error && (
                <div className="mb-4 py-2 px-3 bg-destructive/10 text-destructive text-sm rounded-md">
                  {error}
                </div>
              )}
              {passwordError && (
                <div className="mb-4 py-2 px-3 bg-destructive/10 text-destructive text-sm rounded-md">
                  {passwordError}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="current">Current password</Label>
                  <div className="relative">
                    <Input
                      id="current"
                      type={showCurrent ? 'text' : 'password'}
                      placeholder="Enter current password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrent(!showCurrent)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5">
                    <Label htmlFor="new">New password</Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          className="text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <HelpCircle className="h-3.5 w-3.5" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs text-xs">
                        {PASSWORD_RULES}
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <div className="relative">
                    <Input
                      id="new"
                      type={showNew ? 'text' : 'password'}
                      placeholder="6–12 chars, uppercase, lowercase, digit"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowNew(!showNew)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm">Confirm new password</Label>
                  <Input
                    id="confirm"
                    type="password"
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full h-11" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      Update password
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>

              <p className="mt-4 text-center text-sm text-muted-foreground">
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await authApi.logout();
                    } catch {
                      /* ignore */
                    }
                    clearUser();
                    router.push('/login');
                  }}
                  className="text-primary hover:underline"
                >
                  Sign out and use another account
                </button>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

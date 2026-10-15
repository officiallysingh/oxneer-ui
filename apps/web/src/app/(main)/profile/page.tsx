'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usersApi, authApi } from '@repo/api';
import { useAuthStore, useAuthHydrated } from '@/store/authStore';
import { Loader2, User, Lock, CheckCircle2, Eye, EyeOff, HelpCircle } from 'lucide-react';
import {
  Button,
  Input,
  Label,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@repo/ui';
import { parseApiError } from '@/lib/api-errors';
import { PASSWORD_PATTERN, PASSWORD_RULES, PASSWORD_ERROR } from '@/lib/validation';
import { AvatarUpload } from '@/components/common/admin/AvatarUpload';
import { BankAccountsCard } from '@/components/common/bank';

// ── Field wrapper ─────────────────────────────────────────────────────────────

function Field({
  label,
  error,
  tip,
  children,
}: {
  label: string;
  error?: string;
  tip?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <Label className={error ? 'text-destructive' : ''}>{label}</Label>
        {tip && (
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
              {tip}
            </TooltipContent>
          </Tooltip>
        )}
      </div>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

// ── Password input ────────────────────────────────────────────────────────────

function PasswordInput({
  id,
  value,
  onChange,
  show,
  onToggle,
  placeholder,
  error,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggle: () => void;
  placeholder: string;
  error?: string;
}) {
  return (
    <div className="relative">
      <Input
        id={id}
        type={show ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="new-password"
        className={`pr-10 ${error ? 'border-destructive focus-visible:ring-destructive' : ''}`}
      />
      <button
        type="button"
        onClick={onToggle}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

// ── Change Password Dialog ────────────────────────────────────────────────────

function ChangePasswordDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setCurrent('');
    setNext('');
    setConfirm('');
    setShowCurrent(false);
    setShowNext(false);
    setFieldErrors({});
    setError(null);
    setSuccess(false);
  };
  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    if (next !== confirm) {
      setFieldErrors({ confirm: 'Passwords do not match.' });
      return;
    }
    const pwdRegex = PASSWORD_PATTERN;
    if (!pwdRegex.test(next)) {
      setFieldErrors({ newPassword: PASSWORD_ERROR });
      return;
    }
    setSaving(true);
    try {
      await authApi.changePassword({ currentPassword: current, newPassword: next });
      setSuccess(true);
      setTimeout(() => {
        reset();
        onClose();
      }, 1500);
    } catch (err) {
      const parsed = parseApiError(err);
      if (Object.keys(parsed.fieldErrors).length > 0) setFieldErrors(parsed.fieldErrors);
      else setError(parsed.general ?? 'Failed to change password. Check your current password.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) handleClose();
      }}
    >
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Change password</DialogTitle>
        </DialogHeader>
        {success ? (
          <div className="py-6 flex flex-col items-center gap-2 text-success">
            <CheckCircle2 className="h-8 w-8" />
            <p className="text-sm font-medium">Password updated successfully</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="Current password" error={fieldErrors.currentPassword}>
              <PasswordInput
                id="cp-current"
                value={current}
                onChange={setCurrent}
                show={showCurrent}
                onToggle={() => setShowCurrent((s) => !s)}
                placeholder="Enter current password"
                error={fieldErrors.currentPassword}
              />
            </Field>
            <Field label="New password" error={fieldErrors.newPassword} tip={PASSWORD_RULES}>
              <PasswordInput
                id="cp-new"
                value={next}
                onChange={setNext}
                show={showNext}
                onToggle={() => setShowNext((s) => !s)}
                placeholder="6–12 chars, A-Z, a-z, 0-9"
                error={fieldErrors.newPassword}
              />
            </Field>
            <Field label="Confirm new password" error={fieldErrors.confirm}>
              <PasswordInput
                id="cp-confirm"
                value={confirm}
                onChange={setConfirm}
                show={showNext}
                onToggle={() => setShowNext((s) => !s)}
                placeholder="Repeat new password"
                error={fieldErrors.confirm}
              />
            </Field>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose} disabled={saving}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saving || !current || !next || !confirm}
                className="gap-2"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4" />
                    Update password
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Profile Page ──────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const router = useRouter();
  const { user, userInfo, setUserInfo } = useAuthStore();
  const hydrated = useAuthHydrated();
  const [pwdOpen, setPwdOpen] = useState(false);
  const [savingPic, setSavingPic] = useState(false);
  const [picError, setPicError] = useState<string | null>(null);

  // Profile form state
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [mobileNo, setMobileNo] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  // Initialise form from userInfo
  useEffect(() => {
    if (userInfo) {
      setEmail(userInfo.emailId ?? '');
      setFirstName(userInfo.firstName ?? '');
      setLastName(userInfo.lastName ?? '');
      setMobileNo(userInfo.mobileNo ?? '');
    }
  }, [userInfo]);

  useEffect(() => {
    if (hydrated && !user?.authenticated) {
      router.replace('/login');
    }
  }, [hydrated, user, router]);

  if (!hydrated || !user?.authenticated) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden />
        <p className="text-sm font-medium">Loading profile...</p>
      </div>
    );
  }

  const displayName = userInfo?.firstName
    ? `${userInfo.firstName}${userInfo.lastName ? ` ${userInfo.lastName}` : ''}`
    : user.username;

  const clearErr = (f: string) =>
    setFieldErrors((p) => {
      const n = { ...p };
      delete n[f];
      return n;
    });

  const handleAvatarChange = async (dataUrl: string | undefined) => {
    setPicError(null);
    setSavingPic(true);
    try {
      await usersApi.updateSelf({ profilePicture: dataUrl ?? null });
      if (userInfo) setUserInfo({ ...userInfo, profilePicture: dataUrl ?? null });
    } catch {
      setPicError('Failed to update profile picture.');
    } finally {
      setSavingPic(false);
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFieldErrors({});
    setSuccess(false);
    setSaving(true);
    try {
      await usersApi.updateSelf({
        emailId: email.trim() || undefined,
        firstName: firstName.trim() || undefined,
        lastName: lastName.trim() || undefined,
        mobileNo: mobileNo.trim() || undefined,
      });
      if (userInfo) {
        setUserInfo({
          ...userInfo,
          emailId: email.trim() || userInfo.emailId,
          firstName: firstName.trim() || undefined,
          lastName: lastName.trim() || undefined,
          mobileNo: mobileNo.trim() || undefined,
        });
      }
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      const parsed = parseApiError(err);
      if (Object.keys(parsed.fieldErrors).length > 0) setFieldErrors(parsed.fieldErrors);
      else setFormError(parsed.general ?? 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full px-4 sm:px-6 py-10">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* ── Hero card: avatar + name + change password ── */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-6 py-6 flex items-center gap-5">
            {/* Avatar — pencil icon overlay, no text link */}
            <div className="relative shrink-0">
              <AvatarUpload
                value={userInfo?.profilePicture}
                onChange={handleAvatarChange}
                fallbackText={displayName.charAt(0).toUpperCase()}
                label=""
              />
              {savingPic && (
                <div className="absolute inset-0 rounded-full bg-background/60 flex items-center justify-center pointer-events-none">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                </div>
              )}
            </div>

            {/* Name / email */}
            <div className="min-w-0 flex-1">
              <h1 className="text-lg font-semibold text-foreground truncate">{displayName}</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                {userInfo?.emailId ?? user.username}
              </p>
              {picError && <p className="text-xs text-destructive mt-1">{picError}</p>}
            </div>

            {/* Change password */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPwdOpen(true)}
              className="gap-2 shrink-0"
            >
              <Lock className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Change password</span>
              <span className="sm:hidden">Password</span>
            </Button>
          </div>
        </div>

        {/* ── Profile details form ── */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="flex items-center gap-2.5 px-6 py-4 border-b border-border bg-muted/30">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <User className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Personal Information</p>
              <p className="text-xs text-muted-foreground">Update your name, email and mobile</p>
            </div>
          </div>
          <form onSubmit={handleProfileSubmit} className="px-6 py-6 space-y-5">
            <Field label="Email" error={fieldErrors.emailId}>
              <Input
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  clearErr('emailId');
                }}
                placeholder="abc@xyz.com"
                type="email"
                autoComplete="email"
                className={
                  fieldErrors.emailId ? 'border-destructive focus-visible:ring-destructive' : ''
                }
              />
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="First name" error={fieldErrors.firstName}>
                <Input
                  value={firstName}
                  onChange={(e) => {
                    setFirstName(e.target.value);
                    clearErr('firstName');
                  }}
                  placeholder="John"
                  autoComplete="given-name"
                  className={
                    fieldErrors.firstName ? 'border-destructive focus-visible:ring-destructive' : ''
                  }
                />
              </Field>
              <Field label="Last name" error={fieldErrors.lastName}>
                <Input
                  value={lastName}
                  onChange={(e) => {
                    setLastName(e.target.value);
                    clearErr('lastName');
                  }}
                  placeholder="Doe"
                  autoComplete="family-name"
                  className={
                    fieldErrors.lastName ? 'border-destructive focus-visible:ring-destructive' : ''
                  }
                />
              </Field>
            </div>
            <Field label="Mobile number" error={fieldErrors.mobileNo}>
              <Input
                value={mobileNo}
                onChange={(e) => {
                  setMobileNo(e.target.value);
                  clearErr('mobileNo');
                }}
                placeholder="+91 98765 43210"
                autoComplete="tel"
                type="tel"
                className={
                  fieldErrors.mobileNo ? 'border-destructive focus-visible:ring-destructive' : ''
                }
              />
            </Field>
            {formError && <p className="text-sm text-destructive">{formError}</p>}
            <div className="flex items-center gap-3 pt-1">
              <Button type="submit" disabled={saving} className="gap-2">
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving…
                  </>
                ) : (
                  <>
                    <User className="h-4 w-4" />
                    Save changes
                  </>
                )}
              </Button>
              {success && (
                <span className="flex items-center gap-1.5 text-sm text-success font-medium">
                  <CheckCircle2 className="h-4 w-4" />
                  Saved
                </span>
              )}
            </div>
          </form>
        </div>

        {/* ── Bank accounts ── */}
        <BankAccountsCard />
      </div>

      <ChangePasswordDialog open={pwdOpen} onClose={() => setPwdOpen(false)} />
    </div>
  );
}

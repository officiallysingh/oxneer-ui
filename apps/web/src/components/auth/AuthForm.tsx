'use client';

import * as React from 'react';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  User,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  Loader2,
  KeyRound,
  Mail,
  Phone,
  HelpCircle,
  CheckCircle2,
} from 'lucide-react';
import {
  Button,
  Input,
  Label,
  Separator,
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@repo/ui';
import { authApi, usersApi } from '@repo/api';
import { useAuthStore } from '@/store/authStore';
import { motion, AnimatePresence } from 'framer-motion';
import { parseApiError } from '@/lib/api-errors';
import { USERNAME_RULES, PASSWORD_PATTERN, PASSWORD_RULES, PASSWORD_ERROR } from '@/lib/validation';
import { TextCaptcha, type TextCaptchaHandle } from './TextCaptcha';
import { AvatarUpload } from '@/components/common/admin/AvatarUpload';

const OTP_RESEND_COOLDOWN_SEC = 30;

const CAPTCHA_DISABLED = process.env.NEXT_PUBLIC_CAPTCHA_DISABLED === 'true';

// ─── Identity detection ───────────────────────────────────────────────────────
const MOBILE_RE = /^\d{10}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type IdentityType = 'mobile' | 'email' | 'username';

function detectIdentity(value: string): IdentityType {
  const v = value.trim();
  if (MOBILE_RE.test(v)) return 'mobile';
  if (EMAIL_RE.test(v)) return 'email';
  return 'username';
}

// ─── Text CAPTCHA ─────────────────────────────────────────────────────────────
// Moved to ./TextCaptcha.tsx — import TextCaptcha from there.

// ─── Types ────────────────────────────────────────────────────────────────────
type LoginStep = 'identity' | 'password' | 'otp' | 'forgot' | 'forgot_otp' | 'forgot_done';
type SignupStep = 'initial' | 'email_otp' | 'mobile' | 'mobile_otp' | 'details';

interface AuthFormProps {
  mode: 'login' | 'signup';
}

// ─── OtpBlock — top-level so React never remounts it on parent re-render ──────
interface OtpBlockProps {
  title: string;
  subtitle: string;
  otp: string;
  onOtpChange: (v: string) => void;
  error: string | null;
  isLoading: boolean;
  resendCooldown: number;
  onSubmit: (e: React.FormEvent) => void;
  onResend: () => void;
}

function OtpBlock({
  title,
  subtitle,
  otp,
  onOtpChange,
  error,
  isLoading,
  resendCooldown,
  onSubmit,
  onResend,
}: OtpBlockProps) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="otp-block"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.25 }}
        className="space-y-6"
      >
        <div className="text-center space-y-2">
          <h3 className="text-xl font-semibold text-foreground">{title}</h3>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
        {error && (
          <div className="py-2 px-3 bg-destructive/10 text-destructive text-sm rounded-md">
            {error}
          </div>
        )}
        <form onSubmit={onSubmit} className="space-y-6">
          <div className="flex justify-center">
            <InputOTP maxLength={6} value={otp} onChange={onOtpChange}>
              <InputOTPGroup>
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <InputOTPSlot key={i} index={i} />
                ))}
              </InputOTPGroup>
            </InputOTP>
          </div>
          <Button
            type="submit"
            className="w-full h-11 text-base font-medium"
            disabled={isLoading || otp.length !== 6}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verifying...
              </>
            ) : (
              <>
                Verify code <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
          <div className="text-center">
            <button
              type="button"
              className="text-sm text-muted-foreground hover:text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={onResend}
              disabled={isLoading || resendCooldown > 0}
            >
              {resendCooldown > 0
                ? `Resend in ${resendCooldown}s`
                : "Didn't receive the code? Resend"}
            </button>
          </div>
        </form>
      </motion.div>
    </AnimatePresence>
  );
}

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const { setUser, setUserInfo } = useAuthStore();

  // Support ?callbackUrl= redirect after login
  const callbackUrl =
    typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get('callbackUrl')
      : null;

  // ── Login state ────────────────────────────────────────────────────────────
  const [loginStep, setLoginStep] = useState<LoginStep>('identity');
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [identityType, setIdentityType] = useState<IdentityType>('username');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState('');

  // ── Forgot password state (UI-only — no reset API yet) ────────────────────
  const [forgotIdentifier, setForgotIdentifier] = useState('');
  const [forgotIdentifierError, setForgotIdentifierError] = useState<string | null>(null);
  const [forgotOtp, setForgotOtp] = useState('');

  // ── Signup state ───────────────────────────────────────────────────────────
  const [signupStep, setSignupStep] = useState<SignupStep>('initial');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [smsConsent, setSmsConsent] = useState(false);
  const [username, setUsername] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [profilePicture, setProfilePicture] = useState<string | undefined>(undefined);

  // ── CAPTCHA ────────────────────────────────────────────────────────────────
  const loginCaptchaRef = useRef<TextCaptchaHandle>(null);
  const signupCaptchaRef = useRef<TextCaptchaHandle>(null);

  // ── Shared ─────────────────────────────────────────────────────────────────
  const [isLoading, setIsLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Field errors
  const [identifierError, setIdentifierError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [mobileError, setMobileError] = useState<string | null>(null);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [confirmPasswordError, setConfirmPasswordError] = useState<string | null>(null);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setInterval(() => setResendCooldown((s) => (s <= 1 ? 0 : s - 1)), 1000);
    return () => clearInterval(t);
  }, [resendCooldown]);

  // ─── LOGIN: Step 1 — identity ──────────────────────────────────────────────
  const handleIdentityContinue = (e: React.FormEvent) => {
    e.preventDefault();
    setIdentifierError(null);
    setError(null);
    if (!loginIdentifier.trim()) {
      setIdentifierError('Please enter your username, email, or mobile number.');
      return;
    }
    if (!CAPTCHA_DISABLED && !loginCaptchaRef.current?.validate()) return;
    const type = detectIdentity(loginIdentifier.trim());
    setIdentityType(type);
    setLoginStep('password');
  };

  // ─── LOGIN: Step 2 — password submit ──────────────────────────────────────
  const handleLoginPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setPasswordError(null);
    if (!password) {
      setPasswordError('Please enter your password.');
      return;
    }
    setIsLoading(true);
    try {
      const data = await authApi.login({ username: loginIdentifier.trim(), password });
      setUser({
        username: data.username,
        authenticated: data.authenticated,
        roles: data.roles
          ? Array.isArray(data.roles)
            ? data.roles.map((r) => (typeof r === 'string' ? { authority: r } : r))
            : []
          : undefined,
      });
      const userInfo = await usersApi.getSelfInfo();
      setUserInfo(userInfo);
      if (userInfo.promptChangePassword) {
        router.push('/change-password');
        return;
      }
      if (!userInfo.emailIdVerified || !userInfo.mobileNoVerified) {
        router.push('/verify');
        return;
      }
      if (callbackUrl) {
        router.push(callbackUrl);
        return;
      }
      const isAdmin = userInfo.permissions?.some(
        (a) => a === 'superadmin' || a === 'ROLE_SUPERADMIN' || a === 'platform.superadmin',
      );
      router.push(isAdmin ? '/admin/users' : '/');
    } catch {
      setError('Invalid credentials. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // ─── LOGIN: Send OTP ───────────────────────────────────────────────────────
  const handleSendLoginOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      await authApi.sendOtp({ username: loginIdentifier.trim(), purpose: 'LOGIN' });
      setLoginStep('otp');
      setResendCooldown(OTP_RESEND_COOLDOWN_SEC);
      setOtp('');
    } catch {
      setError('Failed to send OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // ─── LOGIN: Verify OTP ─────────────────────────────────────────────────────
  const handleVerifyLoginOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      await authApi.verifyOtp({ username: loginIdentifier.trim(), code: otp, purpose: 'LOGIN' });
      setUser({ username: loginIdentifier.trim(), roles: [], authenticated: true });
      router.push(callbackUrl ?? '/');
    } catch {
      setError('Invalid or expired OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // ─── LOGIN: Forgot password (UI-only fake flow — no reset API yet) ───────
  const handleForgotPasswordClick = () => {
    setError(null);
    setForgotIdentifier(loginIdentifier);
    setForgotIdentifierError(null);
    setForgotOtp('');
    setLoginStep('forgot');
  };

  const handleSendForgotOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    setForgotIdentifierError(null);
    if (!forgotIdentifier.trim()) {
      setForgotIdentifierError('Please enter your username, email, or mobile number.');
      return;
    }
    setIsLoading(true);
    // No reset-password API yet — simulate sending an OTP.
    await new Promise((resolve) => setTimeout(resolve, 800));
    setLoginStep('forgot_otp');
    setResendCooldown(OTP_RESEND_COOLDOWN_SEC);
    setForgotOtp('');
    setIsLoading(false);
  };

  const handleVerifyForgotOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    // No reset-password API yet — simulate verifying the OTP.
    await new Promise((resolve) => setTimeout(resolve, 800));
    setLoginStep('forgot_done');
    setIsLoading(false);
  };

  // ─── SIGNUP handlers (unchanged logic) ────────────────────────────────────
  const handleSendEmailOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    setEmailError(null);
    if (!email.trim()) {
      setEmailError('Please enter your email address.');
      return;
    }
    // Validate captcha only on first submission (e is present = form submit, not resend)
    if (e && !CAPTCHA_DISABLED && !signupCaptchaRef.current?.validate()) return;
    setIsLoading(true);
    try {
      const emailExists: unknown = await usersApi.checkEmailExists(email.trim());
      const emailObj =
        emailExists && typeof emailExists === 'object'
          ? (emailExists as { exists?: boolean; data?: boolean })
          : null;
      if (emailExists === true || emailObj?.exists === true || emailObj?.data === true) {
        setEmailError('Email is already registered.');
        setIsLoading(false);
        return;
      }
      await authApi.sendOtp({ username: email.trim(), purpose: 'EMAIL_VERIFICATION' });
      setSignupStep('email_otp');
      setResendCooldown(OTP_RESEND_COOLDOWN_SEC);
      setOtp('');
    } catch {
      setError('Failed to send OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMobileOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    setMobileError(null);
    if (!mobile.trim()) {
      setMobileError('Please enter your mobile number.');
      return;
    }
    if (!smsConsent) {
      setMobileError('Please consent to receive SMS messages to continue.');
      return;
    }
    setIsLoading(true);
    try {
      const mobileExists: unknown = await usersApi.checkMobileExists(mobile.trim());
      const mobileObj =
        mobileExists && typeof mobileExists === 'object'
          ? (mobileExists as { exists?: boolean; data?: boolean })
          : null;
      if (mobileExists === true || mobileObj?.exists === true || mobileObj?.data === true) {
        setMobileError('Mobile number is already registered.');
        setIsLoading(false);
        return;
      }
      await authApi.sendOtp({ username: mobile.trim(), purpose: 'MOBILE_VERIFICATION' });
      setSignupStep('mobile_otp');
      setResendCooldown(OTP_RESEND_COOLDOWN_SEC);
      setOtp('');
    } catch {
      setError('Failed to send OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      if (signupStep === 'email_otp') {
        await authApi.verifyOtp({
          username: email.trim(),
          code: otp,
          purpose: 'EMAIL_VERIFICATION',
        });
        setSignupStep('mobile');
        setOtp('');
        return;
      }
      if (signupStep === 'mobile_otp') {
        await authApi.verifyOtp({
          username: mobile.trim(),
          code: otp,
          purpose: 'MOBILE_VERIFICATION',
        });
        setSignupStep('details');
        setOtp('');
        return;
      }
    } catch {
      setError('Invalid or expired OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignupDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setUsernameError(null);
    setPasswordError(null);
    setConfirmPasswordError(null);
    const passwordRegex = PASSWORD_PATTERN;
    if (!passwordRegex.test(signupPassword)) {
      setPasswordError(PASSWORD_ERROR);
      return;
    }
    if (signupPassword !== confirmPassword) {
      setConfirmPasswordError('Passwords do not match.');
      return;
    }
    setIsLoading(true);
    try {
      const [usernameExists, mobileExists] = await Promise.all([
        usersApi.checkUsernameExists(username.trim()),
        usersApi.checkMobileExists(mobile.trim()),
      ]);
      const isUsernameTaken =
        usernameExists === true ||
        (usernameExists &&
          typeof usernameExists === 'object' &&
          ((usernameExists as { exists?: boolean }).exists === true ||
            (usernameExists as { data?: boolean }).data === true));
      const isMobileTaken =
        mobileExists === true ||
        (mobileExists &&
          typeof mobileExists === 'object' &&
          ((mobileExists as { exists?: boolean }).exists === true ||
            (mobileExists as { data?: boolean }).data === true));
      if (isUsernameTaken) {
        setUsernameError('Username is already taken.');
        setIsLoading(false);
        return;
      }
      if (isMobileTaken) {
        setMobileError('Mobile number is already registered.');
        setIsLoading(false);
        return;
      }
      await authApi.signup({
        username: username.trim(),
        emailId: email.trim(),
        mobileNo: mobile.trim(),
        firstName,
        lastName,
        password: signupPassword,
        profilePicture: profilePicture ?? null,
      });
      router.push('/login?registered=1');
    } catch (err) {
      const parsed = parseApiError(err);
      if (Object.keys(parsed.fieldErrors).length > 0) {
        if (parsed.fieldErrors.username) setUsernameError(parsed.fieldErrors.username);
        if (parsed.fieldErrors.emailId) setEmailError(parsed.fieldErrors.emailId);
        if (parsed.fieldErrors.mobileNo) setMobileError(parsed.fieldErrors.mobileNo);
        if (parsed.fieldErrors.password) setPasswordError(parsed.fieldErrors.password);
      } else {
        setError(parsed.general ?? 'Failed to create account. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = () => {
    window.location.href = 'http://localhost:8090/oauth2/authorization/google';
  }; // ─── LOGIN OTP step ────────────────────────────────────────────────────────
  if (mode === 'login' && loginStep === 'otp') {
    return (
      <OtpBlock
        title="Verify your identity"
        subtitle={`We've sent a 6-digit code to ${loginIdentifier}`}
        otp={otp}
        onOtpChange={setOtp}
        error={error}
        isLoading={isLoading}
        resendCooldown={resendCooldown}
        onSubmit={handleVerifyLoginOtp}
        onResend={handleSendLoginOtp}
      />
    );
  }

  // ─── LOGIN: Forgot password — identity step ───────────────────────────────
  if (mode === 'login' && loginStep === 'forgot') {
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key="forgot"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.25 }}
          className="space-y-6"
        >
          <div className="space-y-1">
            <button
              type="button"
              onClick={() => {
                setLoginStep('password');
                setError(null);
              }}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-3"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back
            </button>
            <h3 className="text-xl font-semibold text-foreground">Reset your password</h3>
            <p className="text-sm text-muted-foreground">
              Enter your username, email, or mobile number and we&apos;ll send you a one-time code
              to verify it&apos;s you.
            </p>
          </div>

          {error && (
            <div className="py-2 px-3 bg-destructive/10 text-destructive text-sm rounded-md">
              {error}
            </div>
          )}

          <form onSubmit={handleSendForgotOtp} className="space-y-4">
            <div className="space-y-1.5">
              <Label
                htmlFor="forgot-identity"
                className={forgotIdentifierError ? 'text-destructive' : ''}
              >
                Username, email or mobile
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="forgot-identity"
                  type="text"
                  placeholder="Enter username, email or 10-digit mobile"
                  value={forgotIdentifier}
                  onChange={(e) => {
                    setForgotIdentifier(e.target.value);
                    if (forgotIdentifierError) setForgotIdentifierError(null);
                  }}
                  className={`pl-9 ${forgotIdentifierError ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                  autoComplete="username"
                  autoFocus
                />
              </div>
              {forgotIdentifierError && (
                <p className="text-sm font-medium text-destructive">{forgotIdentifierError}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full h-11 text-base font-medium"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending code...
                </>
              ) : (
                <>
                  Send OTP <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </form>
        </motion.div>
      </AnimatePresence>
    );
  }

  // ─── LOGIN: Forgot password — OTP step ────────────────────────────────────
  if (mode === 'login' && loginStep === 'forgot_otp') {
    return (
      <OtpBlock
        title="Verify your identity"
        subtitle={`We've sent a 6-digit code to ${forgotIdentifier}`}
        otp={forgotOtp}
        onOtpChange={setForgotOtp}
        error={error}
        isLoading={isLoading}
        resendCooldown={resendCooldown}
        onSubmit={handleVerifyForgotOtp}
        onResend={handleSendForgotOtp}
      />
    );
  }

  // ─── LOGIN: Forgot password — done ─────────────────────────────────────────
  if (mode === 'login' && loginStep === 'forgot_done') {
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key="forgot-done"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.25 }}
          className="space-y-6 text-center"
        >
          <div className="flex justify-center">
            <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
              <CheckCircle2 className="h-7 w-7 text-primary" />
            </div>
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-semibold text-foreground">Code verified</h3>
            <p className="text-sm text-muted-foreground">
              We&apos;ve sent password reset instructions to {forgotIdentifier}. Follow them to set
              a new password.
            </p>
          </div>
          <Button
            type="button"
            className="w-full h-11 text-base font-medium"
            onClick={() => {
              setLoginStep('identity');
              setPassword('');
              setForgotIdentifier('');
              setForgotOtp('');
              setError(null);
            }}
          >
            Back to Sign In
          </Button>
        </motion.div>
      </AnimatePresence>
    );
  }

  // ─── LOGIN: Step 2 — password / OTP ───────────────────────────────────────
  if (mode === 'login' && loginStep === 'password') {
    const canUseOtp = identityType === 'email' || identityType === 'mobile';
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key="login-password"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.25 }}
          className="space-y-6"
        >
          <div className="space-y-1">
            <button
              type="button"
              onClick={() => {
                setLoginStep('identity');
                setPassword('');
                setError(null);
              }}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-3"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back
            </button>
            <div className="flex items-center gap-2 rounded-lg bg-muted/40 border border-border px-3 py-2">
              {identityType === 'email' ? (
                <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
              ) : identityType === 'mobile' ? (
                <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
              ) : (
                <User className="h-4 w-4 text-muted-foreground shrink-0" />
              )}
              <span className="text-sm text-foreground font-medium">{loginIdentifier}</span>
            </div>
          </div>

          {error && (
            <div className="py-2 px-3 bg-destructive/10 text-destructive text-sm rounded-md">
              {error}
            </div>
          )}

          <form onSubmit={handleLoginPassword} className="space-y-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="login-password" className={passwordError ? 'text-destructive' : ''}>
                  Password
                </Label>
                <button
                  type="button"
                  onClick={handleForgotPasswordClick}
                  className="text-xs text-muted-foreground hover:text-primary transition-colors"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (passwordError) setPasswordError(null);
                  }}
                  className={`pr-10 ${passwordError ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {passwordError && (
                <p className="text-sm font-medium text-destructive">{passwordError}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full h-11 text-base font-medium"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  Sign In <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>

            {canUseOtp && (
              <>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <Separator className="w-full" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-3 text-muted-foreground">Or</span>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-11 text-base font-medium"
                  disabled={isLoading}
                  onClick={handleSendLoginOtp}
                >
                  <KeyRound className="mr-2 h-4 w-4" />
                  Sign in with OTP
                </Button>
              </>
            )}
          </form>
        </motion.div>
      </AnimatePresence>
    );
  }

  // ─── SIGNUP: OTP steps ─────────────────────────────────────────────────────
  if (mode === 'signup' && signupStep === 'email_otp') {
    return (
      <OtpBlock
        title="Verify your email"
        subtitle={`We've sent a 6-digit code to ${email}`}
        otp={otp}
        onOtpChange={setOtp}
        error={error}
        isLoading={isLoading}
        resendCooldown={resendCooldown}
        onSubmit={handleVerifyOtp}
        onResend={handleSendEmailOtp}
      />
    );
  }
  if (mode === 'signup' && signupStep === 'mobile') {
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key="mobile"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.25 }}
          className="space-y-6"
        >
          <div className="text-center space-y-2">
            <h3 className="text-xl font-semibold text-foreground">Verify your mobile</h3>
            <p className="text-sm text-muted-foreground">Enter your 10-digit mobile number.</p>
          </div>
          {error && (
            <div className="py-2 px-3 bg-destructive/10 text-destructive text-sm rounded-md">
              {error}
            </div>
          )}
          <form onSubmit={handleSendMobileOtp} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="signup-mobile" className={mobileError ? 'text-destructive' : ''}>
                Mobile Number
              </Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="signup-mobile"
                  type="tel"
                  placeholder="10-digit mobile number"
                  value={mobile}
                  onChange={(e) => {
                    setMobile(e.target.value);
                    if (mobileError) setMobileError(null);
                  }}
                  className={`pl-9 ${mobileError ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                  required
                />
              </div>
              {mobileError && <p className="text-sm font-medium text-destructive">{mobileError}</p>}
            </div>
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={smsConsent}
                onChange={(e) => {
                  setSmsConsent(e.target.checked);
                  if (mobileError) setMobileError(null);
                }}
                className="mt-0.5 h-4 w-4 rounded border-input accent-primary shrink-0"
              />
              <span className="text-xs text-muted-foreground leading-relaxed">
                I consent to receive SMS messages (including OTPs) on this mobile number for
                authentication purposes. Standard messaging rates may apply.
              </span>
            </label>
            <Button
              type="submit"
              className="w-full h-11 text-base font-medium"
              disabled={isLoading || !smsConsent}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending OTP...
                </>
              ) : (
                <>
                  Continue <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </form>
        </motion.div>
      </AnimatePresence>
    );
  }
  if (mode === 'signup' && signupStep === 'mobile_otp') {
    return (
      <OtpBlock
        title="Verify your mobile"
        subtitle={`We've sent a 6-digit code to ${mobile}`}
        otp={otp}
        onOtpChange={setOtp}
        error={error}
        isLoading={isLoading}
        resendCooldown={resendCooldown}
        onSubmit={handleVerifyOtp}
        onResend={handleSendMobileOtp}
      />
    );
  }
  if (mode === 'signup' && signupStep === 'details') {
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key="details"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.25 }}
          className="space-y-6"
        >
          <div className="text-center space-y-1">
            <h3 className="text-xl font-semibold text-foreground">Complete your profile</h3>
            <p className="text-xs text-muted-foreground">
              Email: <span className="font-medium text-foreground">{email}</span> · Mobile:{' '}
              <span className="font-medium text-foreground">{mobile}</span>
            </p>
          </div>
          {error && (
            <div className="py-2 px-3 bg-destructive/10 text-destructive text-sm rounded-md">
              {error}
            </div>
          )}
          <form onSubmit={handleSignupDetails} className="space-y-4">
            <AvatarUpload
              value={profilePicture}
              onChange={setProfilePicture}
              fallbackText={
                `${firstName.trim()[0] ?? ''}${lastName.trim()[0] ?? ''}`.toUpperCase() || undefined
              }
            />
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <Label
                  htmlFor="signup-username"
                  className={usernameError ? 'text-destructive' : ''}
                >
                  Username
                </Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button type="button" className="text-muted-foreground hover:text-foreground">
                      <HelpCircle className="h-3.5 w-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs text-xs">
                    {USERNAME_RULES}
                  </TooltipContent>
                </Tooltip>
              </div>
              <Input
                id="signup-username"
                type="text"
                placeholder="johndoe123"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  if (usernameError) setUsernameError(null);
                }}
                className={usernameError ? 'border-destructive focus-visible:ring-destructive' : ''}
                required
              />
              {usernameError && (
                <p className="text-sm font-medium text-destructive">{usernameError}</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  type="text"
                  placeholder="John"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  type="text"
                  placeholder="Doe"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="signup-password" className={passwordError ? 'text-destructive' : ''}>
                Create Password
              </Label>
              <div className="relative">
                <Input
                  id="signup-password"
                  type={showSignupPassword ? 'text' : 'password'}
                  placeholder="Min 6 chars, uppercase, lowercase & digit"
                  value={signupPassword}
                  onChange={(e) => {
                    setSignupPassword(e.target.value);
                    if (passwordError) setPasswordError(null);
                  }}
                  required
                  className={`pr-10 ${passwordError ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                />
                <button
                  type="button"
                  onClick={() => setShowSignupPassword(!showSignupPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showSignupPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {passwordError && (
                <p className="text-sm font-medium text-destructive">{passwordError}</p>
              )}
              <p className="text-xs text-muted-foreground">{PASSWORD_RULES}</p>
            </div>
            <div className="space-y-1.5">
              <Label
                htmlFor="signup-confirm"
                className={confirmPasswordError ? 'text-destructive' : ''}
              >
                Confirm Password
              </Label>
              <div className="relative">
                <Input
                  id="signup-confirm"
                  type={showSignupPassword ? 'text' : 'password'}
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (e.target.value && e.target.value !== signupPassword)
                      setConfirmPasswordError('Passwords do not match.');
                    else setConfirmPasswordError(null);
                  }}
                  required
                  className={`pr-10 ${confirmPasswordError ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                />
                <button
                  type="button"
                  onClick={() => setShowSignupPassword(!showSignupPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showSignupPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {confirmPasswordError && (
                <p className="text-sm font-medium text-destructive">{confirmPasswordError}</p>
              )}
            </div>
            <Button
              type="submit"
              className="w-full h-11 text-base font-medium"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                <>
                  Create Account <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </form>
        </motion.div>
      </AnimatePresence>
    );
  }

  // ─── LOGIN: Step 1 — identity + CAPTCHA ───────────────────────────────────
  // ─── SIGNUP: Step 1 — email ────────────────────────────────────────────────
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="initial"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
        transition={{ duration: 0.25 }}
        className="space-y-6"
      >
        {error && (
          <div className="py-2 px-3 bg-destructive/10 text-destructive text-sm rounded-md">
            {error}
          </div>
        )}

        {mode === 'login' ? (
          <form onSubmit={handleIdentityContinue} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="login-identity" className={identifierError ? 'text-destructive' : ''}>
                Username, email or mobile
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="login-identity"
                  type="text"
                  placeholder="Enter username, email or 10-digit mobile"
                  value={loginIdentifier}
                  onChange={(e) => {
                    setLoginIdentifier(e.target.value);
                    if (identifierError) setIdentifierError(null);
                  }}
                  className={`pl-9 ${identifierError ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                  autoComplete="username"
                  autoFocus
                />
              </div>
              {identifierError && (
                <p className="text-sm font-medium text-destructive">{identifierError}</p>
              )}
            </div>

            {!CAPTCHA_DISABLED && <TextCaptcha ref={loginCaptchaRef} />}

            <Button
              type="submit"
              className="w-full h-11 text-base font-medium"
              disabled={isLoading}
            >
              Continue <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </form>
        ) : (
          <form onSubmit={handleSendEmailOtp} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="signup-email" className={emailError ? 'text-destructive' : ''}>
                Email Address
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="signup-email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (emailError) setEmailError(null);
                  }}
                  className={`pl-9 ${emailError ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                  required
                />
              </div>
              {emailError && <p className="text-sm font-medium text-destructive">{emailError}</p>}
            </div>
            {!CAPTCHA_DISABLED && <TextCaptcha ref={signupCaptchaRef} />}
            <Button
              type="submit"
              className="w-full h-11 text-base font-medium"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending OTP...
                </>
              ) : (
                <>
                  Continue <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </form>
        )}

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <Separator className="w-full" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-3 text-muted-foreground">Or continue with</span>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          className="w-full h-11 text-base font-medium"
          onClick={handleGoogleSignIn}
          disabled={isLoading}
        >
          <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          Continue with Google
        </Button>
      </motion.div>
    </AnimatePresence>
  );
}

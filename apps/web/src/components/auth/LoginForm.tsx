'use client';

import { useRef, useState } from 'react';
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
  CheckCircle2,
} from 'lucide-react';
import { Button, Input, Label, Separator } from '@repo/ui';
import { authApi } from '@repo/api';
import { useAuthStore } from '@/store/authStore';
import { motion, AnimatePresence } from 'framer-motion';
import { authUserFromLoginResponse, establishAuthSession } from '@/lib/auth-session';
import { TextCaptcha, type TextCaptchaHandle } from './TextCaptcha';
import { OtpBlock } from './OtpBlock';
import { GoogleSignInButton } from './GoogleSignInButton';
import { useResendCooldown } from './useResendCooldown';
import {
  CAPTCHA_DISABLED,
  OTP_RESEND_COOLDOWN_SEC,
  detectIdentity,
  type IdentityType,
} from './auth-utils';

type LoginStep = 'identity' | 'password' | 'otp' | 'forgot' | 'forgot_otp' | 'forgot_done';

export function LoginForm() {
  const router = useRouter();
  const { setUser, setUserInfo } = useAuthStore();
  const loginCaptchaRef = useRef<TextCaptchaHandle>(null);
  const { resendCooldown, setResendCooldown } = useResendCooldown();

  const callbackUrl =
    typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get('callbackUrl')
      : null;

  const [loginStep, setLoginStep] = useState<LoginStep>('identity');
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [identityType, setIdentityType] = useState<IdentityType>('username');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState('');
  const [forgotIdentifier, setForgotIdentifier] = useState('');
  const [forgotIdentifierError, setForgotIdentifierError] = useState<string | null>(null);
  const [forgotOtp, setForgotOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [identifierError, setIdentifierError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const handleIdentityContinue = (e: React.FormEvent) => {
    e.preventDefault();
    setIdentifierError(null);
    setError(null);
    if (!loginIdentifier.trim()) {
      setIdentifierError('Please enter your username, email, or mobile number.');
      return;
    }
    if (!CAPTCHA_DISABLED && !loginCaptchaRef.current?.validate()) return;
    setIdentityType(detectIdentity(loginIdentifier.trim()));
    setLoginStep('password');
  };

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
      const { redirectPath } = await establishAuthSession(
        setUser,
        setUserInfo,
        authUserFromLoginResponse(data),
        callbackUrl,
      );
      router.push(redirectPath);
    } catch {
      setError('Invalid credentials. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

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

  const handleVerifyLoginOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      await authApi.verifyOtp({ username: loginIdentifier.trim(), code: otp, purpose: 'LOGIN' });
      const { redirectPath } = await establishAuthSession(
        setUser,
        setUserInfo,
        { username: loginIdentifier.trim(), roles: [], authenticated: true },
        callbackUrl,
      );
      router.push(redirectPath);
    } catch {
      setError('Invalid or expired OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

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
    await new Promise((resolve) => setTimeout(resolve, 800));
    setLoginStep('forgot_done');
    setIsLoading(false);
  };

  if (loginStep === 'otp') {
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

  if (loginStep === 'forgot') {
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

  if (loginStep === 'forgot_otp') {
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

  if (loginStep === 'forgot_done') {
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

  if (loginStep === 'password') {
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

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="login-identity"
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
          <Button type="submit" className="w-full h-11 text-base font-medium" disabled={isLoading}>
            Continue <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </form>
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <Separator className="w-full" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-3 text-muted-foreground">Or continue with</span>
          </div>
        </div>
        <GoogleSignInButton disabled={isLoading} />
      </motion.div>
    </AnimatePresence>
  );
}

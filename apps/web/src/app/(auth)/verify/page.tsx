'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Phone, ArrowRight, Loader2, CheckCircle2, Gavel } from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@repo/ui';
import { authApi } from '@repo/api';
import { useAuthStore, useAuthHydrated } from '@/store/authStore';
import { motion, AnimatePresence } from 'framer-motion';

const OTP_RESEND_COOLDOWN = 30;

type VerifyStep = 'email_send' | 'email_otp' | 'mobile_send' | 'mobile_otp' | 'done';

export default function VerifyPage() {
  const router = useRouter();
  const { user, userInfo, setUserInfo, needsVerification } = useAuthStore();
  const hydrated = useAuthHydrated();

  const needsEmail = !!(userInfo && !userInfo.emailIdVerified);
  const needsMobile = !!(userInfo && !userInfo.mobileNoVerified);

  // Determine initial step
  const getInitialStep = (): VerifyStep => {
    if (needsEmail) return 'email_send';
    if (needsMobile) return 'mobile_send';
    return 'done';
  };

  const [step, setStep] = useState<VerifyStep>(getInitialStep);
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Redirect if not logged in or already verified
  useEffect(() => {
    if (!hydrated) return;
    if (!user?.authenticated) {
      router.replace('/login');
      return;
    }
    if (userInfo && !needsVerification()) {
      router.replace('/');
    }
  }, [hydrated, user, userInfo, needsVerification, router]);

  // Cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setInterval(() => setResendCooldown((s) => (s <= 1 ? 0 : s - 1)), 1000);
    return () => clearInterval(t);
  }, [resendCooldown]);

  if (!hydrated || !user?.authenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-background text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden />
        <p className="text-sm font-medium">Loading...</p>
      </div>
    );
  }

  const emailAddress = userInfo?.emailId ?? '';
  const mobileNumber = userInfo?.mobileNo ?? user.username ?? '';

  // Progress indicator
  const steps = [
    ...(needsEmail ? [{ label: 'Email', icon: Mail }] : []),
    ...(needsMobile ? [{ label: 'Mobile', icon: Phone }] : []),
  ];
  const currentStepIndex =
    step === 'email_send' || step === 'email_otp'
      ? 0
      : step === 'mobile_send' || step === 'mobile_otp'
        ? needsEmail
          ? 1
          : 0
        : steps.length;

  const handleSendEmail = async () => {
    setError(null);
    setIsLoading(true);
    try {
      await authApi.sendOtp({ username: emailAddress, purpose: 'EMAIL_VERIFICATION' });
      setOtp('');
      setStep('email_otp');
      setResendCooldown(OTP_RESEND_COOLDOWN);
    } catch {
      setError('Failed to send code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) return;
    setError(null);
    setIsVerifying(true);
    try {
      await authApi.verifyOtp({ username: emailAddress, code: otp, purpose: 'EMAIL_VERIFICATION' });
      if (userInfo) setUserInfo({ ...userInfo, emailIdVerified: true });
      setOtp('');
      setError(null);
      // Move to mobile step if needed, else done
      if (needsMobile) {
        setStep('mobile_send');
      } else {
        setStep('done');
        router.push('/');
      }
    } catch {
      setError('Invalid or expired code. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSendMobile = async () => {
    setError(null);
    setIsLoading(true);
    try {
      await authApi.sendOtp({ username: mobileNumber, purpose: 'MOBILE_VERIFICATION' });
      setOtp('');
      setStep('mobile_otp');
      setResendCooldown(OTP_RESEND_COOLDOWN);
    } catch {
      setError('Failed to send code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyMobile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) return;
    setError(null);
    setIsVerifying(true);
    try {
      await authApi.verifyOtp({
        username: mobileNumber,
        code: otp,
        purpose: 'MOBILE_VERIFICATION',
      });
      if (userInfo) setUserInfo({ ...userInfo, mobileNoVerified: true });
      setStep('done');
      router.push('/');
    } catch {
      setError('Invalid or expired code. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-card border-r border-border relative overflow-hidden flex-col items-center justify-center px-12">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -right-20 -top-20 h-80 w-80 rounded-full bg-primary/5 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 h-80 w-80 rounded-full bg-primary/5 blur-3xl" />
        </div>
        <div className="relative z-10 text-center max-w-sm">
          <div className="flex items-center justify-center gap-2 mb-10">
            <Gavel className="h-7 w-7 text-primary" />
            <span className="font-display text-2xl font-bold text-foreground">
              HAM<span className="text-gradient-gold">MER</span>
            </span>
          </div>
          <h2 className="font-display text-3xl font-bold text-foreground mb-4">
            Secure your account
          </h2>
          <p className="font-body text-muted-foreground leading-relaxed">
            Verifying your contact details keeps your account safe and ensures you receive important
            auction updates.
          </p>

          {/* Step indicators */}
          {steps.length > 1 && (
            <div className="mt-10 flex items-center justify-center gap-4">
              {steps.map((s, i) => {
                const Icon = s.icon;
                const done = i < currentStepIndex;
                const active = i === currentStepIndex;
                return (
                  <div key={s.label} className="flex items-center gap-4">
                    <div className={`flex flex-col items-center gap-1.5`}>
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                          done
                            ? 'bg-primary border-primary'
                            : active
                              ? 'border-primary bg-primary/10'
                              : 'border-border bg-muted'
                        }`}
                      >
                        {done ? (
                          <CheckCircle2 className="h-5 w-5 text-primary-foreground" />
                        ) : (
                          <Icon
                            className={`h-5 w-5 ${active ? 'text-primary' : 'text-muted-foreground'}`}
                          />
                        )}
                      </div>
                      <span
                        className={`font-body text-xs font-medium ${active ? 'text-primary' : done ? 'text-foreground' : 'text-muted-foreground'}`}
                      >
                        {s.label}
                      </span>
                    </div>
                    {i < steps.length - 1 && (
                      <div
                        className={`h-px w-8 mb-5 ${i < currentStepIndex ? 'bg-primary' : 'bg-border'}`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Right panel */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex items-center justify-center gap-2 mb-8 lg:hidden">
            <Gavel className="h-6 w-6 text-primary" />
            <span className="font-display text-xl font-bold text-foreground">
              HAM<span className="text-gradient-gold">MER</span>
            </span>
          </div>

          <AnimatePresence mode="wait">
            {/* ── Email: send step ── */}
            {step === 'email_send' && (
              <motion.div
                key="email_send"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="border-border shadow-card">
                  <CardHeader className="text-center pb-2">
                    <div className="mx-auto mb-3 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <Mail className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="font-display text-2xl">Verify your email</CardTitle>
                    <CardDescription className="font-body">
                      We&apos;ll send a 6-digit code to{' '}
                      <span className="font-medium text-foreground">{emailAddress}</span>
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 pt-4">
                    {error && <p className="text-sm text-destructive text-center">{error}</p>}
                    <Button className="w-full" onClick={handleSendEmail} disabled={isLoading}>
                      {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          Send code <ArrowRight className="ml-2 h-4 w-4" />
                        </>
                      )}
                    </Button>
                    {needsMobile && (
                      <p className="font-body text-xs text-center text-muted-foreground">
                        Step 1 of 2 — email verification
                      </p>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* ── Email: OTP step ── */}
            {step === 'email_otp' && (
              <motion.div
                key="email_otp"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="border-border shadow-card">
                  <CardHeader className="text-center pb-2">
                    <div className="mx-auto mb-3 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <Mail className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="font-display text-2xl">Enter email code</CardTitle>
                    <CardDescription className="font-body">
                      Code sent to{' '}
                      <span className="font-medium text-foreground">{emailAddress}</span>
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-4">
                    {error && <p className="mb-4 text-sm text-destructive text-center">{error}</p>}
                    <form onSubmit={handleVerifyEmail} className="space-y-5">
                      <div className="flex justify-center">
                        <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                          <InputOTPGroup>
                            {[0, 1, 2, 3, 4, 5].map((i) => (
                              <InputOTPSlot key={i} index={i} />
                            ))}
                          </InputOTPGroup>
                        </InputOTP>
                      </div>
                      <Button
                        type="submit"
                        className="w-full"
                        disabled={isVerifying || otp.length !== 6}
                      >
                        {isVerifying ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            Verify email <ArrowRight className="ml-2 h-4 w-4" />
                          </>
                        )}
                      </Button>
                      <div className="text-center">
                        <button
                          type="button"
                          className="font-body text-sm text-muted-foreground hover:text-primary transition-colors disabled:opacity-50"
                          onClick={handleSendEmail}
                          disabled={isLoading || resendCooldown > 0}
                        >
                          {resendCooldown > 0
                            ? `Resend in ${resendCooldown}s`
                            : "Didn't receive it? Resend"}
                        </button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* ── Mobile: send step ── */}
            {step === 'mobile_send' && (
              <motion.div
                key="mobile_send"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="border-border shadow-card">
                  <CardHeader className="text-center pb-2">
                    {needsEmail && (
                      <div className="mx-auto mb-3 flex items-center gap-1.5 text-xs font-body text-emerald font-medium">
                        <CheckCircle2 className="h-4 w-4" />
                        Email verified
                      </div>
                    )}
                    <div className="mx-auto mb-3 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <Phone className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="font-display text-2xl">Verify your mobile</CardTitle>
                    <CardDescription className="font-body">
                      We&apos;ll send a 6-digit code to{' '}
                      <span className="font-medium text-foreground">{mobileNumber}</span>
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 pt-4">
                    {error && <p className="text-sm text-destructive text-center">{error}</p>}
                    <Button className="w-full" onClick={handleSendMobile} disabled={isLoading}>
                      {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          Send code <ArrowRight className="ml-2 h-4 w-4" />
                        </>
                      )}
                    </Button>
                    {needsEmail && (
                      <p className="font-body text-xs text-center text-muted-foreground">
                        Step 2 of 2 — mobile verification
                      </p>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* ── Mobile: OTP step ── */}
            {step === 'mobile_otp' && (
              <motion.div
                key="mobile_otp"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="border-border shadow-card">
                  <CardHeader className="text-center pb-2">
                    <div className="mx-auto mb-3 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <Phone className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="font-display text-2xl">Enter mobile code</CardTitle>
                    <CardDescription className="font-body">
                      Code sent to{' '}
                      <span className="font-medium text-foreground">{mobileNumber}</span>
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-4">
                    {error && <p className="mb-4 text-sm text-destructive text-center">{error}</p>}
                    <form onSubmit={handleVerifyMobile} className="space-y-5">
                      <div className="flex justify-center">
                        <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                          <InputOTPGroup>
                            {[0, 1, 2, 3, 4, 5].map((i) => (
                              <InputOTPSlot key={i} index={i} />
                            ))}
                          </InputOTPGroup>
                        </InputOTP>
                      </div>
                      <Button
                        type="submit"
                        className="w-full"
                        disabled={isVerifying || otp.length !== 6}
                      >
                        {isVerifying ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            Verify mobile <ArrowRight className="ml-2 h-4 w-4" />
                          </>
                        )}
                      </Button>
                      <div className="text-center">
                        <button
                          type="button"
                          className="font-body text-sm text-muted-foreground hover:text-primary transition-colors disabled:opacity-50"
                          onClick={handleSendMobile}
                          disabled={isLoading || resendCooldown > 0}
                        >
                          {resendCooldown > 0
                            ? `Resend in ${resendCooldown}s`
                            : "Didn't receive it? Resend"}
                        </button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

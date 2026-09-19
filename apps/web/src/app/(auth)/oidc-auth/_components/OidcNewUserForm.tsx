'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Eye, EyeOff, ArrowRight, ArrowLeft, HelpCircle, Phone } from 'lucide-react';
import {
  Button,
  Input,
  Label,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@repo/ui';
import { authApi, usersApi } from '@repo/api';
import { useAuthStore } from '@/store/authStore';
import { authUserFromLoginResponse, establishAuthSession } from '@/lib/auth-session';
import { parseApiError } from '@/lib/api-errors';
import { USERNAME_RULES, PASSWORD_PATTERN, PASSWORD_RULES, PASSWORD_ERROR } from '@/lib/validation';
import { OidcStepIndicator } from '@/components/common/wizard/OidcStepIndicator';
import { AuthIllustration } from '@/components/auth/AuthIllustration';
import { AvatarUpload } from '@/components/common/admin/AvatarUpload';

const OTP_COOLDOWN = 30;

type Step = 'details' | 'mobile' | 'mobile_otp' | 'password';

interface OidcNewUserFormProps {
  emailId: string;
  firstName: string;
  lastName: string;
  emailIdVerified: boolean;
  picture?: string;
}

export function OidcNewUserForm({
  emailId,
  firstName,
  lastName,
  emailIdVerified,
  picture,
}: OidcNewUserFormProps) {
  const router = useRouter();
  const { setUser, setUserInfo } = useAuthStore();

  const [step, setStep] = useState<Step>('details');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1 — details
  const [username, setUsername] = useState('');
  const [newFirstName, setNewFirstName] = useState(firstName);
  const [newLastName, setNewLastName] = useState(lastName);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [firstNameError, setFirstNameError] = useState<string | null>(null);
  const [lastNameError, setLastNameError] = useState<string | null>(null);
  const [profilePicture, setProfilePicture] = useState<string | undefined>(undefined);

  // Step 2 — mobile
  const [mobile, setMobile] = useState('');
  const [mobileError, setMobileError] = useState<string | null>(null);

  // Step 3 — OTP
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  // Step 4 — password
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((s) => (s <= 1 ? 0 : s - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  // Pull the Google profile picture in as base64 so it can be edited/removed like any other upload
  useEffect(() => {
    if (!picture) return;
    let cancelled = false;
    fetch(`/api/oidc-picture?url=${encodeURIComponent(picture)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data?.dataUrl) setProfilePicture(data.dataUrl);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [picture]);

  // ── Step 1 ─────────────────────────────────────────────────────────────────
  const handleDetailsNext = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setUsernameError(null);
    setFirstNameError(null);
    setLastNameError(null);
    let hasError = false;
    if (!username.trim()) {
      setUsernameError('Username is required.');
      hasError = true;
    }
    if (!newFirstName.trim()) {
      setFirstNameError('First name is required.');
      hasError = true;
    }
    if (!newLastName.trim()) {
      setLastNameError('Last name is required.');
      hasError = true;
    }
    if (hasError) return;
    setIsLoading(true);
    try {
      const res = await usersApi.checkUsernameExists(username.trim());
      const taken =
        res === true ||
        (res && typeof res === 'object' && (res.exists === true || res.data === true));
      if (taken) {
        setUsernameError('Username is already taken.');
        return;
      }
      setStep('mobile');
    } catch {
      setError('Failed to check username. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // ── Step 2 ─────────────────────────────────────────────────────────────────
  const handleSendMobileOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    setMobileError(null);
    if (!mobile.trim()) {
      setMobileError('Mobile number is required.');
      return;
    }
    setIsLoading(true);
    try {
      const res = await usersApi.checkMobileExists(mobile.trim());
      const taken =
        res === true ||
        (res && typeof res === 'object' && (res.exists === true || res.data === true));
      if (taken) {
        setMobileError('Mobile number is already registered.');
        return;
      }
      await authApi.sendOtp({ username: mobile.trim(), purpose: 'MOBILE_VERIFICATION' });
      setStep('mobile_otp');
      setCooldown(OTP_COOLDOWN);
      setOtp('');
    } catch {
      setError('Failed to send OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // ── Step 3 ─────────────────────────────────────────────────────────────────
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setOtpError(null);
    setIsLoading(true);
    try {
      await authApi.verifyOtp({
        username: mobile.trim(),
        code: otp,
        purpose: 'MOBILE_VERIFICATION',
      });
      setStep('password');
    } catch {
      setOtpError('Invalid or expired OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // ── Step 4 ─────────────────────────────────────────────────────────────────
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setPasswordError(null);
    setConfirmError(null);
    let hasError = false;
    if (!PASSWORD_PATTERN.test(password)) {
      setPasswordError(PASSWORD_ERROR);
      hasError = true;
    }
    if (password !== confirmPassword) {
      setConfirmError('Passwords do not match.');
      hasError = true;
    }
    if (hasError) return;
    setIsLoading(true);
    try {
      await authApi.signup({
        username: username.trim(),
        emailId,
        firstName: newFirstName.trim(),
        lastName: newLastName.trim(),
        mobileNo: mobile.trim(),
        password,
        profilePicture: profilePicture ?? null,
      });
      const loginData = await authApi.login({ username: username.trim(), password });
      const { redirectPath } = await establishAuthSession(
        setUser,
        setUserInfo,
        authUserFromLoginResponse(loginData),
      );
      router.replace(redirectPath);
    } catch (err) {
      const parsed = parseApiError(err);
      setError(parsed.general ?? 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const stepTitle: Record<Step, string> = {
    details: 'Your profile',
    mobile: 'Mobile number',
    mobile_otp: 'Verify mobile',
    password: 'Set a password',
  };

  const stepDesc: Record<Step, React.ReactNode> = {
    details: (
      <>
        Signed in as <span className="font-medium text-foreground">{emailId}</span>
        {emailIdVerified && <span className="ml-1 text-xs text-emerald-500">✓ verified</span>}
      </>
    ),
    mobile: "We'll send a code to verify your number",
    mobile_otp: (
      <>
        Code sent to <span className="font-medium text-foreground">{mobile}</span>
      </>
    ),
    password: 'Choose a strong password for your account',
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:4rem_4rem]" />
        <div className="relative z-10 flex flex-col items-center justify-center w-full px-12">
          <AuthIllustration />
          <div className="text-center mt-8 max-w-md">
            <h2 className="text-3xl font-bold text-primary-foreground mb-4">
              Complete your profile
            </h2>
            <p className="text-primary-foreground/80 text-lg leading-relaxed">
              Just a few steps to finish setting up your account.
            </p>
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 bg-background">
        <div className="w-full max-w-md">
          <Card className="border-0 shadow-xl">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-2xl font-bold">{stepTitle[step]}</CardTitle>
              <CardDescription>{stepDesc[step]}</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <OidcStepIndicator current={step} />

              {error && (
                <div className="mb-4 py-2 px-3 bg-destructive/10 text-destructive text-sm rounded-md">
                  {error}
                </div>
              )}

              {/* Step 1 — Details */}
              {step === 'details' && (
                <form onSubmit={handleDetailsNext} className="space-y-4">
                  <AvatarUpload
                    value={profilePicture}
                    onChange={setProfilePicture}
                    fallbackText={
                      `${newFirstName.trim()[0] ?? ''}${newLastName.trim()[0] ?? ''}`.toUpperCase() ||
                      undefined
                    }
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="fn" className={firstNameError ? 'text-destructive' : ''}>
                        First name
                      </Label>
                      <Input
                        id="fn"
                        placeholder="John"
                        value={newFirstName}
                        onChange={(e) => {
                          setNewFirstName(e.target.value);
                          setFirstNameError(null);
                        }}
                        className={
                          firstNameError ? 'border-destructive focus-visible:ring-destructive' : ''
                        }
                      />
                      {firstNameError && (
                        <p className="text-xs text-destructive">{firstNameError}</p>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="ln" className={lastNameError ? 'text-destructive' : ''}>
                        Last name
                      </Label>
                      <Input
                        id="ln"
                        placeholder="Doe"
                        value={newLastName}
                        onChange={(e) => {
                          setNewLastName(e.target.value);
                          setLastNameError(null);
                        }}
                        className={
                          lastNameError ? 'border-destructive focus-visible:ring-destructive' : ''
                        }
                      />
                      {lastNameError && <p className="text-xs text-destructive">{lastNameError}</p>}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <Label htmlFor="uname" className={usernameError ? 'text-destructive' : ''}>
                        Username
                      </Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <HelpCircle className="h-3.5 w-3.5" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs text-xs">
                          {USERNAME_RULES}
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Input
                      id="uname"
                      placeholder="johndoe123"
                      value={username}
                      autoComplete="off"
                      onChange={(e) => {
                        setUsername(e.target.value);
                        setUsernameError(null);
                      }}
                      className={
                        usernameError ? 'border-destructive focus-visible:ring-destructive' : ''
                      }
                    />
                    {usernameError && <p className="text-xs text-destructive">{usernameError}</p>}
                  </div>
                  <Button type="submit" className="w-full h-11" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Checking...
                      </>
                    ) : (
                      <>
                        Continue <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </form>
              )}

              {/* Step 2 — Mobile */}
              {step === 'mobile' && (
                <form onSubmit={handleSendMobileOtp} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="mob" className={mobileError ? 'text-destructive' : ''}>
                      Mobile number
                    </Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="mob"
                        type="tel"
                        placeholder="10-digit mobile number"
                        value={mobile}
                        onChange={(e) => {
                          setMobile(e.target.value);
                          setMobileError(null);
                        }}
                        className={`pl-9 ${mobileError ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                      />
                    </div>
                    {mobileError && <p className="text-xs text-destructive">{mobileError}</p>}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="h-11"
                      onClick={() => setStep('details')}
                      disabled={isLoading}
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <Button type="submit" className="flex-1 h-11" disabled={isLoading}>
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          Send OTP <ArrowRight className="ml-2 h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              )}

              {/* Step 3 — OTP */}
              {step === 'mobile_otp' && (
                <form onSubmit={handleVerifyOtp} className="space-y-6">
                  <div className="flex justify-center">
                    <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                      <InputOTPGroup>
                        <InputOTPSlot index={0} />
                        <InputOTPSlot index={1} />
                        <InputOTPSlot index={2} />
                        <InputOTPSlot index={3} />
                        <InputOTPSlot index={4} />
                        <InputOTPSlot index={5} />
                      </InputOTPGroup>
                    </InputOTP>
                  </div>
                  {otpError && <p className="text-xs text-destructive text-center">{otpError}</p>}
                  <Button
                    type="submit"
                    className="w-full h-11"
                    disabled={isLoading || otp.length !== 6}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      <>
                        Verify <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                  <div className="text-center">
                    <button
                      type="button"
                      disabled={cooldown > 0 || isLoading}
                      onClick={() => handleSendMobileOtp()}
                      className="text-sm text-muted-foreground hover:text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {cooldown > 0 ? `Resend in ${cooldown}s` : "Didn't receive the code? Resend"}
                    </button>
                  </div>
                </form>
              )}

              {/* Step 4 — Password */}
              {step === 'password' && (
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <Label htmlFor="pwd" className={passwordError ? 'text-destructive' : ''}>
                        Password
                      </Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            className="text-muted-foreground hover:text-foreground"
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
                        id="pwd"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="6–12 chars, uppercase, lowercase, digit"
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          setPasswordError(null);
                        }}
                        className={`pr-10 ${passwordError ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    {passwordError && <p className="text-xs text-destructive">{passwordError}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="cpwd" className={confirmError ? 'text-destructive' : ''}>
                      Confirm password
                    </Label>
                    <Input
                      id="cpwd"
                      type="password"
                      placeholder="Re-enter password"
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        setConfirmError(null);
                      }}
                      className={
                        confirmError ? 'border-destructive focus-visible:ring-destructive' : ''
                      }
                    />
                    {confirmError && <p className="text-xs text-destructive">{confirmError}</p>}
                  </div>
                  <Button type="submit" className="w-full h-11" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating account...
                      </>
                    ) : (
                      <>
                        Complete registration <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </form>
              )}

              <p className="mt-4 text-center text-sm text-muted-foreground">
                <button
                  type="button"
                  onClick={() => router.replace('/login')}
                  className="text-primary hover:underline"
                >
                  Use a different account
                </button>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, ArrowRight, Loader2, Mail, Phone, HelpCircle } from 'lucide-react';
import { Button, Input, Label, Separator, Tooltip, TooltipContent, TooltipTrigger } from '@repo/ui';
import { authApi, usersApi } from '@repo/api';
import { motion, AnimatePresence } from 'framer-motion';
import { parseApiError } from '@/lib/api-errors';
import { USERNAME_RULES, PASSWORD_PATTERN, PASSWORD_RULES, PASSWORD_ERROR } from '@/lib/validation';
import { TextCaptcha, type TextCaptchaHandle } from './TextCaptcha';
import { AvatarUpload } from '@/components/common/admin/AvatarUpload';
import { OtpBlock } from './OtpBlock';
import { GoogleSignInButton } from './GoogleSignInButton';
import { useResendCooldown } from './useResendCooldown';
import { CAPTCHA_DISABLED, OTP_RESEND_COOLDOWN_SEC } from './auth-utils';

type SignupStep = 'initial' | 'email_otp' | 'mobile' | 'mobile_otp' | 'details';

export function SignupForm() {
  const router = useRouter();
  const signupCaptchaRef = useRef<TextCaptchaHandle>(null);
  const { resendCooldown, setResendCooldown } = useResendCooldown();

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
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [mobileError, setMobileError] = useState<string | null>(null);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmPasswordError, setConfirmPasswordError] = useState<string | null>(null);

  const handleSendEmailOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    setEmailError(null);
    if (!email.trim()) {
      setEmailError('Please enter your email address.');
      return;
    }
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
    if (!PASSWORD_PATTERN.test(signupPassword)) {
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

  if (signupStep === 'email_otp') {
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

  if (signupStep === 'mobile') {
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

  if (signupStep === 'mobile_otp') {
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

  if (signupStep === 'details') {
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

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="signup-initial"
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
          <Button type="submit" className="w-full h-11 text-base font-medium" disabled={isLoading}>
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

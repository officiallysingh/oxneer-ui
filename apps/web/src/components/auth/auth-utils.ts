export const OTP_RESEND_COOLDOWN_SEC = 30;

export const CAPTCHA_DISABLED = process.env.NEXT_PUBLIC_CAPTCHA_DISABLED === 'true';

const MOBILE_RE = /^\d{10}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type IdentityType = 'mobile' | 'email' | 'username';

export function detectIdentity(value: string): IdentityType {
  const v = value.trim();
  if (MOBILE_RE.test(v)) return 'mobile';
  if (EMAIL_RE.test(v)) return 'email';
  return 'username';
}

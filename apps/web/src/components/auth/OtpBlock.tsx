'use client';

import { ArrowRight, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button, InputOTP, InputOTPGroup, InputOTPSlot } from '@repo/ui';

export interface OtpBlockProps {
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

export function OtpBlock({
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

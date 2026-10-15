import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { Pill } from '@/components/common/admin/Pill';

interface VerificationMarkProps {
  verified: boolean;
  /** What is verified, for screen readers: "Email", "Mobile". */
  subject: string;
  /** `icon`: compact table mark; `pill`: labelled badge for detail views. */
  variant?: 'icon' | 'pill';
}

/** Verified check, or a warning "Unverified" label. */
export function VerificationMark({ verified, subject, variant = 'icon' }: VerificationMarkProps) {
  if (variant === 'pill') {
    return (
      <Pill tone={verified ? 'success' : 'warning'}>{verified ? 'Verified' : 'Unverified'}</Pill>
    );
  }
  return verified ? (
    <CheckCircle2
      className="h-3.5 w-3.5 shrink-0 text-success"
      role="img"
      aria-label={`${subject} verified`}
    />
  ) : (
    <span className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-warning">
      <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden />
      Unverified
      <span className="sr-only">{subject.toLowerCase()}</span>
    </span>
  );
}

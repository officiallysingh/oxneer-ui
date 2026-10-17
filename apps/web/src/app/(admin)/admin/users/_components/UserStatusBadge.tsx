import { Lock } from 'lucide-react';
import { Pill, type PillTone } from '@/components/common/admin/Pill';
import { getUserStatus, type StatusFlags, type UserStatus } from '../_lib/user-display';

const STATUS: Record<UserStatus, { label: string; tone: PillTone }> = {
  active: { label: 'Active', tone: 'success' },
  disabled: { label: 'Disabled', tone: 'destructive' },
  locked: { label: 'Locked', tone: 'warning' },
  'account-expired': { label: 'Account expired', tone: 'muted' },
  'password-expired': { label: 'Password expired', tone: 'warning' },
};

export function UserStatusBadge({ user }: { user: StatusFlags }) {
  const status = getUserStatus(user);
  const { label, tone } = STATUS[status];
  const locked = status === 'locked';
  return (
    <Pill tone={tone} dot={!locked}>
      {locked && <Lock className="h-[11px] w-[11px]" strokeWidth={2.6} aria-hidden />}
      {label}
    </Pill>
  );
}

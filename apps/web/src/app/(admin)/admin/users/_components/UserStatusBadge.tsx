import type { UserDetailVM } from '@repo/api';
import { Pill, type PillTone } from '@/components/common/admin/Pill';
import { getUserStatus, type UserStatus } from '../_lib/user-display';

const STATUS: Record<UserStatus, { label: string; tone: PillTone }> = {
  active: { label: 'Active', tone: 'success' },
  'password-expired': { label: 'Password expired', tone: 'warning' },
  locked: { label: 'Locked', tone: 'destructive' },
  disabled: { label: 'Disabled', tone: 'destructive' },
};

export function UserStatusBadge({
  user,
}: {
  user: Pick<UserDetailVM, 'enabled' | 'accountNonLocked' | 'credentialsNonExpired'>;
}) {
  const { label, tone } = STATUS[getUserStatus(user)];
  return (
    <Pill tone={tone} dot>
      {label}
    </Pill>
  );
}

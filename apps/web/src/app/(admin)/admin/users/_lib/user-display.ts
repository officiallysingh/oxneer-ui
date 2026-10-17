import type { UserDetailVM } from '@repo/api';

export type UserStatus = 'active' | 'disabled' | 'locked' | 'account-expired' | 'password-expired';

export type StatusFlags = Pick<
  UserDetailVM,
  'enabled' | 'accountNonLocked' | 'accountNonExpired' | 'credentialsNonExpired'
>;

/**
 * One headline status per user: the first failing check wins, in this order —
 * Disabled, Locked, Account expired, Password expired. Otherwise Active.
 */
export function getUserStatus(user: StatusFlags): UserStatus {
  if (!user.enabled) return 'disabled';
  if (!user.accountNonLocked) return 'locked';
  if (!user.accountNonExpired) return 'account-expired';
  if (!user.credentialsNonExpired) return 'password-expired';
  return 'active';
}

export function fullName(user: Pick<UserDetailVM, 'firstName' | 'lastName' | 'username'>) {
  return [user.firstName, user.lastName].filter(Boolean).join(' ') || user.username || '—';
}

export function isSuperAdmin(user: Pick<UserDetailVM, 'roles'>): boolean {
  return (user.roles ?? []).some((r) => {
    const key = `${r.name ?? ''} ${r.label ?? ''}`.toLowerCase().replace(/[^a-z]/g, '');
    return key.includes('superadmin');
  });
}

export function plural(count: number, noun: string) {
  return `${count} ${noun}${count === 1 ? '' : 's'}`;
}

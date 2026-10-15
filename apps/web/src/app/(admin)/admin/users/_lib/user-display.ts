import type { UserDetailVM } from '@repo/api';

export type UserStatus = 'active' | 'disabled' | 'locked' | 'password-expired';

/** One headline status per user, most severe first. */
export function getUserStatus(
  user: Pick<UserDetailVM, 'enabled' | 'accountNonLocked' | 'credentialsNonExpired'>,
): UserStatus {
  if (!user.enabled) return 'disabled';
  if (!user.accountNonLocked) return 'locked';
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

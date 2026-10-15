import type { UserDetailVM } from '@repo/api';

export interface HealthCheck {
  label: string;
  value: string;
  ok: boolean;
}

/** Sign-in related checks shown in the "Account health" panel. */
export function accountHealthChecks(u: UserDetailVM): HealthCheck[] {
  const checks: HealthCheck[] = [
    { label: 'Sign-in', value: u.enabled ? 'Enabled' : 'Disabled', ok: u.enabled },
    {
      label: 'Account lock',
      value: u.accountNonLocked ? 'Not locked' : 'Locked',
      ok: u.accountNonLocked,
    },
    {
      label: 'Account expiry',
      value: u.accountNonExpired ? 'Valid' : 'Expired',
      ok: u.accountNonExpired,
    },
    {
      label: 'Credentials',
      value: u.credentialsNonExpired ? 'Valid' : 'Expired',
      ok: u.credentialsNonExpired,
    },
  ];
  // passwordSet is optional in the API; only report it when known.
  if (u.passwordSet !== undefined) {
    checks.push({ label: 'Password', value: u.passwordSet ? 'Set' : 'Not set', ok: u.passwordSet });
  }
  checks.push({
    label: 'Force password change',
    value: u.promptChangePassword ? 'On' : 'Off',
    ok: !u.promptChangePassword,
  });
  return checks;
}

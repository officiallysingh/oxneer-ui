import type { UserDetailVM } from '@repo/api';

export interface HealthCheck {
  label: string;
  value: string;
  ok: boolean;
}

const yesNo = (v: boolean) => (v ? 'Yes' : 'No');

/**
 * Sign-in checks for the "Account health" panel, worded like the list badge and the
 * Edit user switches.
 */
export function accountHealthChecks(u: UserDetailVM): HealthCheck[] {
  const checks: HealthCheck[] = [
    { label: 'Enabled', value: yesNo(u.enabled), ok: u.enabled },
    { label: 'Locked', value: yesNo(!u.accountNonLocked), ok: u.accountNonLocked },
    { label: 'Account expired', value: yesNo(!u.accountNonExpired), ok: u.accountNonExpired },
    {
      label: 'Password expired',
      value: yesNo(!u.credentialsNonExpired),
      ok: u.credentialsNonExpired,
    },
  ];
  // passwordSet is optional in the API; only report it when known.
  if (u.passwordSet !== undefined) {
    checks.push({ label: 'Password set', value: yesNo(u.passwordSet), ok: u.passwordSet });
  }
  checks.push({
    label: 'Prompt password change',
    value: u.promptChangePassword ? 'On' : 'Off',
    ok: !u.promptChangePassword,
  });
  return checks;
}

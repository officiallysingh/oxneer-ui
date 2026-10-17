import { AlertCircle, CheckCircle2 } from 'lucide-react';
import type { UserDetailVM } from '@repo/api';
import { accountHealthChecks } from '../../_lib/account-health';

/** Sign-in checks with a segmented progress bar. */
export function AccountHealthPanel({ user }: { user: UserDetailVM }) {
  const checks = accountHealthChecks(user);
  const okCount = checks.filter((c) => c.ok).length;

  return (
    <aside
      aria-labelledby="account-health-title"
      className="min-w-0 flex-[1_1_320px] rounded-lg border border-border bg-card"
    >
      <div className="border-b border-border px-5 py-4">
        <h2 id="account-health-title" className="font-display text-base font-semibold">
          Account health
        </h2>
        <p className="mt-0.5 text-[12.5px] text-muted-foreground">
          {okCount} of {checks.length} checks OK
        </p>
        <div className="mt-2.5 flex gap-[3px]" aria-hidden>
          {checks.map((c) => (
            <span
              key={c.label}
              className={`h-1.5 flex-1 rounded-full ${c.ok ? 'bg-success' : 'bg-warning'}`}
            />
          ))}
        </div>
      </div>
      <ul className="px-5 pb-3 pt-1.5">
        {checks.map((c) => (
          <li
            key={c.label}
            className="flex items-center gap-2.5 border-b border-border py-[11px] last:border-b-0"
          >
            {c.ok ? (
              <CheckCircle2 className="h-4 w-4 text-success" role="img" aria-label="OK" />
            ) : (
              <AlertCircle
                className="h-4 w-4 text-warning"
                role="img"
                aria-label="Needs attention"
              />
            )}
            <span className="flex-1 text-[13.5px]">{c.label}</span>
            <span className="text-[13px] text-muted-foreground">{c.value}</span>
          </li>
        ))}
      </ul>
      <p className="px-5 pb-4 text-[12.5px] text-muted-foreground">
        The status badge shows the first check that fails, in this order: Disabled, Locked, Account
        expired, Password expired.
      </p>
    </aside>
  );
}

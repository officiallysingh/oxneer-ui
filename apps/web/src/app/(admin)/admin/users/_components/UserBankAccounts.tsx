'use client';

import type { BankDetailVM } from '@repo/api';
import { FileCheck2, Landmark, Loader2 } from 'lucide-react';
import { BankAccountSummary, hasCheque, useBankAccounts } from '@/components/common/bank';

/** Read-only bank accounts for a user, loading them itself (details drawer). */
export function UserBankAccounts({ username }: { username: string }) {
  const { accounts, isLoading, error } = useBankAccounts({ username });
  return <UserBankAccountList accounts={accounts} isLoading={isLoading} error={error} />;
}

interface UserBankAccountListProps {
  accounts: BankDetailVM[];
  isLoading: boolean;
  error: string | null;
}

/** Read-only list of a user's bank accounts (admin view). */
export function UserBankAccountList({ accounts, isLoading, error }: UserBankAccountListProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-10 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        <span className="text-sm">Loading bank accounts…</span>
      </div>
    );
  }
  if (error) return <p className="text-sm text-destructive">{error}</p>;
  if (accounts.length === 0) {
    return (
      <div className="flex items-center gap-3.5">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground">
          <Landmark className="h-5 w-5" aria-hidden />
        </span>
        <div>
          <p className="font-medium">No bank accounts linked</p>
          <p className="text-[12.5px] text-muted-foreground">
            The user adds accounts from their own profile. Payouts can’t be sent until they do.
          </p>
        </div>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-2.5">
      {accounts.map((a) => (
        <li
          key={a.id}
          className={`flex flex-col gap-2 rounded-lg border p-3.5 ${a.primary ? 'border-primary/40 bg-primary/[0.04]' : 'border-border'}`}
        >
          <BankAccountSummary account={a} />
          {hasCheque(a) && (
            <span className="flex items-center gap-1.5 pl-[58px] text-[12.5px] font-medium text-success">
              <FileCheck2 className="h-3.5 w-3.5" aria-hidden />
              Cheque on file
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}

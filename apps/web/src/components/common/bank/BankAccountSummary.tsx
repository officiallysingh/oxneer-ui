import { Star } from 'lucide-react';
import type { BankDetailVM } from '@repo/api';
import { bankShortName, maskAccountNo } from './bank-utils';

/** Bank tile + name + masked number + Primary badge, with the IFSC underneath. */
export function BankAccountSummary({ account }: { account: BankDetailVM }) {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-3.5">
      <span
        className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-muted font-display text-[12px] font-semibold text-foreground"
        aria-hidden
      >
        {bankShortName(account.bank)}
      </span>
      <div className="flex min-w-0 flex-col gap-0.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-foreground">{account.bank?.name ?? 'Bank'}</span>
          <span className="font-mono tracking-wider text-foreground">
            {maskAccountNo(account.accountNo)}
          </span>
          {account.primary && <PrimaryBadge />}
        </div>
        <span className="text-[12.5px] text-muted-foreground">IFSC {account.ifscCode}</span>
      </div>
    </div>
  );
}

export function PrimaryBadge() {
  return (
    <span className="inline-flex h-[22px] items-center gap-1 rounded-full bg-primary/15 px-2.5 text-xs font-semibold text-primary">
      <Star className="h-3 w-3 fill-current" aria-hidden />
      Primary
    </span>
  );
}

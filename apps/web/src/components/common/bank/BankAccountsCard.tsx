'use client';

import { useState } from 'react';
import {
  FileCheck2,
  Landmark,
  Loader2,
  Lock,
  MoreVertical,
  Pencil,
  Plus,
  Star,
  Trash2,
  Upload,
} from 'lucide-react';
import type { BankDetailVM } from '@repo/api';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@repo/ui';
import { BankAccountDialog } from './BankAccountDialog';
import { BankAccountSummary } from './BankAccountSummary';
import { hasCheque, maskAccountNo } from './bank-utils';
import { RemoveBankAccountDialog } from './RemoveBankAccountDialog';
import { useBankAccounts } from './useBankAccounts';

/** `null` = add; an account = edit it. */
type DialogTarget = { account: BankDetailVM | null } | null;

/** The signed-in user's bank accounts: list, add/edit dialog, make primary, remove. */
export function BankAccountsCard() {
  const bank = useBankAccounts('me');
  const [dialog, setDialog] = useState<DialogTarget>(null);
  const [removing, setRemoving] = useState<BankDetailVM | null>(null);

  const openAdd = () => setDialog({ account: null });
  const openEdit = (account: BankDetailVM) => setDialog({ account });

  return (
    <section
      aria-labelledby="bank-accounts-title"
      className="rounded-xl border border-border bg-card"
    >
      <header className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-4">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
          <Landmark className="h-[18px] w-[18px]" aria-hidden />
        </span>
        <div className="min-w-0 flex-[1_1_200px]">
          <h2 id="bank-accounts-title" className="font-display text-base font-semibold">
            Bank accounts
          </h2>
          <p className="text-[12.5px] text-muted-foreground">
            Payouts go to your <b className="font-semibold text-foreground">primary</b> account.
          </p>
        </div>
        {bank.accounts.length > 0 && (
          <Button size="sm" onClick={openAdd}>
            <Plus />
            Add account
          </Button>
        )}
      </header>

      {bank.isLoading ? (
        <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
          <span className="text-sm">Loading bank accounts…</span>
        </div>
      ) : bank.error ? (
        <p className="px-5 py-4 text-sm text-destructive">{bank.error}</p>
      ) : bank.accounts.length === 0 ? (
        <EmptyBankAccounts onAdd={openAdd} />
      ) : (
        <ul className="divide-y divide-border">
          {bank.accounts.map((a) => (
            <li
              key={a.id}
              className={`flex flex-wrap items-center gap-3.5 px-5 py-4 ${a.primary ? 'bg-primary/[0.04]' : ''}`}
            >
              <BankAccountSummary account={a} />
              {hasCheque(a) ? (
                <span className="flex items-center gap-1.5 text-[12.5px] font-medium text-success">
                  <FileCheck2 className="h-3.5 w-3.5" aria-hidden />
                  Cheque on file
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => openEdit(a)}
                  className="text-[12.5px] font-medium text-primary underline underline-offset-4"
                >
                  Add cheque
                </button>
              )}
              <BankAccountMenu
                account={a}
                busy={bank.busyId === a.id}
                onMakePrimary={() => bank.makePrimary(a)}
                onEdit={() => openEdit(a)}
                onRemove={() => setRemoving(a)}
              />
            </li>
          ))}
        </ul>
      )}

      {bank.accounts.length > 0 && (
        <p className="flex items-center gap-2.5 border-t border-border px-5 py-3 text-[12.5px] text-muted-foreground">
          <Lock className="h-4 w-4 shrink-0" aria-hidden />
          Full account numbers are never shown after saving. Only the last 4 digits are displayed.
        </p>
      )}

      {dialog && (
        <BankAccountDialog
          account={dialog.account}
          banks={bank.banks}
          currentPrimary={bank.primary}
          onClose={() => setDialog(null)}
          onSaved={bank.reload}
        />
      )}

      {removing && (
        <RemoveBankAccountDialog
          account={removing}
          others={bank.accounts.filter((a) => a.id !== removing.id)}
          onCancel={() => setRemoving(null)}
          onConfirm={(newPrimary) => bank.remove(removing, newPrimary)}
        />
      )}
    </section>
  );
}

function BankAccountMenu({
  account,
  busy,
  onMakePrimary,
  onEdit,
  onRemove,
}: {
  account: BankDetailVM;
  busy: boolean;
  onMakePrimary: () => void;
  onEdit: () => void;
  onRemove: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          disabled={busy}
          aria-label={`Actions for ${account.bank?.name ?? 'account'} ${maskAccountNo(account.accountNo)}`}
        >
          {busy ? <Loader2 className="animate-spin" /> : <MoreVertical />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {!account.primary && (
          <DropdownMenuItem onSelect={onMakePrimary}>
            <Star className="mr-2 h-4 w-4" />
            Make primary
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onSelect={onEdit}>
          <Pencil className="mr-2 h-4 w-4" />
          Edit details
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onEdit}>
          <Upload className="mr-2 h-4 w-4" />
          {hasCheque(account) ? 'Replace cheque' : 'Upload cheque'}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={onRemove}
          className="text-destructive focus:bg-destructive/10 focus:text-destructive"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Remove account…
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function EmptyBankAccounts({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center gap-2.5 px-6 py-10 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-full bg-muted text-muted-foreground">
        <Landmark className="h-6 w-6" aria-hidden />
      </span>
      <h3 className="font-display text-[17px] font-semibold">Add a bank account to get paid</h3>
      <p className="max-w-[340px] text-[13px] text-muted-foreground">
        You’ll need it to receive auction payouts. Keep your IFSC code and account number handy. It
        takes about a minute.
      </p>
      <Button className="mt-1.5" onClick={onAdd}>
        <Plus />
        Add bank account
      </Button>
      <p className="text-[12.5px] text-muted-foreground">
        Your first account becomes primary automatically.
      </p>
    </div>
  );
}

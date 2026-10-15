'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  bankDetailsApi,
  getApiErrorMessage,
  masterApi,
  type BankDetailVM,
  type BankVM,
} from '@repo/api';
import { toast } from '@repo/ui';
import { accountLabel } from './bank-utils';

interface Loaded {
  accounts: BankDetailVM[];
  banks: BankVM[];
}

/** The signed-in user's accounts (+ the bank master list); a lone account is made primary. */
async function loadOwnAccounts(): Promise<Loaded> {
  const [accounts, banks] = await Promise.all([bankDetailsApi.getAll(), masterApi.getBanks()]);
  const only = accounts.length === 1 ? accounts[0] : undefined;
  if (only && !only.primary) {
    await bankDetailsApi.update(only.id, { primary: true }).catch(() => undefined);
    only.primary = true;
  }
  return { accounts, banks };
}

/** Primary first, then by bank name. */
function sortAccounts(accounts: BankDetailVM[]) {
  return [...accounts].sort(
    (a, b) =>
      Number(b.primary) - Number(a.primary) ||
      (a.bank?.name ?? '').localeCompare(b.bank?.name ?? ''),
  );
}

/** Whose accounts: the signed-in user's, another user's (read-only, admin), or none yet. */
export type BankAccountsSource = 'me' | { username: string } | null;

/**
 * Bank accounts for `source`. For `'me'` the add/edit/remove helpers apply; pass `null`
 * while the owner isn't known yet (nothing is loaded).
 */
export function useBankAccounts(source: BankAccountsSource) {
  const [data, setData] = useState<Loaded>({ accounts: [], banks: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  // A stable key so `{ username }` objects created each render don't refetch.
  const key = source === null ? null : source === 'me' ? 'me' : `user:${source.username}`;

  useEffect(() => {
    if (key === null) return;
    let cancelled = false;
    const request =
      key === 'me'
        ? loadOwnAccounts()
        : bankDetailsApi
            .getByUsername(key.slice('user:'.length))
            .then((accounts) => ({ accounts, banks: [] }));
    request
      .then((loaded) => {
        if (cancelled) return;
        setData({ ...loaded, accounts: sortAccounts(loaded.accounts) });
        setError(null);
      })
      .catch(() => !cancelled && setError('Failed to load bank accounts.'))
      .finally(() => !cancelled && setIsLoading(false));
    return () => {
      cancelled = true;
    };
  }, [key, version]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);

  const run = async (account: BankDetailVM, action: () => Promise<void>, success: string) => {
    setBusyId(account.id);
    try {
      await action();
      toast.success(success);
      reload();
      return true;
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Something went wrong. Please try again.'));
      return false;
    } finally {
      setBusyId(null);
    }
  };

  const makePrimary = (account: BankDetailVM) =>
    run(
      account,
      () => bankDetailsApi.update(account.id, { primary: true }),
      `${accountLabel(account)} is now your primary account`,
    );

  /** Removes an account; when it is the primary, `newPrimary` is promoted first. */
  const remove = (account: BankDetailVM, newPrimary?: BankDetailVM) =>
    run(
      account,
      async () => {
        if (newPrimary) await bankDetailsApi.update(newPrimary.id, { primary: true });
        await bankDetailsApi.delete(account.id);
      },
      `${accountLabel(account)} removed`,
    );

  return {
    accounts: data.accounts,
    banks: data.banks,
    primary: data.accounts.find((a) => a.primary),
    isLoading,
    error,
    busyId,
    reload,
    makePrimary,
    remove,
  };
}

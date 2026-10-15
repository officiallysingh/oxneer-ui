'use client';

import { useState } from 'react';
import {
  getApiErrorMessage,
  usersApi,
  type RoleVM,
  type UserDetailVM,
  type UserUpdateReq,
} from '@repo/api';
import { toast } from '@repo/ui';
import { plural } from '../_lib/user-display';

interface UserActionsOptions {
  /** Apply a successful change to locally held user data. */
  onUpdated?: (id: string, patch: Partial<UserDetailVM>) => void;
  onDeleted?: (id: string) => void;
  /** Called after any change that can move users between status tabs. */
  onStatusChanged?: () => void;
}

interface PatchSpec {
  body: UserUpdateReq;
  local: Partial<UserDetailVM>;
}

function who(users: Pick<UserDetailVM, 'username'>[]) {
  const only = users.length === 1 ? users[0]?.username : undefined;
  return only ? `@${only}` : plural(users.length, 'user');
}

/** User mutations shared by the list, the details drawer and the edit page, with toasts. */
export function useUserActions({ onUpdated, onDeleted, onStatusChanged }: UserActionsOptions = {}) {
  const [busyIds, setBusyIds] = useState<ReadonlySet<string>>(new Set());

  const track = (ids: string[], busy: boolean) =>
    setBusyIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => (busy ? next.add(id) : next.delete(id)));
      return next;
    });

  /** PATCHes each user; applies successes locally and returns the users that succeeded. */
  const patchEach = async (users: UserDetailVM[], specFor: (u: UserDetailVM) => PatchSpec) => {
    const ids = users.map((u) => u.id);
    track(ids, true);
    const results = await Promise.allSettled(
      users.map(async (u) => {
        const { body, local } = specFor(u);
        await usersApi.updateUser(u.id, body);
        onUpdated?.(u.id, local);
        return u;
      }),
    );
    track(ids, false);
    const succeeded = results.flatMap((r) => (r.status === 'fulfilled' ? [r.value] : []));
    const failed = results.length - succeeded.length;
    if (failed > 0) toast.error(`Couldn't update ${plural(failed, 'user')}. Please try again.`);
    return succeeded;
  };

  const setEnabled = async (users: UserDetailVM[], enabled: boolean, undoable = true) => {
    const done = await patchEach(users, () => ({ body: { enabled }, local: { enabled } }));
    if (done.length === 0) return;
    onStatusChanged?.();
    toast.success(
      `${who(done)} ${enabled ? 'enabled' : 'disabled'}`,
      undoable
        ? { action: { label: 'Undo', onClick: () => void setEnabled(done, !enabled, false) } }
        : undefined,
    );
  };

  const unlock = async (user: UserDetailVM) => {
    const done = await patchEach([user], () => ({
      body: { accountNonLocked: true },
      local: { accountNonLocked: true },
    }));
    if (done.length) toast.success(`${who(done)} unlocked`);
  };

  const assignRole = async (users: UserDetailVM[], role: RoleVM) => {
    const targets = users.filter((u) => !(u.roles ?? []).some((r) => r.id === role.id));
    if (targets.length === 0) {
      toast.info(`Everyone selected already has ${role.label}`);
      return;
    }
    const done = await patchEach(targets, (u) => {
      const roles = [...(u.roles ?? []), role];
      return { body: { roles: roles.map((r) => r.id) }, local: { roles } };
    });
    if (done.length) toast.success(`${role.label} assigned to ${who(done)}`);
  };

  const resetPassword = async (user: UserDetailVM) => {
    track([user.id], true);
    try {
      await usersApi.resetPassword(user.id);
      toast.success(`Password reset for ${who([user])}`);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to reset password.'));
    } finally {
      track([user.id], false);
    }
  };

  /** Resolves true when the user was deleted. */
  const deleteUser = async (user: UserDetailVM) => {
    track([user.id], true);
    try {
      await usersApi.deleteUser(user.id);
      onDeleted?.(user.id);
      onStatusChanged?.();
      toast.success(`${who([user])} deleted`);
      return true;
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to delete user.'));
      return false;
    } finally {
      track([user.id], false);
    }
  };

  return { busyIds, setEnabled, unlock, assignRole, resetPassword, deleteUser };
}

export type UserActions = ReturnType<typeof useUserActions>;

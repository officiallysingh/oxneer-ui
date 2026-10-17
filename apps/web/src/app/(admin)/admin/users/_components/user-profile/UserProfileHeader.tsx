'use client';

import Link from 'next/link';
import { Copy, KeyRound, Pencil } from 'lucide-react';
import type { UserDetailVM } from '@repo/api';
import { Button } from '@repo/ui';
import { copyText } from '@/lib/clipboard';
import { UserActionsMenu, type UserRowHandlers } from '../UserActionsMenu';
import { UserIdentity } from '../UserIdentity';
import { UserStatusBadge } from '../UserStatusBadge';

const shortId = (id: string) => (id.length > 14 ? `${id.slice(0, 8)}…${id.slice(-4)}` : id);

interface UserProfileHeaderProps {
  user: UserDetailVM;
  handlers: Omit<UserRowHandlers, 'onView'>;
}

/** Avatar, name, status, @username, copyable ID and the page actions. */
export function UserProfileHeader({ user, handlers }: UserProfileHeaderProps) {
  const busy = handlers.busyIds.has(user.id);
  return (
    <div className="flex flex-wrap items-center gap-4">
      <div className="min-w-0 flex-[1_1_320px]">
        <UserIdentity
          user={user}
          size="xl"
          as="h1"
          meta={
            <>
              <UserStatusBadge user={user} />
              <span className="inline-flex items-center gap-1 text-[13px] text-muted-foreground">
                ID {shortId(user.id)}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 [&_svg]:size-3.5"
                  onClick={() => copyText(user.id, 'User ID copied')}
                  aria-label="Copy user ID"
                >
                  <Copy />
                </Button>
              </span>
            </>
          }
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" disabled={busy} onClick={() => handlers.onResetPassword(user)}>
          <KeyRound />
          Reset password
        </Button>
        <Button asChild>
          <Link href={`/admin/users/${user.id}/edit`}>
            <Pencil />
            Edit user
          </Link>
        </Button>
        <UserActionsMenu user={user} handlers={handlers} variant="page" />
      </div>
    </div>
  );
}

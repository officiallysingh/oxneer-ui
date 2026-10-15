'use client';

import type { UserDetailVM } from '@repo/api';
import { Checkbox } from '@repo/ui';
import { UserAccessTags } from './UserAccessTags';
import { UserActionsMenu, type UserRowHandlers } from './UserActionsMenu';
import { UserContact } from './UserContact';
import { UserIdentity } from './UserIdentity';
import { UserStatusBadge } from './UserStatusBadge';

interface UserCardProps {
  user: UserDetailVM;
  handlers: UserRowHandlers;
  selected: boolean;
  onSelectedChange: (selected: boolean) => void;
}

/** Mobile list item: same data and actions as a table row. */
export function UserCard({ user, handlers, selected, onSelectedChange }: UserCardProps) {
  return (
    <article
      className={`flex flex-col gap-2.5 rounded-lg border bg-card p-3.5 ${selected ? 'border-primary/50 bg-primary/[0.04]' : 'border-border'}`}
    >
      <div className="flex items-center gap-2.5">
        <Checkbox
          checked={selected}
          onCheckedChange={(v) => onSelectedChange(!!v)}
          aria-label={`Select ${user.username ?? user.emailId}`}
        />
        <button
          type="button"
          onClick={() => handlers.onView(user)}
          className="min-w-0 flex-1 rounded text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <UserIdentity user={user} size="md" />
        </button>
        <UserStatusBadge user={user} />
        <UserActionsMenu user={user} handlers={handlers} />
      </div>
      <UserContact user={user} />
      <UserAccessTags user={user} />
    </article>
  );
}

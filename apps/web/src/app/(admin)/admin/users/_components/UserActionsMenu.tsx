'use client';

import {
  Eye,
  KeyRound,
  Loader2,
  LockOpen,
  MoreVertical,
  Power,
  PowerOff,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import type { UserDetailVM } from '@repo/api';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@repo/ui';
import { isSuperAdmin } from '../_lib/user-display';

/** Everything a row, card or drawer can do to a user. Built once by the page. */
export interface UserRowHandlers {
  onView: (user: UserDetailVM) => void;
  onEdit: (user: UserDetailVM) => void;
  onManageAccess: (user: UserDetailVM) => void;
  onResetPassword: (user: UserDetailVM) => void;
  onToggleEnabled: (user: UserDetailVM) => void;
  onUnlock: (user: UserDetailVM) => void;
  onDelete: (user: UserDetailVM) => void;
  busyIds: ReadonlySet<string>;
}

const TRIGGER_CLASS = {
  row: 'h-9 w-9 text-muted-foreground hover:text-foreground',
  card: '-my-1.5 -mr-2 h-11 w-11 text-muted-foreground hover:text-foreground',
  page: undefined,
} as const;

interface UserActionsMenuProps {
  user: UserDetailVM;
  /** `onView` is optional here: without it the "View details" item is hidden. */
  handlers: Omit<UserRowHandlers, 'onView'> & Partial<Pick<UserRowHandlers, 'onView'>>;
  /**
   * `row`: compact ghost trigger. `card`: 44px touch target for phone cards.
   * `page`: outlined trigger; items the page already shows as buttons are hidden.
   */
  variant?: 'row' | 'card' | 'page';
}

/** "⋮" menu with the per-user actions. */
export function UserActionsMenu({ user, handlers, variant = 'row' }: UserActionsMenuProps) {
  const busy = handlers.busyIds.has(user.id);
  const superAdmin = isSuperAdmin(user);
  const label = user.username ?? user.emailId;
  const onPage = variant === 'page';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={onPage ? 'outline' : 'ghost'}
          size="icon"
          className={TRIGGER_CLASS[variant]}
          aria-label={`More actions for ${label}`}
          disabled={busy}
        >
          {busy ? <Loader2 className="animate-spin" /> : <MoreVertical />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Actions</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {handlers.onView && (
          <DropdownMenuItem onSelect={() => handlers.onView?.(user)}>
            <Eye className="mr-2 h-4 w-4" />
            View details
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onSelect={() => handlers.onManageAccess(user)}>
          <ShieldCheck className="mr-2 h-4 w-4" />
          Manage access
        </DropdownMenuItem>
        {!onPage && (
          <DropdownMenuItem onSelect={() => handlers.onResetPassword(user)}>
            <KeyRound className="mr-2 h-4 w-4" />
            Reset password
          </DropdownMenuItem>
        )}
        {!user.accountNonLocked && (
          <DropdownMenuItem onSelect={() => handlers.onUnlock(user)}>
            <LockOpen className="mr-2 h-4 w-4" />
            Unlock account
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onSelect={() => handlers.onToggleEnabled(user)}>
          {user.enabled ? (
            <PowerOff className="mr-2 h-4 w-4" />
          ) : (
            <Power className="mr-2 h-4 w-4" />
          )}
          {user.enabled ? 'Disable account' : 'Enable account'}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => handlers.onDelete(user)}
          disabled={superAdmin}
          className="text-destructive focus:bg-destructive/10 focus:text-destructive"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          {superAdmin ? 'Superadmin can’t be deleted' : 'Delete user…'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

'use client';

import type { ReactNode } from 'react';
import { LogOut } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@oxneer/ui';
import { UserAvatar } from '@/components/common/admin/UserAvatar';

export interface UserInfoLike {
  firstName?: string;
  lastName?: string;
  profilePicture?: string | null;
}

interface UserMenuProps {
  /** Full trigger element (avatar + name + chevron). Wrapped in DropdownMenuTrigger. */
  trigger: ReactNode;
  username?: string;
  userInfo?: UserInfoLike | null;
  roleLabel?: string;
  align?: 'start' | 'end';
  /** Extra DropdownMenuItems rendered above the sign-out action. */
  extraItems?: ReactNode;
  onSignOut: () => void;
}

export function UserMenu({
  trigger,
  username,
  userInfo,
  roleLabel = 'Administrator',
  align = 'end',
  extraItems,
  onSignOut,
}: UserMenuProps) {
  const displayName = username ?? 'User';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex items-center gap-3 py-1">
            <UserAvatar
              src={userInfo?.profilePicture}
              firstName={userInfo?.firstName}
              lastName={userInfo?.lastName}
              username={displayName}
              size={36}
            />
            <div className="flex flex-col min-w-0">
              <span className="font-body text-sm font-semibold text-foreground truncate">
                {displayName}
              </span>
              <span className="font-body text-xs text-muted-foreground">{roleLabel}</span>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>{extraItems}</DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="gap-2 cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
          onClick={onSignOut}
        >
          <LogOut className="h-4 w-4" />
          <span>Sign out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

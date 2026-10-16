'use client';

import Link from 'next/link';
import { ChevronDown, ExternalLink, Menu, User } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { DropdownMenuItem } from '@repo/ui';
import { resolveTitle } from './nav-config';
import { SidebarToggle } from './SidebarToggle';
import { UserMenu, type UserInfoLike } from './UserMenu';
import { UserAvatar } from '@/components/common/admin/UserAvatar';
import { ThemeToggle } from '@/components/common/Header/ThemeToggle';

const iconButton =
  'items-center justify-center h-9 w-9 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring';

interface AdminTopbarProps {
  username: string;
  userInfo?: UserInfoLike | null;
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  onToggleCollapse: () => void;
  onSignOut: () => void;
}

export function AdminTopbar({
  username,
  userInfo,
  sidebarCollapsed,
  onToggleSidebar,
  onToggleCollapse,
  onSignOut,
}: AdminTopbarProps) {
  const pathname = usePathname();
  const { label } = resolveTitle(pathname);

  return (
    <header className="h-16 border-b border-border bg-card px-4 md:px-6 flex items-center justify-between shrink-0 z-30">
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          className={`flex md:hidden ${iconButton}`}
          onClick={onToggleSidebar}
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <SidebarToggle
          collapsed={sidebarCollapsed}
          onClick={onToggleCollapse}
          className={`hidden md:flex ${iconButton}`}
        />

        <h2 className="font-body text-base font-semibold text-foreground truncate">{label}</h2>
      </div>

      <div className="flex items-center gap-3">
        <ThemeToggle />
        <UserMenu
          username={username}
          userInfo={userInfo}
          roleLabel="Administrator"
          onSignOut={onSignOut}
          extraItems={
            <>
              <DropdownMenuItem asChild>
                <Link href="/profile" className="gap-2 cursor-pointer">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>Profile</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/" className="gap-2 cursor-pointer">
                  <ExternalLink className="h-4 w-4 text-muted-foreground" />
                  <span>Back to site</span>
                </Link>
              </DropdownMenuItem>
            </>
          }
          trigger={
            <button
              type="button"
              className="flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 border border-border hover:bg-muted transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <UserAvatar
                src={userInfo?.profilePicture}
                firstName={userInfo?.firstName}
                lastName={userInfo?.lastName}
                username={username}
                size={30}
              />
              <div className="hidden sm:flex flex-col items-start min-w-0">
                <span className="font-body text-xs font-semibold text-foreground leading-none truncate max-w-[120px]">
                  {username}
                </span>
                <span className="font-body text-xs text-muted-foreground leading-none mt-1">
                  Administrator
                </span>
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground hidden sm:block" />
            </button>
          }
        />
      </div>
    </header>
  );
}

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
    <header className="h-16 border-b border-border bg-card/80 backdrop-blur-md px-6 flex items-center justify-between shrink-0 z-30">
      <div className="flex items-center gap-3">
        <button
          className="md:hidden text-muted-foreground hover:text-foreground transition-colors p-1 rounded-lg hover:bg-accent"
          onClick={onToggleSidebar}
          aria-label="Toggle mobile sidebar"
        >
          <Menu className="h-5 w-5" />
        </button>

        <SidebarToggle
          collapsed={sidebarCollapsed}
          onClick={onToggleCollapse}
          className="hidden md:flex text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-lg hover:bg-accent"
        />

        <div className="flex flex-col min-w-0">
          <p className="font-body text-[11px] uppercase tracking-wider text-muted-foreground">
            Admin
          </p>
          <h2 className="font-body text-sm font-semibold text-foreground truncate">{label}</h2>
        </div>
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
            <button className="flex items-center gap-2.5 rounded-xl px-2.5 py-1.5 hover:bg-accent transition-colors outline-none border border-border/40">
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
                <span className="font-body text-[10px] font-medium text-muted-foreground leading-none mt-1">
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

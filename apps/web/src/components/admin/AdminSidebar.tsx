'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown, ChevronRight, LogOut } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@repo/ui';
import { UserAvatar } from '@/components/common/admin/UserAvatar';
import { navEntries, groupHasActive } from './nav-config';
import type { UserInfoLike } from './UserMenu';

interface AdminSidebarProps {
  username: string;
  userInfo?: UserInfoLike | null;
  collapsed?: boolean;
  onNavClick?: () => void;
  onSignOut: () => void;
}

// Shared item styles: one size, one hover, one active treatment across flat and grouped items.
const focusRing =
  'outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sidebar-ring';
const itemBase = `flex items-center gap-3 h-9 rounded-lg text-sm transition-colors ${focusRing}`;
const itemIdle = 'text-muted-foreground hover:text-foreground hover:bg-sidebar-accent';
const itemActive = 'bg-primary/10 text-foreground font-medium';

interface NavLinkProps {
  href: string;
  label: string;
  description: string;
  icon: React.ElementType;
  active: boolean;
  collapsed: boolean;
  onClick: () => void;
}

function NavLink({
  href,
  label,
  description,
  icon: Icon,
  active,
  collapsed,
  onClick,
}: NavLinkProps) {
  const link = (
    <Link
      href={href}
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      aria-label={collapsed ? label : undefined}
      className={`${itemBase} ${active ? itemActive : itemIdle} ${
        collapsed ? 'justify-center w-full' : 'px-3'
      }`}
    >
      <Icon className={`h-4 w-4 shrink-0 ${active ? 'text-primary' : ''}`} />
      {!collapsed && <span className="font-body flex-1 truncate">{label}</span>}
    </Link>
  );

  if (!collapsed) return link;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right" className="flex flex-col gap-0.5">
        <span className="font-medium text-xs">{label}</span>
        <span className="text-xs text-muted-foreground">{description}</span>
      </TooltipContent>
    </Tooltip>
  );
}

export function AdminSidebar({
  username,
  userInfo,
  collapsed = false,
  onNavClick = () => {},
  onSignOut,
}: AdminSidebarProps) {
  const pathname = usePathname();

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    navEntries.forEach((entry) => {
      if (entry.kind === 'group') init[entry.label] = groupHasActive(entry, pathname);
    });
    return init;
  });

  React.useEffect(() => {
    navEntries.forEach((entry) => {
      if (entry.kind === 'group' && groupHasActive(entry, pathname))
        setOpenGroups((prev) => ({ ...prev, [entry.label]: true }));
    });
  }, [pathname]);

  const toggleGroup = (label: string) =>
    setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }));

  return (
    <TooltipProvider delayDuration={150}>
      <div className="flex flex-col h-full bg-card select-none">
        {/* Brand Header */}
        <div className="h-16 flex items-center px-3.5 border-b border-border shrink-0">
          <Link
            href="/admin"
            aria-label="Oxneer admin home"
            className={`flex items-center gap-3 overflow-hidden py-1 rounded-lg ${focusRing}`}
          >
            {collapsed ? (
              <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-display font-bold text-lg shrink-0">
                O
              </div>
            ) : (
              <>
                <img
                  src="/oxneer_logo_light.svg"
                  alt="Oxneer"
                  className="h-8 w-auto shrink-0 dark:hidden"
                />
                <img
                  src="/oxneer_logo_dark.svg"
                  alt="Oxneer"
                  className="h-8 w-auto shrink-0 hidden dark:block"
                />
              </>
            )}
          </Link>
        </div>

        {/* Navigation List */}
        <nav aria-label="Admin" className="flex-1 overflow-y-auto py-3 px-2 scrollbar-thin">
          {navEntries.map((entry, index) => {
            // ── Flat item (Listings / Auctions) ─────────────────────────────
            if (entry.kind === 'flat') {
              // Separate the flat block from the groups above it.
              const afterGroup = navEntries[index - 1]?.kind === 'group';
              const separator = !afterGroup
                ? 'mt-0.5'
                : collapsed
                  ? 'mt-2 pt-2 border-t border-border'
                  : 'mt-3 pt-3 border-t border-border';
              return (
                <div key={entry.href} className={separator}>
                  <NavLink
                    {...entry}
                    active={pathname.startsWith(entry.href)}
                    collapsed={collapsed}
                    onClick={onNavClick}
                  />
                </div>
              );
            }

            // ── Collapsible group ────────────────────────────────────────────
            const isOpen = !!openGroups[entry.label];
            const hasActive = groupHasActive(entry, pathname);
            const groupId = `admin-nav-${entry.label.toLowerCase().replace(/\s+/g, '-')}`;
            const items = entry.items.map((item) => (
              <NavLink
                key={item.href ?? item.label}
                href={item.href ?? '#'}
                label={item.label}
                description={item.description}
                icon={item.icon}
                active={item.href ? pathname.startsWith(item.href) : false}
                collapsed={collapsed}
                onClick={onNavClick}
              />
            ));

            if (collapsed) {
              return (
                <div
                  key={entry.label}
                  className="space-y-0.5 mt-2 pt-2 border-t border-border first:mt-0 first:pt-0 first:border-t-0"
                >
                  {items}
                </div>
              );
            }

            return (
              <div key={entry.label} className="mt-4 first:mt-0">
                <button
                  type="button"
                  onClick={() => toggleGroup(entry.label)}
                  aria-expanded={isOpen}
                  aria-controls={groupId}
                  className={`w-full flex items-center gap-2 h-7 px-3 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors ${focusRing} ${
                    hasActive ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <span className="flex-1 text-left truncate">{entry.label}</span>
                  <ChevronDown
                    className={`h-3.5 w-3.5 transition-transform duration-200 ${isOpen ? '' : '-rotate-90'}`}
                  />
                </button>

                {isOpen && (
                  <div id={groupId} className="mt-1 space-y-0.5">
                    {items}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* User Profile Footer */}
        <div className="border-t border-border p-2 shrink-0 space-y-0.5">
          {!collapsed ? (
            <Link
              href="/profile"
              onClick={onNavClick}
              className={`flex items-center gap-3 px-2.5 py-2 rounded-lg hover:bg-sidebar-accent transition-colors group ${focusRing}`}
            >
              <UserAvatar
                src={userInfo?.profilePicture}
                firstName={userInfo?.firstName}
                lastName={userInfo?.lastName}
                username={username}
                size={32}
              />
              <div className="min-w-0 flex-1">
                <p className="font-body text-sm font-medium text-foreground truncate leading-snug">
                  {username}
                </p>
                <p className="font-body text-xs text-muted-foreground">Administrator</p>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            </Link>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  href="/profile"
                  onClick={onNavClick}
                  aria-label="Profile"
                  className={`flex justify-center py-1 rounded-lg hover:bg-sidebar-accent transition-colors ${focusRing}`}
                >
                  <UserAvatar
                    src={userInfo?.profilePicture}
                    firstName={userInfo?.firstName}
                    lastName={userInfo?.lastName}
                    username={username}
                    size={32}
                  />
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p className="font-medium text-xs">{username}</p>
                <p className="text-xs text-muted-foreground">Administrator profile</p>
              </TooltipContent>
            </Tooltip>
          )}

          {!collapsed ? (
            <button
              type="button"
              onClick={onSignOut}
              className={`${itemBase} w-full px-3 text-muted-foreground hover:text-destructive hover:bg-destructive/10`}
            >
              <LogOut className="h-4 w-4 shrink-0" />
              <span className="font-body">Sign out</span>
            </button>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={onSignOut}
                  aria-label="Sign out"
                  className={`${itemBase} w-full justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10`}
                >
                  <LogOut className="h-4 w-4 shrink-0" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">Sign out</TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}

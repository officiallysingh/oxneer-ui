'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  User,
  LogOut,
  LayoutDashboard,
  Menu,
  X,
  ChevronDown,
  Settings,
} from 'lucide-react';
import { Button, DropdownMenuItem, DropdownMenuSeparator } from '@repo/ui';
import { useAuthStore } from '@/store/authStore';
import { authApi } from '@repo/api';
import { ThemeToggle } from '@/components/common/Header/ThemeToggle';
import { UserAvatar } from '@/components/common/admin/UserAvatar';
import { UserMenu } from '@/components/admin/UserMenu';

const navLinks = [
  { label: 'Auctions', href: '/#auctions' },
  { label: 'How It Works', href: '/#how-it-works' },
];

const AuctionNavbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const router = useRouter();
  const { user, userInfo, clearUser, isAdmin } = useAuthStore();
  const isLoggedIn = !!user?.authenticated;
  const displayName = userInfo?.firstName
    ? `${userInfo.firstName}${userInfo.lastName ? ` ${userInfo.lastName}` : ''}`
    : (user?.username ?? 'User');

  const handleSignOut = async () => {
    try {
      await authApi.logout();
    } catch {
      /* ignore */
    }
    clearUser();
    router.push('/');
    router.refresh();
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="container mx-auto flex h-16 items-center justify-between px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center hover:opacity-90 transition-opacity">
          <img src="/oxneer_logo_light.svg" alt="Oxneer" className="h-8 w-auto dark:hidden" />
          <img src="/oxneer_logo_dark.svg" alt="Oxneer" className="h-8 w-auto hidden dark:block" />
        </Link>

        {/* Desktop nav links */}
        <div className="hidden items-center gap-8 md:flex">
          {navLinks.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="font-body text-sm tracking-wide text-muted-foreground transition-colors hover:text-primary"
            >
              {item.label}
            </a>
          ))}
        </div>

        {/* Desktop actions */}
        <div className="hidden md:flex items-center gap-2">
          <ThemeToggle />
          {isLoggedIn ? (
            <>
              <UserMenu
                username={displayName}
                userInfo={userInfo}
                roleLabel={isAdmin() ? 'Administrator' : 'Member'}
                onSignOut={handleSignOut}
                extraItems={
                  <>
                    <DropdownMenuItem asChild className="gap-2 cursor-pointer">
                      <Link href="/profile">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span>Profile</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className="gap-2 cursor-pointer">
                      <Link href="/profile">
                        <Settings className="h-4 w-4 text-muted-foreground" />
                        <span>Settings</span>
                      </Link>
                    </DropdownMenuItem>
                    {isAdmin() && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <Link href="/admin/users" className="gap-2 cursor-pointer">
                            <LayoutDashboard className="h-4 w-4 text-muted-foreground" />
                            <span>Admin panel</span>
                          </Link>
                        </DropdownMenuItem>
                      </>
                    )}
                  </>
                }
                trigger={
                  <button className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-secondary transition-colors outline-none">
                    <UserAvatar
                      src={userInfo?.profilePicture}
                      firstName={userInfo?.firstName}
                      lastName={userInfo?.lastName}
                      username={user?.username}
                      size={32}
                    />
                    <span className="hidden lg:block text-sm font-medium text-foreground max-w-[100px] truncate">
                      {displayName}
                    </span>
                    <ChevronDown className="hidden lg:block h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                }
              />
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/login">Sign In</Link>
              </Button>
              <Button variant="gold" size="sm" className="gap-1.5" asChild>
                <Link href="/signup">
                  <User className="h-4 w-4" />
                  Get Started
                </Link>
              </Button>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border bg-background/95 backdrop-blur-xl px-6 py-4 space-y-3">
          {navLinks.map((item) => (
            <a
              key={item.label}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className="block font-body text-sm text-muted-foreground hover:text-primary transition-colors py-1.5"
            >
              {item.label}
            </a>
          ))}
          <div className="pt-3 border-t border-border flex flex-col gap-2">
            {isLoggedIn ? (
              <>
                <div className="flex items-center gap-3 py-1">
                  <UserAvatar
                    src={userInfo?.profilePicture}
                    firstName={userInfo?.firstName}
                    lastName={userInfo?.lastName}
                    username={user?.username}
                    size={36}
                  />
                  <div>
                    <p className="text-sm font-medium text-foreground">{displayName}</p>
                    <p className="text-xs text-muted-foreground">
                      {isAdmin() ? 'Administrator' : 'Member'}
                    </p>
                  </div>
                </div>
                {isAdmin() && (
                  <Button variant="outline" size="sm" asChild className="w-full justify-start">
                    <Link href="/admin/users" onClick={() => setMobileOpen(false)}>
                      <LayoutDashboard className="mr-2 h-4 w-4" />
                      Admin panel
                    </Link>
                  </Button>
                )}
                <Button variant="ghost" size="sm" asChild className="w-full justify-start gap-2">
                  <Link href="/profile" onClick={() => setMobileOpen(false)}>
                    <User className="h-4 w-4" />
                    Profile
                  </Link>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSignOut}
                  className="w-full justify-start gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" asChild className="w-full">
                  <Link href="/login" onClick={() => setMobileOpen(false)}>
                    Sign In
                  </Link>
                </Button>
                <Button variant="gold" size="sm" asChild className="w-full">
                  <Link href="/signup" onClick={() => setMobileOpen(false)}>
                    Get Started
                  </Link>
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default AuctionNavbar;

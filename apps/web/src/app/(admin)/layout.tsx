'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore, useAuthHydrated } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { Sheet, SheetContent, SheetTitle, toast } from '@repo/ui';
import { authApi, getApiErrorMessage } from '@repo/api';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { AdminTopbar } from '@/components/admin/AdminTopbar';
import { PageLoadingScreen } from '@/components/common/PageLoadingScreen';
import { PageErrorProvider } from '@/components/common/admin/PageErrorBanner';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, clearUser, isAdmin, userInfo } = useAuthStore();
  const hydrated = useAuthHydrated();
  const { sidebarOpen, sidebarCollapsed, toggleSidebar, toggleSidebarCollapsed, closeSidebar } =
    useUIStore();

  React.useEffect(() => {
    if (hydrated && (!user || !isAdmin())) router.replace('/login');
  }, [hydrated, user, isAdmin, router]);

  if (!hydrated || !user || !isAdmin()) {
    return <PageLoadingScreen message="Checking access..." />;
  }

  const handleSignOut = async () => {
    try {
      await authApi.logout();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to sign out. Please try again.'));
    }
    clearUser();
    router.push('/login');
  };

  const sidebarProps = {
    username: user.username,
    userInfo: userInfo ?? null,
    collapsed: sidebarCollapsed,
    onSignOut: handleSignOut,
  };

  return (
    <div className="h-screen flex overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <aside
        className={`hidden md:flex flex-col h-full border-r border-border bg-card shrink-0 transition-[width] duration-200 ease-out ${
          sidebarCollapsed ? 'w-16' : 'w-64'
        }`}
      >
        <AdminSidebar {...sidebarProps} />
      </aside>

      {/* Mobile sidebar drawer: Esc, overlay click, close button and focus trap via Sheet */}
      <Sheet open={sidebarOpen} onOpenChange={(open) => !open && closeSidebar()}>
        <SheetContent side="left" className="md:hidden w-72 sm:max-w-72 p-0 gap-0 bg-card">
          <SheetTitle className="sr-only">Admin navigation</SheetTitle>
          <AdminSidebar {...sidebarProps} collapsed={false} onNavClick={closeSidebar} />
        </SheetContent>
      </Sheet>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden h-full">
        <AdminTopbar
          username={user.username}
          userInfo={userInfo ?? null}
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={toggleSidebar}
          onToggleCollapse={toggleSidebarCollapsed}
          onSignOut={handleSignOut}
        />
        <PageErrorProvider>
          {/* `relative` keeps absolutely positioned descendants (e.g. Radix's hidden form inputs)
              inside this scroller instead of stretching the document and scrolling the shell. */}
          <div className="relative flex-1 p-6 overflow-y-auto">{children}</div>
        </PageErrorProvider>
      </main>
    </div>
  );
}

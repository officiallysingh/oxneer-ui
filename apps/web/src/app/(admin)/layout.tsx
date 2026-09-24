'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore, useAuthHydrated } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { authApi } from '@repo/api';
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
    } catch {
      /* ignore */
    }
    clearUser();
    router.push('/login');
  };

  const sidebarProps = {
    username: user.username,
    userInfo: userInfo ?? null,
    collapsed: sidebarCollapsed,
    onToggleCollapse: toggleSidebarCollapsed,
    onSignOut: handleSignOut,
  };

  return (
    <div className="h-screen flex overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <aside
        className={`hidden md:flex flex-col h-full border-r border-border bg-card shrink-0 transition-all duration-300 ease-in-out ${
          sidebarCollapsed ? 'w-16' : 'w-64'
        }`}
      >
        <AdminSidebar {...sidebarProps} />
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-background/80 backdrop-blur-sm transition-opacity"
            onClick={closeSidebar}
          />
          <aside className="relative w-72 bg-card border-r border-border flex flex-col z-10 shadow-2xl">
            <AdminSidebar {...sidebarProps} collapsed={false} onNavClick={closeSidebar} />
          </aside>
        </div>
      )}

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
          <div className="flex-1 p-6 overflow-y-auto">{children}</div>
        </PageErrorProvider>
      </main>
    </div>
  );
}

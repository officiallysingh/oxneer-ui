import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

export interface UIState {
  // Theme
  theme: 'light' | 'dark' | 'system';
  setTheme: (theme: 'light' | 'dark' | 'system') => void;

  // Sidebar
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  openSidebar: () => void;
  closeSidebar: () => void;
  toggleSidebarCollapsed: () => void;

  // Loading states
  globalLoading: boolean;
  setGlobalLoading: (loading: boolean) => void;

  // Notifications
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id'>) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;

  // Modals
  modals: Record<string, boolean>;
  openModal: (modalId: string) => void;
  closeModal: (modalId: string) => void;
  toggleModal: (modalId: string) => void;

  // Page transitions
  pageTransition: boolean;
  setPageTransition: (transitioning: boolean) => void;
}

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export const useUIStore = create<UIState>()(
  devtools(
    persist(
      (set, get) => ({
        // Theme
        theme: 'system',
        setTheme: (theme) => set({ theme }),

        // Sidebar
        sidebarOpen: false,
        sidebarCollapsed: false,
        toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
        openSidebar: () => set({ sidebarOpen: true }),
        closeSidebar: () => set({ sidebarOpen: false }),
        toggleSidebarCollapsed: () =>
          set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

        // Loading states
        globalLoading: false,
        setGlobalLoading: (loading) => set({ globalLoading: loading }),

        // Notifications
        notifications: [],
        addNotification: (notification) => {
          const id = Date.now().toString();
          const newNotification = { ...notification, id };

          set((state) => ({
            notifications: [...state.notifications, newNotification],
          }));

          // Auto-remove notification after duration
          if (notification.duration !== 0) {
            setTimeout(() => {
              get().removeNotification(id);
            }, notification.duration || 5000);
          }
        },
        removeNotification: (id) => {
          set((state) => ({
            notifications: state.notifications.filter((n) => n.id !== id),
          }));
        },
        clearNotifications: () => set({ notifications: [] }),

        // Modals
        modals: {},
        openModal: (modalId) =>
          set((state) => ({
            modals: { ...state.modals, [modalId]: true },
          })),
        closeModal: (modalId) =>
          set((state) => ({
            modals: { ...state.modals, [modalId]: false },
          })),
        toggleModal: (modalId) =>
          set((state) => ({
            modals: { ...state.modals, [modalId]: !state.modals[modalId] },
          })),

        // Page transitions
        pageTransition: false,
        setPageTransition: (transitioning) => set({ pageTransition: transitioning }),
      }),
      {
        name: 'ui-store',
        // Only remember the desktop sidebar preference across reloads.
        partialize: (state) => ({ sidebarCollapsed: state.sidebarCollapsed }),
      },
    ),
    {
      name: 'ui-store',
    },
  ),
);

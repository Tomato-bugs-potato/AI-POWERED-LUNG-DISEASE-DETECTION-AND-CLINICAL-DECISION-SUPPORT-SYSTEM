import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { User } from '@/types';

interface AuthState {
    user: User | null;
    language: 'en' | 'am';
    setUser: (user: User | null) => void;
    setLanguage: (lang: 'en' | 'am') => void;
    logout: () => void;
}

export const useAuthStore = create<AuthState>()(
    devtools(
        persist(
            (set) => ({
                user: null, // Initial mock user or null
                language: 'en',
                setUser: (user) => set({ user }),
                setLanguage: (language) => set({ language }),
                logout: () => set({ user: null }),
            }),
            {
                name: 'auth-storage',
            }
        )
    )
);

interface UIState {
    sidebarOpen: boolean;
    setSidebarOpen: (open: boolean) => void;
    toggleSidebar: () => void;
}

export const useUIStore = create<UIState>()(
    devtools((set) => ({
        sidebarOpen: false,
        setSidebarOpen: (open) => set({ sidebarOpen: open }),
        toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
    }))
);

'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store';
import { toast } from 'sonner';

const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const WARNING_BEFORE_MS = 60 * 1000; // Warn 1 minute before

export function IdleTimeoutProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const warningRef = useRef<NodeJS.Timeout | null>(null);
  const { user, logout } = useAuthStore();

  const handleLogout = useCallback(() => {
    logout();
    toast.error('Session expired due to inactivity');
    router.push('/login');
  }, [logout, router]);

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (warningRef.current) clearTimeout(warningRef.current);

    if (!user) return;

    warningRef.current = setTimeout(() => {
      toast.warning('Your session will expire in 1 minute due to inactivity');
    }, IDLE_TIMEOUT_MS - WARNING_BEFORE_MS);

    timerRef.current = setTimeout(handleLogout, IDLE_TIMEOUT_MS);
  }, [user, handleLogout]);

  useEffect(() => {
    if (!user) return;

    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
    const handler = () => resetTimer();

    events.forEach((event) => document.addEventListener(event, handler, { passive: true }));
    resetTimer();

    return () => {
      events.forEach((event) => document.removeEventListener(event, handler));
      if (timerRef.current) clearTimeout(timerRef.current);
      if (warningRef.current) clearTimeout(warningRef.current);
    };
  }, [user, resetTimer]);

  return <>{children}</>;
}

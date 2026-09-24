'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { Sidebar } from '@/components/Sidebar';
import { useAuth } from '@/lib/authContext';
import { api } from '@/lib/api';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [journeyChecked, setJourneyChecked] = useState(false);
  const [hasProgram, setHasProgram] = useState<boolean | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [loading, user, router]);

  useEffect(() => {
    let isMounted = true;
    const checkJourney = async () => {
      try {
        const pacing = await api.getJourneyPacingStatus();
        if (isMounted) {
          setHasProgram(Boolean(pacing?.has_program));
          setJourneyChecked(true);
        }
      } catch {
        if (isMounted) {
          setHasProgram(true); // Don't block on network error
          setJourneyChecked(true);
        }
      }
    };

    if (!loading && user) {
      checkJourney();
    }

    const handleUpdate = () => {
      checkJourney();
    };
    window.addEventListener('fitlog:journey-updated', handleUpdate);
    return () => {
      isMounted = false;
      window.removeEventListener('fitlog:journey-updated', handleUpdate);
    };
  }, [loading, user]);

  useEffect(() => {
    if (journeyChecked && hasProgram === false) {
      const allowedWithoutProgram = ['/app', '/app/settings', '/app/guidelines', '/app/gym', '/app/trainer'];
      const isAllowed = allowedWithoutProgram.some(
        (p) => pathname === p || pathname.startsWith(p + '/')
      );
      if (!isAllowed) {
        router.replace('/app');
      }
    }
  }, [journeyChecked, hasProgram, pathname, router]);

  const handleToggleSidebar = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setMobileSidebarOpen((prev) => !prev);
    } else {
      setIsSidebarCollapsed((prev) => !prev);
    }
  };

  const handleCollapse = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setMobileSidebarOpen(false);
    } else {
      setIsSidebarCollapsed((prev) => !prev);
    }
  };

  // Keyboard shortcut (Ctrl+B / Cmd+B)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        handleToggleSidebar();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (loading || !user) {
    return <div className="full-page-loader">Loading...</div>;
  }

  return (
    <div className="app-layout-wrapper">
      <Sidebar
        isOpen={mobileSidebarOpen}
        isCollapsed={isSidebarCollapsed}
        onClose={() => setMobileSidebarOpen(false)}
        onToggleCollapse={handleCollapse}
      />

      <div className={`app-main-content-wrap ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        <Navbar
          onToggleSidebar={handleToggleSidebar}
          isSidebarCollapsed={isSidebarCollapsed}
        />
        <main className="app-main-content">
          {children}
        </main>
      </div>
    </div>
  );
}

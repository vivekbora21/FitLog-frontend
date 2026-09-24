'use client';

import React, { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Plus, ChevronDown, Building2, LogOut, Menu, Dumbbell, PanelLeft, PanelLeftOpen, Settings } from 'lucide-react';
import { useAuth } from '@/lib/authContext';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import styles from './Navbar.module.css';

interface NavbarProps {
  onToggleSidebar?: () => void;
  isSidebarCollapsed?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar, isSidebarCollapsed }) => {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const getSectionInfo = () => {
    if (pathname === '/app' || pathname === '/app/') return { title: 'Dashboard', badge: 'Overview' };
    if (pathname.startsWith('/app/workouts/active')) return { title: "Today's Training", badge: 'Live' };
    if (pathname.startsWith('/app/workouts/plan/history/')) return { title: 'Journey Progress & Analytics', badge: 'Journey' };
    if (pathname.startsWith('/app/workouts/plan/history')) return { title: 'Plan History', badge: 'Archive' };
    if (pathname.startsWith('/app/workouts/plan')) return { title: 'Workout Plan', badge: 'Program' };
    if (pathname.startsWith('/app/workouts/routines')) return { title: 'Workout Routines', badge: 'Splits' };
    if (pathname.startsWith('/app/workouts')) return { title: 'Workout History', badge: 'Sessions' };
    if (pathname.startsWith('/app/daily')) return { title: 'Daily Log', badge: 'Check-in' };
    if (pathname.startsWith('/app/progress')) return { title: 'Journey Progress & Analytics', badge: 'Journey' };
    if (pathname.startsWith('/app/nutrition')) return { title: 'Nutrition & Macros', badge: 'Fuel' };
    if (pathname.startsWith('/app/review')) return { title: 'Weekly Review', badge: 'Protocol' };
    if (pathname.startsWith('/app/guidelines')) return { title: 'Program Guidelines', badge: 'Guide' };
    if (pathname.startsWith('/app/expectations')) return { title: 'Milestones & Expectations', badge: 'Transformation' };
    if (pathname.startsWith('/app/settings')) return { title: 'Settings', badge: 'Account' };
    if (pathname.startsWith('/app/trainer')) return { title: 'Trainer Hub', badge: 'Coach Portal' };
    if (pathname.startsWith('/app/gym')) return { title: 'Gym Admin', badge: 'Facility' };
    return { title: 'FitLog Pro', badge: 'App' };
  };

  const section = getSectionInfo();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const userInitial = (user?.full_name || user?.email || 'U')[0].toUpperCase();

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        {/* Left: Sidebar Toggle Button + Page Breadcrumb / Title */}
        <div className={styles.leftSection}>
          {/* Mobile Drawer Toggle Button (desktop uses the border seam toggle button) */}
          <button
            onClick={onToggleSidebar}
            className={`sidebar-toggle-btn ${isSidebarCollapsed ? styles.toggleBtnCollapsed : styles.toggleBtnExpanded}`}
            title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isSidebarCollapsed ? <PanelLeftOpen size={19} /> : <PanelLeft size={19} />}
          </button>

          {/* Current Section Title & Badge */}
          <div className={styles.titleWrap}>
            <h1 className={styles.pageTitle}>
              {section.title}
            </h1>
            <Badge variant="emerald" size="sm">
              {section.badge}
            </Badge>
          </div>
        </div>

        {/* Right: Active Gym Indicator + Quick Action + User Menu */}
        <div className={styles.rightSection}>
          {/* Active Gym Scope Tag - Desktop only */}
          <div className={`gym-tag-desktop ${styles.gymTag}`}>
            <Building2 size={13} color="var(--color-cyan)" />
            <span className={styles.gymTagName}>Apex Performance</span>
          </div>

          <Button size="sm" variant="primary" onClick={() => router.push('/app/workouts/active')}>
            <Plus size={15} strokeWidth={2.5} />
            <span className={styles.workoutBtnText}>Log Workout</span>
          </Button>

          {/* User Menu Dropdown */}
          <div className={styles.dropdownWrap}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className={styles.profileBtn}
              aria-expanded={dropdownOpen}
              aria-label="User profile menu"
            >
              <div className={styles.avatar}>
                {userInitial}
              </div>
              <span className={styles.userNameLabel}>
                {user?.full_name?.split(' ')[0] || user?.email?.split('@')[0]}
              </span>
              <ChevronDown size={14} color="var(--text-muted)" />
            </button>

            {dropdownOpen && (
              <div className={styles.dropdownMenu}>
                <div className={styles.dropdownHeader}>
                  <div className={styles.dropdownHeaderName}>
                    {user?.full_name || 'FitLog Member'}
                  </div>
                  <div className={styles.dropdownHeaderEmail}>
                    {user?.email}
                  </div>
                </div>

                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    router.push('/app/settings');
                  }}
                  className={styles.dropdownItem}
                >
                  <Settings size={14} />
                  <span>Settings</span>
                </button>

                <button
                  onClick={handleLogout}
                  className={`${styles.dropdownItem} ${styles.logoutItem}`}
                >
                  <LogOut size={14} />
                  <span>Log Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

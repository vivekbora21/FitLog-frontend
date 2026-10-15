'use client';

import React, { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  ChevronDown,
  LogOut,
  PanelLeft,
  PanelLeftOpen,
  User,
  Calendar,
  Bell,
  LayoutDashboard,
} from 'lucide-react';
import { useAuth } from '@/lib/authContext';
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
    if (pathname.startsWith('/app/settings')) return { title: 'Profile', badge: 'Account' };
    if (pathname.startsWith('/app/trainer')) return { title: 'Trainer Hub', badge: 'Coach Portal' };
    if (pathname.startsWith('/app/gym')) return { title: 'Gym Admin', badge: 'Facility' };
    return { title: 'FitLog Pro', badge: 'App' };
  };

  const section = getSectionInfo();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const userName = user?.first_name || (user?.full_name ? user.full_name.split(' ')[0] : (user?.username || 'Vivek'));
  const userInitial = userName[0]?.toUpperCase() || 'V';

  // Format date: Tue, Oct 14, 2026
  const formattedDate = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        {/* Left: Sidebar Toggle Button + Page Breadcrumb / Title */}
        <div className={styles.leftSection}>
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
            <LayoutDashboard size={18} className={styles.sectionIcon} />
            <h1 className={styles.pageTitle}>
              {section.title}
            </h1>
            <span className={styles.overviewBadge}>
              {section.badge}
            </span>
          </div>
        </div>

        {/* Right: Date Picker + Notification Bell + User Profile */}
        <div className={styles.rightSection}>
          {/* Date Selector Pill */}
          <div className={styles.dateSelector}>
            <Calendar size={14} className={styles.dateIcon} />
            <span>{formattedDate}</span>
            <ChevronDown size={14} className={styles.chevronIcon} />
          </div>

          {/* Notification Bell with red dot */}
          <button className={styles.bellBtn} title="Notifications" aria-label="Notifications">
            <Bell size={17} />
            <span className={styles.notificationDot} />
          </button>

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
                {userName}
              </span>
              <ChevronDown size={14} color="#64748B" />
            </button>

            {dropdownOpen && (
              <div className={styles.dropdownMenu}>
                <div className={styles.dropdownHeader}>
                  <div className={styles.dropdownHeaderName}>
                    {user?.full_name || 'Vivek'}
                  </div>
                  <div className={styles.dropdownHeaderEmail}>
                    {user?.email || 'svivek431@gmail.com'}
                  </div>
                </div>

                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    router.push('/app/settings');
                  }}
                  className={styles.dropdownItem}
                >
                  <User size={14} />
                  <span>Profile</span>
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

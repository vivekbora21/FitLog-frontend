'use client';

import React, { useState, useMemo } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
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
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  const isTodayPage = pathname === '/app/today' || pathname.startsWith('/app/today');

  const getSectionInfo = () => {
    if (pathname === '/app' || pathname === '/app/') return { title: 'Dashboard', badge: 'Overview' };
    if (pathname.startsWith('/app/today')) return { title: 'Today', badge: 'Live' };
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

  // Selected date management for Today navigation
  const dateParam = searchParams?.get('date');
  const selectedDateObj = useMemo(() => {
    if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
      const parts = dateParam.split('-').map(Number);
      return new Date(parts[0], parts[1] - 1, parts[2]);
    }
    return new Date();
  }, [dateParam]);

  const formattedDate = useMemo(() => {
    return selectedDateObj.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }, [selectedDateObj]);

  const handlePrevDay = () => {
    const prev = new Date(selectedDateObj);
    prev.setDate(prev.getDate() - 1);
    const iso = prev.toISOString().slice(0, 10);
    router.push(`/app/today?date=${iso}`);
  };

  const handleNextDay = () => {
    const next = new Date(selectedDateObj);
    next.setDate(next.getDate() + 1);
    const iso = next.toISOString().slice(0, 10);
    router.push(`/app/today?date=${iso}`);
  };

  const handleDateSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.value) {
      router.push(`/app/today?date=${e.target.value}`);
      setIsDatePickerOpen(false);
    }
  };

  return (
    <header className={`${styles.header} ${isTodayPage ? styles.headerToday : ''}`}>
      <div className={styles.inner}>
        {/* Left Section */}
        {isTodayPage ? (
          <div className={styles.todayLeft}>
            {isSidebarCollapsed && (
              <button
                onClick={onToggleSidebar}
                className={`sidebar-toggle-btn ${styles.toggleBtnCollapsed}`}
                title="Expand sidebar"
                aria-label="Expand sidebar"
              >
                <PanelLeftOpen size={19} />
              </button>
            )}
            <div className={styles.todayTitleGroup}>
              <h1 className={styles.todayPageTitle}>Today</h1>
              <span className={styles.todayDateSubtitle}>+{formattedDate}</span>
            </div>
          </div>
        ) : (
          <div className={styles.leftSection}>
            <button
              onClick={onToggleSidebar}
              className={`sidebar-toggle-btn ${isSidebarCollapsed ? styles.toggleBtnCollapsed : styles.toggleBtnExpanded}`}
              title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isSidebarCollapsed ? <PanelLeftOpen size={19} /> : <PanelLeft size={19} />}
            </button>

            <div className={styles.titleWrap}>
              <LayoutDashboard size={18} className={styles.sectionIcon} />
              <h1 className={styles.pageTitle}>{section.title}</h1>
              <span className={styles.overviewBadge}>{section.badge}</span>
            </div>
          </div>
        )}

        {/* Right Section */}
        {isTodayPage ? (
          <div className={styles.todayHeaderRight}>
            {/* Date Navigator: < Date ▾ > */}
            <div className={styles.todayDateNav}>
              <button
                type="button"
                className={styles.dateNavBtn}
                onClick={handlePrevDay}
                title="Previous day"
                aria-label="Previous day"
              >
                <ChevronLeft size={16} />
              </button>

              <div style={{ position: 'relative' }}>
                <div
                  className={styles.dateSelector}
                  onClick={() => setIsDatePickerOpen(!isDatePickerOpen)}
                  role="button"
                  tabIndex={0}
                  title="Click to jump to date"
                >
                  <Calendar size={14} className={styles.dateIcon} />
                  <span>{formattedDate}</span>
                  <ChevronDown size={14} className={styles.chevronIcon} />
                </div>
                {isDatePickerOpen && (
                  <input
                    type="date"
                    autoFocus
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      marginTop: 4,
                      zIndex: 100,
                      padding: '6px 8px',
                      borderRadius: 6,
                      border: '1px solid #CBD5E1',
                      background: '#FFFFFF',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    }}
                    onChange={handleDateSelect}
                    onBlur={() => setIsDatePickerOpen(false)}
                  />
                )}
              </div>

              <button
                type="button"
                className={styles.dateNavBtn}
                onClick={handleNextDay}
                title="Next day"
                aria-label="Next day"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            {/* Notification Bell with red dot */}
            <button className={styles.bellBtn} title="Notifications" aria-label="Notifications">
              <Bell size={17} />
              <span className={styles.notificationDot} />
            </button>

            {/* User Profile Pill: (V) Vivek */}
            <div className={styles.dropdownWrap}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className={styles.todayProfileBtn}
                aria-expanded={dropdownOpen}
                aria-label="User profile menu"
              >
                <div className={styles.todayAvatar}>{userInitial}</div>
                <span className={styles.todayUserName}>{userName}</span>
              </button>

              {dropdownOpen && (
                <div className={styles.dropdownMenu}>
                  <div className={styles.dropdownHeader}>
                    <div className={styles.dropdownHeaderName}>{user?.full_name || 'Vivek'}</div>
                    <div className={styles.dropdownHeaderEmail}>{user?.email || 'svivek431@gmail.com'}</div>
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
        ) : (
          <div className={styles.rightSection}>
            <div className={styles.dateSelector}>
              <Calendar size={14} className={styles.dateIcon} />
              <span>{formattedDate}</span>
              <ChevronDown size={14} className={styles.chevronIcon} />
            </div>

            <button className={styles.bellBtn} title="Notifications" aria-label="Notifications">
              <Bell size={17} />
              <span className={styles.notificationDot} />
            </button>

            <div className={styles.dropdownWrap}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className={styles.profileBtn}
                aria-expanded={dropdownOpen}
                aria-label="User profile menu"
              >
                <div className={styles.avatar}>{userInitial}</div>
                <span className={styles.userNameLabel}>{userName}</span>
                <ChevronDown size={14} color="#64748B" />
              </button>

              {dropdownOpen && (
                <div className={styles.dropdownMenu}>
                  <div className={styles.dropdownHeader}>
                    <div className={styles.dropdownHeaderName}>{user?.full_name || 'Vivek'}</div>
                    <div className={styles.dropdownHeaderEmail}>{user?.email || 'svivek431@gmail.com'}</div>
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
        )}
      </div>
    </header>
  );
};

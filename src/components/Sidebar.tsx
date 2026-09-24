'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  PlayCircle,
  CalendarDays,
  ClipboardList,
  TrendingUp,
  Ruler,
  Utensils,
  Award,
  BookOpen,
  Target,
  History,
  ListOrdered,
  Users,
  Building2,
  Dumbbell,
  Plus,
  LogOut,
  Settings,
  X,
  ChevronLeft,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  LucideIcon,
} from 'lucide-react';
import { useAuth } from '@/lib/authContext';
import { api } from '@/lib/api';
import { JourneyPacingData } from '@/lib/types';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import styles from './Sidebar.module.css';

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
  badgeVariant?: 'amber' | 'violet' | 'emerald' | 'cyan' | 'rose';
  isGated?: boolean;
}

interface SidebarProps {
  isOpen: boolean;
  isCollapsed?: boolean;
  onClose: () => void;
  onToggleCollapse?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, isCollapsed = false, onClose, onToggleCollapse }) => {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  const isTrainer = user?.memberships?.some((m) => m.role === 'TRAINER');
  const isOwner = user?.memberships?.some((m) => m.role === 'OWNER');

  const [journey, setJourney] = useState<JourneyPacingData | null>(null);

  const fetchJourney = () => {
    api.getJourneyPacingStatus().then(setJourney).catch(() => setJourney(null));
  };

  useEffect(() => {
    fetchJourney();
    const handleUpdate = () => fetchJourney();
    window.addEventListener('fitlog:journey-updated', handleUpdate);
    return () => window.removeEventListener('fitlog:journey-updated', handleUpdate);
  }, []);

  const hasProgram = Boolean(journey?.has_program);
  const planBadge = hasProgram ? `Day ${journey?.current_day}/${journey?.duration_days}` : undefined;
  const planBadgeVariant: NavItem['badgeVariant'] = journey?.is_calibrating
    ? 'cyan'
    : journey?.pacing_status === 'PACING_ALERT'
      ? 'amber'
      : journey?.pacing_status === 'OFF_TRACK'
        ? 'rose'
        : 'emerald';

  const gatedBadge = !hasProgram && journey !== null ? 'Locked' : undefined;
  const gatedVariant: NavItem['badgeVariant'] = 'amber';

  const mainNavItems: NavItem[] = [
    { label: 'Dashboard', href: '/app', icon: LayoutDashboard },
    { label: 'Today', href: '/app/workouts/active', icon: PlayCircle, badge: gatedBadge, badgeVariant: gatedVariant, isGated: true },
    { label: 'Plan', href: '/app/workouts/plan', icon: CalendarDays, badge: planBadge || gatedBadge, badgeVariant: planBadgeVariant || gatedVariant, isGated: true },
    { label: 'Plan History', href: '/app/workouts/plan/history', icon: History, badge: gatedBadge, badgeVariant: gatedVariant, isGated: true },
    { label: 'Routines', href: '/app/workouts/routines', icon: ListOrdered },
    { label: 'Exercise Library', href: '/app/exercises', icon: Dumbbell },
    { label: 'Daily Log', href: '/app/daily', icon: ClipboardList, badge: gatedBadge, badgeVariant: gatedVariant, isGated: true },
    { label: 'Measurements', href: '/app/measurements', icon: Ruler, badge: gatedBadge, badgeVariant: gatedVariant, isGated: true },
    { label: 'Nutrition', href: '/app/nutrition', icon: Utensils, badge: gatedBadge, badgeVariant: gatedVariant, isGated: true },
    { label: 'Review', href: '/app/review', icon: Award, badge: gatedBadge, badgeVariant: gatedVariant, isGated: true },
    { label: 'Guidelines', href: '/app/guidelines', icon: BookOpen },
    { label: 'Milestones', href: '/app/expectations', icon: Target, badge: gatedBadge, badgeVariant: gatedVariant, isGated: true },
    { label: 'Settings', href: '/app/settings', icon: Settings },
  ];

  const managementNavItems: NavItem[] = [
    ...(isTrainer ? [{ label: 'Trainer Hub', href: '/app/trainer', icon: Users, badge: 'Coach', badgeVariant: 'amber' as const }] : []),
    ...(isOwner ? [{ label: 'Gym Admin', href: '/app/gym', icon: Building2, badge: 'Owner', badgeVariant: 'violet' as const }] : []),
  ];

  const isItemActive = (href: string) => {
    if (href === '/app') {
      return pathname === '/app' || pathname === '/app/';
    }
    if (href === '/app/workouts/plan') {
      return (
        pathname === '/app/workouts/plan' ||
        (pathname.startsWith('/app/workouts/plan/') && !pathname.startsWith('/app/workouts/plan/history'))
      );
    }
    if (href === '/app/workouts/active') {
      return (
        pathname === '/app/workouts/active' ||
        pathname.startsWith('/app/workouts/active/') ||
        pathname === '/app/workouts'
      );
    }
    return pathname === href || pathname.startsWith(href + '/') || pathname.startsWith(href + '?');
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const userInitials = (user?.full_name || user?.email || 'U')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      <div
        className={`app-sidebar-backdrop ${isOpen ? 'open' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Main Sidebar */}
      <aside
        className={`app-sidebar ${isOpen ? 'open' : ''} ${isCollapsed ? 'collapsed' : ''}`}
        aria-label="Sidebar Navigation"
      >
        {/* Header: Brand + Edge Collapse Toggle */}
        <div className={`${styles.header} ${isCollapsed ? styles.headerCollapsed : ''}`}>
          {isCollapsed ? (
            <div
              onClick={onToggleCollapse}
              title="FITLOG PRO (Click to expand)"
              className={styles.logoCollapsed}
            >
              <Dumbbell size={18} color="#FFFFFF" strokeWidth={2.5} />
            </div>
          ) : (
            <>
              <Link
                href="/app"
                onClick={onClose}
                className={styles.brandLink}
              >
                <div className={styles.brandIcon}>
                  <Dumbbell size={18} color="#FFFFFF" strokeWidth={2.5} />
                </div>
                <span>
                  FIT<span className={styles.brandHighlight}>LOG</span>
                </span>
                <Badge variant="emerald" size="sm">
                  PRO
                </Badge>
              </Link>

              {/* Mobile close button (visible only in mobile drawer) */}
              <button
                onClick={onClose}
                className="mobile-sidebar-close-btn"
                title="Close sidebar"
                aria-label="Close sidebar"
              >
                <X size={18} />
              </button>
            </>
          )}

          {/* Edge Collapse Button: centered on the border seam where both lines meet */}
          <button
            onClick={onToggleCollapse}
            className="sidebar-edge-toggle-btn"
            title={isCollapsed ? 'Expand sidebar (Ctrl+B)' : 'Collapse sidebar (Ctrl+B)'}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? (
              <ChevronRight size={14} strokeWidth={2.5} />
            ) : (
              <ChevronLeft size={14} strokeWidth={2.5} />
            )}
          </button>
        </div>

        {/* Navigation Item List */}
        <nav className={`${styles.navList} ${isCollapsed ? styles.navListCollapsed : ''}`}>
          {mainNavItems.map((item) => {
            const active = isItemActive(item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.label}
                href={hasProgram || !item.isGated ? item.href : '/app'}
                onClick={(e) => {
                  onClose();
                  if (!hasProgram && item.isGated) {
                    e.preventDefault();
                    router.push('/app');
                  }
                }}
                title={item.label}
                className={`${styles.navItem} ${isCollapsed ? styles.navItemCollapsed : ''} ${active ? styles.navItemActive : ''}`}
              >
                {/* Active Indicator Bar */}
                {active && <span className={styles.activeIndicator} />}

                <Icon
                  size={isCollapsed ? 20 : 18}
                  color={active ? 'var(--color-primary)' : 'var(--text-muted)'}
                  strokeWidth={active ? 2.5 : 2}
                  className={`${styles.navItemIcon} ${!isCollapsed && active ? styles.navItemIconActive : ''}`}
                />

                {!isCollapsed && (
                  <>
                    <span className={styles.navItemLabel}>
                      {item.label}
                    </span>

                    {item.badge && (
                      <Badge variant={item.badgeVariant || 'emerald'} size="sm">
                        {item.badge}
                      </Badge>
                    )}
                  </>
                )}
              </Link>
            );
          })}

          {managementNavItems.length > 0 && (
            <>
              {isCollapsed ? (
                <div className={styles.sectionDivider} />
              ) : (
                <div className={styles.sectionHeader}>
                  Management
                </div>
              )}

              {managementNavItems.map((item) => {
                const active = isItemActive(item.href);
                const Icon = item.icon;

                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={onClose}
                    title={item.label}
                    className={`${styles.navItem} ${isCollapsed ? styles.navItemCollapsed : ''} ${active ? styles.navItemActive : ''}`}
                  >
                    {active && <span className={styles.activeIndicator} />}

                    <Icon
                      size={isCollapsed ? 20 : 18}
                      color={active ? 'var(--color-primary)' : 'var(--text-muted)'}
                      strokeWidth={active ? 2.5 : 2}
                      className={`${styles.navItemIcon} ${!isCollapsed && active ? styles.navItemIconActive : ''}`}
                    />

                    {!isCollapsed && (
                      <>
                        <span className={styles.navItemLabel}>
                          {item.label}
                        </span>

                        {item.badge && (
                          <Badge variant={item.badgeVariant || 'emerald'} size="sm">
                            {item.badge}
                          </Badge>
                        )}
                      </>
                    )}
                  </Link>
                );
              })}
            </>
          )}
        </nav>

        {/* Quick Action */}
        <div className={`${styles.quickActionWrap} ${isCollapsed ? styles.quickActionWrapCollapsed : ''}`}>
          {isCollapsed ? (
            <button
              onClick={() => {
                onClose();
                router.push('/app/workouts/active');
              }}
              title="Log Workout"
              className={styles.quickActionBtnCollapsed}
              aria-label="Log Workout"
            >
              <Plus size={18} strokeWidth={2.5} />
            </button>
          ) : (
            <Button
              size="sm"
              variant="primary"
              fullWidth
              onClick={() => {
                onClose();
                router.push('/app/workouts/active');
              }}
            >
              <Plus size={16} strokeWidth={2.5} />
              <span>Log Workout</span>
            </Button>
          )}
        </div>

        {/* User Profile Footer */}
        <div className={`${styles.userFooter} ${isCollapsed ? styles.userFooterCollapsed : ''}`}>
          {isCollapsed ? (
            <>
              <div
                title={`${user?.full_name || 'FitLog User'} (${user?.email})`}
                className={`${styles.userAvatar} ${styles.userAvatarCollapsed}`}
              >
                {userInitials}
              </div>

              <button
                onClick={handleLogout}
                title="Log Out"
                className={`${styles.logoutBtn} ${styles.logoutBtnCollapsed}`}
                aria-label="Log Out"
              >
                <LogOut size={16} />
              </button>
            </>
          ) : (
            <>
              <div className={styles.userMeta}>
                <div className={styles.userAvatar}>
                  {userInitials}
                </div>
                <div className={styles.userTextWrap}>
                  <div className={styles.userName}>
                    {user?.full_name || 'FitLog User'}
                  </div>
                  <div className={styles.userEmail}>
                    {user?.email}
                  </div>
                </div>
              </div>

              <button
                onClick={handleLogout}
                title="Log out"
                className={styles.logoutBtn}
                aria-label="Log Out"
              >
                <LogOut size={16} />
              </button>
            </>
          )}
        </div>
      </aside>
    </>
  );
};

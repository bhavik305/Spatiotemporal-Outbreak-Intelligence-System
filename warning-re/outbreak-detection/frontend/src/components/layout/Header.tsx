import { clsx } from 'clsx';
import { Link, useLocation, NavLink } from 'react-router-dom';
import { Badge } from '../ui';
import { Activity, Menu, X, Shield, LayoutDashboard, Map, BarChart2, AlertTriangle, FileText } from 'lucide-react';

interface HeaderProps {
  cycleStatus?: {
    status: string;
    cycleId?: string;
    reportsReceived?: number;
    taluksReporting?: number;
    lastUpdate?: string;
  };
  onMenuClick?: () => void;
  isMobileMenuOpen?: boolean;
  viewMode?: 'public' | 'detailed';
  onViewModeChange?: (mode: 'public' | 'detailed') => void;
  demoMode?: boolean;
}

export function Header({
  cycleStatus,
  onMenuClick,
  isMobileMenuOpen,
  viewMode = 'public',
  onViewModeChange,
  demoMode = false,
}: HeaderProps) {
  const location = useLocation();

  const navItems = [
    { path: '/dashboard', label: 'Overview', icon: LayoutDashboard },
    { path: '/dashboard/map', label: 'Map Intelligence', icon: Map },
    { path: '/dashboard/trends', label: 'Disease Trends', icon: BarChart2 },
    { path: '/dashboard/alerts', label: 'Alerts', icon: AlertTriangle },
    { path: '/dashboard/advisory', label: 'Advisory', icon: FileText },
  ];

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'OPEN_FOR_REPORTING':
        return 'success';
      case 'PROCESSING':
        return 'warning';
      case 'ANALYSIS_READY':
        return 'info';
      case 'CYCLE_CLOSED':
        return 'neutral';
      default:
        return 'neutral';
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-neutral-200 shadow-sm">
      <nav className="max-w-full mx-auto px-4 md:px-6 lg:px-8" aria-label="Main navigation">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              type="button"
              className="md:hidden p-2 rounded-lg text-neutral-600 hover:bg-neutral-100"
              onClick={onMenuClick}
              aria-expanded={isMobileMenuOpen}
              aria-controls="mobile-navigation"
              aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
            >
              {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <Link to="/dashboard" className="flex items-center gap-2" aria-label="Kerala Outbreak Intelligence Home">
              <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center" aria-hidden="true">
                <Shield size={16} className="text-white" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-xl font-semibold text-neutral-900 leading-tight">Kerala Outbreak Intelligence</h1>
                <p className="text-xs text-neutral-500 leading-none">Spatiotemporal disease surveillance and early warning</p>
              </div>
            </Link>
          </div>

          <div className="hidden md:flex md:items-center md:gap-6 flex-1 max-w-3xl mx-8">
            <div className="flex items-center gap-1 bg-neutral-50 rounded-lg p-1" role="tablist" aria-label="Main navigation">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path || (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={clsx(
                      'flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-white text-primary-700 shadow-sm'
                        : 'text-neutral-600 hover:text-neutral-900 hover:bg-white/50'
                    )}
                    role="tab"
                    aria-selected={isActive}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <Icon size={16} aria-hidden="true" />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {demoMode && (
              <Badge variant="warning" dot size="sm">
                DEMO MODE
              </Badge>
            )}

            <div className="hidden sm:flex items-center gap-2">
              <span className="text-xs text-neutral-500">View:</span>
              <div className="flex bg-neutral-100 rounded-lg p-1" role="radiogroup" aria-label="View mode">
                <button
                  role="radio"
                  aria-checked={viewMode === 'public'}
                  onClick={() => onViewModeChange?.('public')}
                  className={clsx(
                    'px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
                    viewMode === 'public' ? 'bg-white text-primary-700 shadow-sm' : 'text-neutral-600 hover:text-neutral-900'
                  )}
                >
                  Public
                </button>
                <button
                  role="radio"
                  aria-checked={viewMode === 'detailed'}
                  onClick={() => onViewModeChange?.('detailed')}
                  className={clsx(
                    'px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
                    viewMode === 'detailed' ? 'bg-white text-primary-700 shadow-sm' : 'text-neutral-600 hover:text-neutral-900'
                  )}
                >
                  Detailed
                </button>
              </div>
            </div>

            {cycleStatus && (
              <div className="hidden lg:flex items-center gap-3 px-3 py-2 bg-neutral-50 rounded-lg border border-neutral-200">
                <div className="flex items-center gap-2">
                  <Activity size={14} className="text-primary-600" aria-hidden="true" />
                  <span className="text-xs font-medium text-neutral-700">Cycle Status</span>
                </div>
                <Badge variant={getStatusVariant(cycleStatus.status)} size="sm" dot>
                  {cycleStatus.status.replace(/_/g, ' ')}
                </Badge>
              </div>
            )}

            <Link
              to="/hospital"
              className="hidden sm:inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors"
            >
              <FileText size={16} aria-hidden="true" />
              Report
            </Link>
          </div>
        </div>

        {isMobileMenuOpen && (
          <div id="mobile-navigation" className="md:hidden py-4 border-t border-neutral-100 animate-slide-down">
            <div className="flex flex-col gap-1 mb-4">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path || (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={clsx(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-base font-medium transition-colors',
                      isActive
                        ? 'bg-primary-50 text-primary-700'
                        : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
                    )}
                    onClick={() => onMenuClick?.()}
                  >
                    <Icon size={20} aria-hidden="true" />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </div>
            <div className="pt-4 border-t border-neutral-100">
              <Link
                to="/hospital"
                className="inline-flex items-center justify-center gap-2 px-4 py-3 bg-primary-600 text-white text-base font-medium rounded-lg"
              >
                <FileText size={20} aria-hidden="true" />
                Hospital Reporting Portal
              </Link>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
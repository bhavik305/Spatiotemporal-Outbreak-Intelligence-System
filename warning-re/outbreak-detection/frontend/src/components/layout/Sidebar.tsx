import { clsx } from 'clsx';
import { useLocation, NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Map,
  BarChart2,
  AlertTriangle,
  FileText,
  Hospital,
  Database,
  Info,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface SidebarProps {
  isCollapsed?: boolean;
  onToggle?: () => void;
}

const navItems = [
  { path: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { path: '/dashboard/map', label: 'Map Intelligence', icon: Map },
  { path: '/dashboard/trends', label: 'Disease Trends', icon: BarChart2 },
  { path: '/dashboard/alerts', label: 'Alerts', icon: AlertTriangle },
  { path: '/dashboard/advisory', label: 'Advisory', icon: FileText },
  { path: '/hospital', label: 'Hospital Reporting', icon: Hospital },
  { path: '/reports', label: 'Reports', icon: FileText },
  { path: '/data-methods', label: 'Data & Methods', icon: Database },
  { path: '/about', label: 'About', icon: Info },
];

export function Sidebar({ isCollapsed = false, onToggle }: SidebarProps) {
  const location = useLocation();

  return (
    <aside
      className={clsx(
        'fixed left-0 top-16 z-30 h-[calc(100vh-4rem)] bg-white border-r border-neutral-200 transition-all duration-300',
        isCollapsed ? 'w-20' : 'w-64'
      )}
      aria-label="Main navigation"
    >
      <nav className="flex flex-col h-full p-3" role="navigation">
        <ul className="flex flex-col gap-1 flex-1" role="list">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
            return (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  className={clsx(
                    'relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                    isCollapsed
                      ? 'justify-center'
                      : 'justify-start',
                    isActive
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
                  )}
                  role="menuitem"
                  aria-selected={isActive}
                  aria-current={isActive ? 'page' : undefined}
                  title={isCollapsed ? item.label : undefined}
                >
                  <Icon size={20} aria-hidden="true" className="flex-shrink-0" />
                  {!isCollapsed && <span className="truncate">{item.label}</span>}
                </NavLink>
              </li>
            );
          })}
        </ul>

        <div className="pt-4 border-t border-neutral-100">
          <button
            type="button"
            onClick={onToggle}
            className={clsx(
              'w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700 transition-colors',
              isCollapsed && 'justify-center'
            )}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-expanded={!isCollapsed}
          >
            {isCollapsed ? (
              <ChevronRight size={20} className="flex-shrink-0" aria-hidden="true" />
            ) : (
              <>
                <ChevronLeft size={20} className="flex-shrink-0" aria-hidden="true" />
                <span>Collapse</span>
              </>
            )}
          </button>
        </div>
      </nav>
    </aside>
  );
}
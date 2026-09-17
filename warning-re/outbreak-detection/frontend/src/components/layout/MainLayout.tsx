import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { useState } from 'react';

interface MainLayoutProps {
  cycleStatus?: {
    status: string;
    cycleId?: string;
    reportsReceived?: number;
    taluksReporting?: number;
    lastUpdate?: string;
  };
  demoMode?: boolean;
}

export function MainLayout({ cycleStatus, demoMode = false }: MainLayoutProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'public' | 'detailed'>('public');

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      <Header
        cycleStatus={cycleStatus}
        onMenuClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        isMobileMenuOpen={isMobileMenuOpen}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        demoMode={demoMode}
      />
      <main className="flex-1 max-w-full mx-auto w-full px-4 md:px-6 lg:px-8 py-6">
        <Outlet />
      </main>
      <footer className="border-t border-neutral-200 bg-white">
        <div className="max-w-full mx-auto px-4 md:px-6 lg:px-8 py-4">
          <p className="text-xs text-neutral-500 text-center">
            Kerala Outbreak Intelligence System &mdash; Data-driven surveillance for public health
          </p>
        </div>
      </footer>
    </div>
  );
}
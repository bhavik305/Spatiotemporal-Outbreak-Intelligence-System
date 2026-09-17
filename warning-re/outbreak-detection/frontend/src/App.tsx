import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from './components/layout/MainLayout';
import { Dashboard } from './pages/Dashboard';
import { MapPage } from './pages/MapPage';
import { TrendsPage } from './pages/TrendsPage';
import { AlertsPage } from './pages/AlertsPage';
import { AdvisoryPage } from './pages/AdvisoryPage';
import { HospitalPage } from './pages/HospitalPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route element={<MainLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/dashboard/map" element={<MapPage />} />
          <Route path="/dashboard/trends" element={<TrendsPage />} />
          <Route path="/dashboard/alerts" element={<AlertsPage />} />
          <Route path="/dashboard/advisory" element={<AdvisoryPage />} />
          <Route path="/hospital" element={<HospitalPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App
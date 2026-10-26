import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { DashboardPage } from './features/dashboard/DashboardPage';
import { ForecastsPage } from './features/forecasts/ForecastsPage';
import { AnalyticsPage } from './features/analytics/AnalyticsPage';
import { DataExplorerPage } from './features/data-explorer/DataExplorerPage';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/forecasts" element={<ForecastsPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/data-explorer" element={<DataExplorerPage />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;

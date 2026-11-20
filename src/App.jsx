import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './pages/public/LandingPage';
import MarketplacePage from './pages/public/MarketplacePage';
import ProviderDetailPage from './pages/public/ProviderDetailPage';
import LoginPage from './pages/public/LoginPage';
import RegisterPage from './pages/public/RegisterPage';
import CitizenDashboard from './pages/citizen/CitizenDashboard';
import ProviderDashboard from './pages/provider/ProviderDashboard';
import AdminDashboard from './pages/admin/AdminDashboard';
import ProtectedRoute from './components/common/ProtectedRoute';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/marketplace" element={<MarketplacePage />} />
        <Route path="/providers/:id" element={<ProviderDetailPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route
          path="/citizen"
          element={
            <ProtectedRoute allowedRoles={['CITIZEN']}>
              <CitizenDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/provider"
          element={
            <ProtectedRoute allowedRoles={['PROVIDER']}>
              <ProviderDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

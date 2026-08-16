import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import { I18nProvider } from '@/i18n/I18nContext';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { Navbar } from '@/components/layout/Navbar';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { BrowsePage } from '@/pages/BrowsePage';
import { SearchResultsPage } from '@/pages/SearchResultsPage';
import { ProviderDetailPage } from '@/pages/ProviderDetailPage';
import { LoginPage } from '@/pages/auth/LoginPage';
import { SignupPage } from '@/pages/auth/SignupPage';
import { ConsumerDashboard } from '@/pages/consumer/ConsumerDashboard';
import { ProviderDashboard } from '@/pages/provider/ProviderDashboard';
import { AdminDashboard } from '@/pages/admin/AdminDashboard';
import { AdminGate } from '@/components/layout/AdminGate';

function App() {
  return (
    <ErrorBoundary>
    <I18nProvider>
      <AuthProvider>
        <BrowserRouter>
          <div className="min-h-screen bg-slate-50">
            <Navbar />
            <Routes>
              <Route path="/" element={<BrowsePage />} />
              <Route path="/search" element={<SearchResultsPage />} />
              <Route path="/providers/:id" element={<ProviderDetailPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
              <Route
                path="/consumer"
                element={
                  <ProtectedRoute role="consumer">
                    <ConsumerDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/provider"
                element={
                  <ProtectedRoute role="provider">
                    <ProviderDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin2318"
                element={
                  <ProtectedRoute role="admin">
                    <AdminGate>
                      <AdminDashboard />
                    </AdminGate>
                  </ProtectedRoute>
                }
              />
              <Route path="/admin" element={<Navigate to="/admin2318" replace />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </BrowserRouter>
      </AuthProvider>
    </I18nProvider>
    </ErrorBoundary>
  );
}

export default App;

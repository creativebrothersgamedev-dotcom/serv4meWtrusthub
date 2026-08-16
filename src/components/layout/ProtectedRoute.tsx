import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Role } from '@/types/database';

export function ProtectedRoute({ role, children }: { role: Role; children: ReactNode }) {
  const { session, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-teal-600" />
      </div>
    );
  }

  if (!session || !profile) {
    return <Navigate to="/login" replace />;
  }

  if (profile.role !== role) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

import { Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { usePartnerAuth } from '../context/PartnerAuthContext';

export const PartnerProtectedRoute = ({ children }: { children: ReactNode }) => {
  const { user, loading } = usePartnerAuth();

  if (loading) return <div className="partner-loading-screen">Loading partner workspace…</div>;
  if (!user || user.partner_slug !== 'elswedy') {
    return <Navigate to="/partners/elswedy/login" replace />;
  }
  return <>{children}</>;
};

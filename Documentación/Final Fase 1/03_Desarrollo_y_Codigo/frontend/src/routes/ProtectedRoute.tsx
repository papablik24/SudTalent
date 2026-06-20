import React from 'react';
import { Navigate } from 'react-router-dom';
import { UserRole, UserProfile } from '../types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  user: UserProfile | null;
  role: UserRole | null;
  allowedRoles?: UserRole[];
  loading?: boolean;
}

export function ProtectedRoute({ 
  children, 
  user, 
  role, 
  allowedRoles,
  loading 
}: ProtectedRouteProps) {
  if (loading) {
    return (
      <div className="min-h-screen bg-sud-dark flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-sud-orange/20 border-t-sud-orange rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (allowedRoles && role && !allowedRoles.includes(role)) {
    return <Navigate to="/" replace />;
  }

  if (!user.onboarded && window.location.pathname !== '/onboarding' && window.location.pathname !== '/profile-selection') {
    return <Navigate to="/profile-selection" replace />;
  }

  return <>{children}</>;
}

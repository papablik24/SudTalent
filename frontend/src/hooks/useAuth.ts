import { useState, useEffect } from 'react';
import { UserProfile, UserRole } from '../types';
import { authService, AuthResponse } from '../services/backendService';

function mapAuthResponseToUser(res: AuthResponse): UserProfile {
  return {
    uid: String(res.id),
    phone: res.phone || '',
    role: res.role === 'ADMIN' ? 'ADMIN' : 'USER',
    onboarded: res.onboarded,
    profileType: res.profileType === 'PERSONAL' || res.profileType === 'PARENT' ? res.profileType : undefined,
    name: res.name || '',
    email: res.email || '',
    createdAt: new Date().toISOString(),
    status: 'PENDING',
  };
}

export function useAuth() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // On mount, check if there's a valid token and restore session
  useEffect(() => {
    const restoreSession = async () => {
      if (!authService.hasToken()) {
        setLoading(false);
        return;
      }

      try {
        const res = await authService.me();
        const user = mapAuthResponseToUser(res);
        setCurrentUser(user);
        setRole(user.role);
        localStorage.setItem('sud_current_user', JSON.stringify(user));
      } catch (err) {
        console.warn('Token inválido o expirado, limpiando sesión:', err);
        authService.clearLocalAuth();
        localStorage.removeItem('sud_current_user');
      } finally {
        setLoading(false);
      }
    };

    restoreSession();
  }, []);

  const loginWithPhone = async (phone: string, _otp?: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await authService.phoneAuth(phone);
      const user = mapAuthResponseToUser(res);
      
      setCurrentUser(user);
      setRole(user.role);
      localStorage.setItem('sud_current_user', JSON.stringify(user));
      return user;
    } catch (err: any) {
      const msg = err?.message || 'Error al iniciar sesión.';
      setError(msg);
      console.error('Login error:', err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const loginAdmin = async (email?: string, password?: string) => {
    setLoading(true);
    setError(null);
    try {
      // Use provided credentials or default admin
      const adminEmail = email || 'admin@sudamericanvoices.com';
      const adminPassword = password || 'admin123';
      
      const res = await authService.adminLogin(adminEmail, adminPassword);
      const user = mapAuthResponseToUser(res);
      
      setCurrentUser(user);
      setRole(user.role);
      localStorage.setItem('sud_current_user', JSON.stringify(user));
      return user;
    } catch (err: any) {
      const msg = err?.message || 'Error al iniciar sesión como admin.';
      setError(msg);
      console.error('Admin login error:', err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    await authService.logout();
    localStorage.removeItem('sud_current_user');
    setRole(null);
    setCurrentUser(null);
  };

  return {
    currentUser,
    role,
    loading,
    error,
    loginWithPhone,
    loginAdmin,
    logout,
    setCurrentUser,
    setRole
  };
}

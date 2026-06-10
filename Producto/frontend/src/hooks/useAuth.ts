import { useState, useEffect } from 'react';
import { UserProfile, UserRole, ProfileStatus } from '../types';
import { authService, AuthResponse } from '../services/backendService';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080';
const DEV_OTP = '000000';

function mapAuthResponseToUser(res: any): UserProfile {
  // Manejar tanto la estructura nueva (res.user) como la vieja (res.id)
  const user = res.user || res;
  
  const validStatuses: ProfileStatus[] = ['PENDING', 'APPROVED', 'INACTIVE'];
  const status = user.status && validStatuses.includes(user.status as ProfileStatus)
    ? (user.status as ProfileStatus)
    : 'PENDING';

  return {
    uid: String(user.id),
    phone: user.phone || '',
    role: user.role === 'ADMIN' ? 'ADMIN' : 'USER',
    onboarded: user.onboarded ?? false,
    active: user.active ?? true,
    profileType: user.profileType === 'PERSONAL' || user.profileType === 'PARENT' ? user.profileType : undefined,
    name: user.name || '',
    email: user.email || '',
    bio: user.bio || '',
    age: user.age,
    createdAt: new Date().toISOString(),
    status,
  };
}

export function useAuth() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ═══ Restore session on mount ═══
  useEffect(() => {
    const restoreSession = async () => {
      const savedUser = localStorage.getItem('sud_current_user');
      const token = localStorage.getItem('sud_jwt_token');

      if (savedUser && token) {
        try {
          const user = JSON.parse(savedUser);

          if (user.role && user.role !== 'ADMIN' && user.role !== 'USER') {
            user.role = 'USER';
          }

          if (!user.uid || user.uid === 'undefined' || user.uid === 'null' || user.uid.length < 8) {
            console.warn('Session with invalid uid detected, clearing localStorage');
            authService.clearLocalAuth();
            localStorage.removeItem('sud_current_user');
            setLoading(false);
            return;
          }

          if (!isUserEligible(user)) {
            console.warn('User not eligible for session:', user);
            authService.clearLocalAuth();
            localStorage.removeItem('sud_current_user');
            setLoading(false);
            return;
          }

          // Restaurar sesión local inmediatamente para no bloquear la UI
          setCurrentUser(user);
          setRole(user.role);

          // Refrescar status y onboarded desde el backend en segundo plano
            try {
              const fresh = await authService.me() as any;
              const freshUser = fresh?.user ?? fresh;
              const validStatuses: ProfileStatus[] = ['PENDING', 'APPROVED', 'INACTIVE'];
              const refreshedStatus = freshUser?.status && validStatuses.includes(freshUser.status as ProfileStatus)
                ? (freshUser.status as ProfileStatus)
                : user.status;
              const refreshedOnboarded = freshUser?.onboarded ?? user.onboarded;

              if (refreshedStatus !== user.status || refreshedOnboarded !== user.onboarded) {
                const updated = { ...user, status: refreshedStatus, onboarded: refreshedOnboarded };
                localStorage.setItem('sud_current_user', JSON.stringify(updated));
                setCurrentUser(updated);
              }
            } catch {
            // Si falla el refresco, mantener la sesión local (fallback offline)
          }

        } catch (err) {
          console.error('Error restoring session:', err);
          authService.clearLocalAuth();
          localStorage.removeItem('sud_current_user');
        }
      }

      setLoading(false);
    };

    restoreSession();
  }, []);

  // ═══════════════════════════════════════════════════════════════
  // HELPER: Check if user is eligible (active + approved)
  // ═══════════════════════════════════════════════════════════════
  const isUserEligible = (user: UserProfile): boolean => {
    // Admin solo necesita ser APPROVED
    if (user.role === 'ADMIN') {
      return user.status === 'APPROVED';
    }
    // Usuarios regulares pueden ser APPROVED o PENDING
    return user.status === 'APPROVED' || user.status === 'PENDING';
  };

  // ═══════════════════════════════════════════════════════════════
  // LOGIN WITH EMAIL — email + password → JWT
  // ═══════════════════════════════════════════════════════════════
const loginWithEmail = async (email: string, password: string): Promise<UserProfile | false> => {
  setLoading(true);
  setError(null);

  // Validate inputs
  if (!email || !email.includes('@')) {
    setError('Ingresa un correo electrónico válido.');
    setLoading(false);
    return false;
  }
  if (!password || password.length < 6) {
    setError('La contraseña debe tener al menos 6 caracteres.');
    setLoading(false);
    return false;
  }

  try {
    console.log('🔵 Intentando login con:', { email, password: '***' });
    console.log('🔵 API_BASE:', API_BASE);

    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    console.log('📡 Response status:', res.status);
    console.log('📡 Response ok:', res.ok);
    console.log('📡 Response headers:', {
      'content-type': res.headers.get('content-type'),
      'content-length': res.headers.get('content-length'),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => {
        console.warn('⚠️ No se pudo parsear JSON del error');
        return {};
      });
      
      console.error('❌ Backend error response:', body);
      
      let errorMsg = 'Error al iniciar sesión.';
      
      if (res.status === 401) {
        errorMsg = body.message || 'Correo o contraseña incorrectos.';
      } else if (res.status === 403) {
        // Intentar usar el mensaje específico del backend
        if (body.message) {
          errorMsg = body.message;
        } else if (body.error) {
          errorMsg = body.error;
        } else {
          errorMsg = 'No tienes permiso para acceder. Verifica tus credenciales.';
        }
      } else if (res.status === 400) {
        errorMsg = body.message || body.error || 'Datos de acceso inválidos.';
      } else {
        errorMsg = body.message || errorMsg;
      }

      setError(errorMsg);
      setLoading(false);
      return false;
    }

    const data = await res.json();
    // Soportar estructura anidada (data.user) o plana (data)
    const user = data.user || data;
    
    // El status puede estar en user.status (si es anidado) o data.status (si es plano)
    const statusFromResponse = user.status || data.status;

    console.log('✅ Login response received:', {
      id: user.id,
      email: user.email,
      role: user.role,
      status: statusFromResponse,
      token: data.token ? '✓ Token presente' : '❌ Token faltante',
      requiresOnboarding: data.requiresOnboarding,
      dataStructure: data.user ? 'nested (user)' : 'flat'
    });

    const userData: UserProfile = {
      uid: String(user.id),
      phone: user.phone || '',
      role: (user.role === 'ADMIN' ? 'ADMIN' : 'USER') as UserRole,
      name: user.name || user.nombre || '',
      email: user.email || '',
      onboarded: user.onboarded ?? true,
      active: user.active ?? true,
      bio: user.bio || '',
      age: user.age,
      avatar: user.profileImageUrl || undefined,
      createdAt: user.createdAt || new Date().toISOString(),
      status: statusFromResponse || 'PENDING',
    };

    console.log('👤 User data mapped:', userData);

    if (!isUserEligible(userData)) {
      console.warn('⚠️ User not eligible:', userData);
      setError('Tu cuenta no está activa. Contacta con soporte.');
      setLoading(false);
      return false;
    }

    console.log('💾 Guardando token y usuario en localStorage...');
    localStorage.setItem('sud_jwt_token', data.token);
    localStorage.setItem('sud_current_user', JSON.stringify(userData));

    // Verificación de lo guardado
    console.log('🔍 Verificando localStorage después de guardar:');
    console.log('  - Token guardado:', localStorage.getItem('sud_jwt_token') ? '✓ Presente' : '❌ No encontrado');
    console.log('  - User guardado:', localStorage.getItem('sud_current_user'));
    console.log('  - Role en user:', userData.role);

    setCurrentUser(userData);
    setRole(userData.role);
    
    console.log('✅ Login exitoso');
    return userData;
  } catch (err) {
    console.error('🔴 FETCH ERROR - Backend unreachable or error:', err);
    console.error('Stack:', (err as Error).stack);
    return loginWithEmailLocal(email, password);
  } finally {
    setLoading(false);
  }
};

  const loginWithEmailLocal = (email: string, password: string): UserProfile | false => {
    const accounts: Record<string, { password: string; user: UserProfile }> = {
      'admin@sudamericanvoices.com': {
        password: 'admin123',
        user: {
          uid: 'admin_local',
          phone: '+56900000000',
          role: 'ADMIN',
          name: 'Admin SudTalent',
          email: 'admin@sudamericanvoices.com',
          onboarded: true,
          createdAt: new Date().toISOString(),
          status: 'APPROVED',
        },
      },
      'alumno@sudtalent.cl': {
        password: 'alumno123',
        user: {
          uid: 'user_local_1',
          phone: '+56912345678',
          role: 'USER',
          name: 'Alumno Demo',
          email: 'alumno@sudtalent.cl',
          onboarded: true,
          createdAt: new Date().toISOString(),
          status: 'APPROVED',
        },
      },
      'nuevo@sudtalent.cl': {
        password: 'nuevo123',
        user: {
          uid: 'user_local_new',
          phone: '+56987654321',
          role: 'USER',
          name: '',
          email: 'nuevo@sudtalent.cl',
          onboarded: false,
          createdAt: new Date().toISOString(),
          status: 'PENDING',
        },
      },
    };

    // También verificar usuarios registrados
    const regStr = localStorage.getItem('sud_registered_users');
    const registered: Record<string, any> = regStr ? JSON.parse(regStr) : {};
    const allAccounts = { ...accounts, ...registered };

    const acc = allAccounts[email.toLowerCase()];
    if (!acc || acc.password !== password) {
      setError('Correo o contraseña incorrectos.');
      return false;
    }

    // Preservar onboarded:true si ya se completó previamente
    const savedStr = localStorage.getItem('sud_current_user');
    if (savedStr) {
      try {
        const saved = JSON.parse(savedStr);
        if (saved.uid === acc.user.uid && saved.onboarded) {
          acc.user.onboarded = true;
        }
      } catch { /* ignore */ }
    }

    // ✅ PREVENT 403: Check eligibility
    if (!isUserEligible(acc.user)) {
      setError('Tu cuenta no está activa.');
      return false;
    }

    localStorage.setItem('sud_current_user', JSON.stringify(acc.user));
    setCurrentUser(acc.user);
    setRole(acc.user.role);
    return acc.user;
  };

  // ═══════════════════════════════════════════════════════════════
  // REGISTER — create new USER account
  // ═══════════════════════════════════════════════════════════════
  const registerUser = async (email: string, password: string, name: string): Promise<UserProfile | false> => {
    setLoading(true);
    setError(null);

    // Validate inputs
    if (!name.trim()) {
      setError('Ingresa tu nombre.');
      setLoading(false);
      return false;
    }
    if (!email || !email.includes('@')) {
      setError('Ingresa un correo válido.');
      setLoading(false);
      return false;
    }
    if (!password || password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      setLoading(false);
      return false;
    }

    try {
      const res = await fetch(`${API_BASE}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.message || body.error || 'Error al crear la cuenta.');
        setLoading(false);
        return false;
      }

      const data = await res.json();
      const userData: UserProfile = {
        uid: String(data.id),
        phone: data.phone || '',
        role: 'USER',
        name: data.name || name,
        email: data.email || email,
        onboarded: false,
        createdAt: new Date().toISOString(),
        status: 'PENDING',
      };

      if (data.token) localStorage.setItem('sud_jwt_token', data.token);
      localStorage.setItem('sud_current_user', JSON.stringify(userData));
      setCurrentUser(userData);
      setRole('USER');
      return userData;
    } catch {
      // Backend unreachable — create local account
      return registerUserLocal(email, password, name);
    } finally {
      setLoading(false);
    }
  };

  const registerUserLocal = (email: string, _password: string, name: string): UserProfile | false => {
    const existing = localStorage.getItem('sud_registered_users');
    const registeredUsers: Record<string, any> = existing ? JSON.parse(existing) : {};

    if (registeredUsers[email.toLowerCase()]) {
      setError('Ya existe una cuenta con este correo.');
      return false;
    }

    const uid = `user_reg_${Date.now()}`;
    const userData: UserProfile = {
      uid,
      phone: '',
      role: 'USER',
      name,
      email,
      onboarded: false,
      createdAt: new Date().toISOString(),
      status: 'PENDING',
    };

    registeredUsers[email.toLowerCase()] = { password: _password, user: userData };
    localStorage.setItem('sud_registered_users', JSON.stringify(registeredUsers));
    localStorage.setItem('sud_current_user', JSON.stringify(userData));

    setCurrentUser(userData);
    setRole('USER');
    return userData;
  };

  // ═══════════════════════════════════════════════════════════════
  // PHONE LOGIN — (FUTURE) phone + whitelist + SMS code
  // ═══════════════════════════════════════════════════════════════

  /** Step 1: Request SMS code. Validates phone against whitelist. */
  const requestPhoneCode = async (phone: string): Promise<{ success: boolean; message: string }> => {
    setLoading(true);
    setError(null);

    const normalized = phone.replace(/\s/g, '');
    if (!normalized || normalized.replace(/\D/g, '').length < 8) {
      setError('Ingresa un número de teléfono válido.');
      setLoading(false);
      return { success: false, message: 'Número inválido.' };
    }

    try {
      // Try backend first
      const res = await fetch(`${API_BASE}/api/auth/phone/request-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: normalized }),
      });
      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        const msg = body.error || body.message || 'Número no autorizado por Sudamerican Voices.';
        setError(msg);
        setLoading(false);
        return { success: false, message: msg };
      }

      setLoading(false);
      return { success: true, message: body.message || 'Código enviado correctamente.' };
    } catch {
      // Backend unreachable — validate against local whitelist
      return requestPhoneCodeLocal(normalized);
    }
  };

  const requestPhoneCodeLocal = (phone: string): { success: boolean; message: string } => {
    const digits = phone.replace(/\D/g, '');
    const DEV_NUMBERS = ['56912345678', '12345678', '56987654321', '87654321'];
    const isDevBypass = DEV_NUMBERS.some(d => digits.endsWith(d));

    if (!isDevBypass) {
      const whitelist = JSON.parse(localStorage.getItem('sud_whitelist') || '[]');
      const last8 = digits.slice(-8);
      const entry = whitelist.find((w: any) => {
        const wDigits = w.phone.replace(/\D/g, '');
        return wDigits.endsWith(last8);
      });

      if (!entry) {
        const msg = 'Número no autorizado por Sudamerican Voices.';
        setError(msg);
        setLoading(false);
        return { success: false, message: msg };
      }
    }

    console.info(`[DEV SMS] Código de verificación para ${phone}: ${DEV_OTP}`);
    setLoading(false);
    return { success: true, message: 'Código enviado correctamente.' };
  };

  /** Step 2: Verify SMS code and create session. */
  const verifyPhoneCode = async (phone: string, code: string): Promise<UserProfile | false> => {
    setLoading(true);
    setError(null);

    const normalized = phone.replace(/\s/g, '');

    try {
      const res = await fetch(`${API_BASE}/api/auth/phone/verify-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: normalized, code }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error || body.message || 'Código incorrecto o expirado.');
        setLoading(false);
        return false;
      }

      const data = await res.json();
      const userData: UserProfile = {
        uid: String(data.id),
        phone: data.phone || normalized,
        role: 'USER',
        name: data.name || '',
        email: data.email || '',
        onboarded: true,
        createdAt: data.createdAt || new Date().toISOString(),
        status: data.status || 'APPROVED',
      };

      // ✅ PREVENT 403: Check eligibility
      if (!isUserEligible(userData)) {
        setError('Tu cuenta está pendiente de aprobación o ha sido desactivada.');
        setLoading(false);
        return false;
      }

      localStorage.setItem('sud_jwt_token', data.token);
      localStorage.setItem('sud_current_user', JSON.stringify(userData));
      setCurrentUser(userData);
      setRole('USER');
      return userData;
    } catch {
      return verifyPhoneCodeLocal(normalized, code);
    }
  };

  const verifyPhoneCodeLocal = (phone: string, code: string): UserProfile | false => {
    if (code !== DEV_OTP) {
      setError('Código incorrecto o expirado.');
      setLoading(false);
      return false;
    }

    const whitelist = JSON.parse(localStorage.getItem('sud_whitelist') || '[]');
    const entry = whitelist.find((w: any) => w.phone === phone);
    const phoneId = phone.replace('+', '').replace(/\D/g, '');
    const existingStr = localStorage.getItem(`user_${phoneId}`);

    let userData: UserProfile;
    if (existingStr) {
      userData = JSON.parse(existingStr);
    } else {
      userData = {
        uid: `local_${phoneId}`,
        phone,
        role: 'USER',
        name: entry?.name || '',
        email: entry?.email || '',
        onboarded: !!entry?.name,
        createdAt: new Date().toISOString(),
        status: 'APPROVED',
      };
      localStorage.setItem(`user_${phoneId}`, JSON.stringify(userData));
    }

    localStorage.setItem('sud_current_user', JSON.stringify(userData));
    setCurrentUser(userData);
    setRole('USER');
    setLoading(false);
    return userData;
  };

  // ═══ Logout ═══
  const logout = async () => {
    await authService.logout();
    localStorage.removeItem('sud_current_user');
    localStorage.removeItem('sud_jwt_token');
    setRole(null);
    setCurrentUser(null);
  };

  const getToken = () => localStorage.getItem('sud_jwt_token') || null;

  return {
    currentUser,
    role,
    loading,
    error,
    loginWithEmail,
    registerUser,
    requestPhoneCode,
    verifyPhoneCode,
    logout,
    getToken,
    setCurrentUser,
    setRole,
    isUserEligible,
  };
}
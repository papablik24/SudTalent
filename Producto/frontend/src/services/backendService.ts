// API_URL debe ser ajustada según tu configuración
const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080/api';

// ==================== TOKEN MANAGEMENT ====================

const TOKEN_KEY = 'sud_jwt_token';

function getToken(): string | null {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token || token === 'null' || token === 'undefined' || token.trim() === '') {
    return null;
  }
  return token;
}

function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

// ==================== AUTH TYPES ====================

export interface AuthResponse {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: string;
  onboarded: boolean;
  profileType: string | null;
  status?: string; // ← Agregar esta línea
  token: string | null;
}

export interface OnboardRequest {
  name: string;
  email: string;
  profileType: string;
  childName?: string;
  childAge?: number;
  age?: number;
  specialties?: string;
  bio?: string;
  phone?: string;
}

// ==================== HTTP SERVICE ====================

export async function fetchAPI<T>(
  endpoint: string,
  options: RequestInit = {},
  requireAuth: boolean = true
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  // Add JWT token if available and required
  if (requireAuth) {
    const token = getToken();
    if (token) {
      if (token.startsWith('mock_jwt_token_')) {
        console.warn('⚠️ Intento de usar un token mock para una llamada protegida real');
        throw new Error('Sesión en modo local/desconectado. Por favor, inicie sesión con el servidor activo.');
      }
      headers['Authorization'] = `Bearer ${token}`;
      console.log('✅ Token enviado en header Authorization');
    } else {
      console.error('❌ No hay token disponible');
      throw new Error('No authentication token found. Please log in.');
    }
  }

  console.log(`📡 Enviando ${options.method || 'GET'} a ${API_URL}${endpoint}`);
  
  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
      credentials: 'include', // Send cookies too
    });

    if (!response.ok) {
      let errorMessage = `HTTP Error: ${response.status}`;
      let errorExtra: Record<string, any> = {};
      
      // Provide more specific error messages
      if (response.status === 401) {
        errorMessage = 'Unauthorized: Your session has expired. Please log in again.';
      } else if (response.status === 403) {
        errorMessage = 'Forbidden: You do not have permission to access this resource.';
      }
      
      try {
        const error = await response.json();
        errorMessage = error.message || error.error || errorMessage;
        if (error.cooldown) errorExtra = { cooldown: true, secondsRemaining: error.secondsRemaining };
      } catch {
        // Response body is not JSON
      }
      console.error(`❌ Error ${response.status}:`, errorMessage);
      const err = Object.assign(new Error(errorMessage), { status: response.status }, errorExtra);
      throw err;
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return undefined as T;
    }

    return response.json();
  } catch (netErr: any) {
    if (netErr.message === 'Failed to fetch' || netErr.name === 'TypeError') {
      console.error('❌ Error de conexión al backend:', netErr);
      throw new Error(`No se pudo conectar con el servidor backend (${API_URL}${endpoint}). Asegúrese de que el backend esté corriendo en el puerto 8080.`);
    }
    throw netErr;
  }
}

// ==================== AUTH ENDPOINTS ====================

export const authService = {
  // Phone-based login/register
  async phoneAuth(phone: string, name?: string): Promise<AuthResponse> {
    const data = await fetchAPI<AuthResponse>('/auth/phone', {
      method: 'POST',
      body: JSON.stringify({ phone, name }),
    }, false); // No auth required for login

    if (data.token) {
      setToken(data.token);
    }
    return data;
  },

  // Admin login (email/password)
  async adminLogin(email: string, password: string): Promise<AuthResponse> {
    const data = await fetchAPI<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }, false);

    if (data.token) {
      setToken(data.token);
    }
    return data;
  },

  // Complete onboarding
  async onboard(request: OnboardRequest): Promise<AuthResponse> {
    const data = await fetchAPI<AuthResponse>('/auth/onboard', {
      method: 'POST',
      body: JSON.stringify(request),
    });

    if (data.token) {
      setToken(data.token);
    }
    return data;
  },

  // Get current user info (verify token)
  async me(): Promise<AuthResponse> {
    return fetchAPI<AuthResponse>('/auth/me', { method: 'GET' });
  },

  // Logout
  async logout(): Promise<void> {
    try {
      await fetchAPI<void>('/auth/logout', { method: 'POST' });
    } catch {
      // Even if backend call fails, clear local token
    }
    clearToken();
  },

  // Check if user has a token
  hasToken(): boolean {
    return !!getToken();
  },

  // Clear local auth state
  clearLocalAuth(): void {
    clearToken();
  },

  // Request password reset OTP
  async forgotPassword(email: string): Promise<{ message: string }> {
    return fetchAPI<{ message: string }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }, false);
  },

  // Verify OTP and reset password
  async resetPassword(email: string, otp: string, newPassword: string): Promise<{ message: string }> {
    return fetchAPI<{ message: string }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email, otp, newPassword }),
    }, false);
  },
};

// ==================== USERS ====================

export const backendService = {
  // READ - Get all users (admin)
  async getAllUsers(): Promise<any[]> {
    return fetchAPI<any[]>('/users', { method: 'GET' });
  },

  // READ - Get user by ID
  async getUserById(id: number): Promise<any> {
    return fetchAPI<any>(`/users/${id}`, { method: 'GET' });
  },

  // ==================== WHITELIST ====================

  async getWhitelist(): Promise<any[]> {
    return fetchAPI<any[]>('/whitelist', { method: 'GET' });
  },

  async addToWhitelist(entry: { phone: string; name?: string; email?: string; category?: string; role?: string }): Promise<any> {
    return fetchAPI<any>('/whitelist', {
      method: 'POST',
      body: JSON.stringify({ 
        phone: entry.phone,
        name: entry.name || '',
        email: entry.email || '',
        category: entry.category || 'NONE',
        role: entry.role || 'ALUMNO'
      }),
    });
  },

  async removeFromWhitelist(phone: string): Promise<void> {
    return fetchAPI<void>(`/whitelist/phone/${encodeURIComponent(phone)}`, {
      method: 'DELETE',
    });
  },

  async updateStudent(phone: string, updates: any): Promise<any> {
    return fetchAPI<any>(`/whitelist/${encodeURIComponent(phone)}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  async updateUserStatus(userId: string, status: string): Promise<any> {
    return fetchAPI<any>(`/users/${encodeURIComponent(userId)}`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  },

  async getAllDemos(): Promise<any[]> {
    return fetchAPI<any[]>('/voice-audios/all-demos', { method: 'GET' });
  },

  async updateDemoVisualGenre(demoId: string, visualGenre: string): Promise<any> {
    return fetchAPI<any>(`/voice-audios/${encodeURIComponent(demoId)}/visual-genre`, {
      method: 'PUT',
      body: JSON.stringify({ visualGenre }),
    });
  },
};

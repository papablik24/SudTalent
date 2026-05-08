// API_URL debe ser ajustada según tu configuración
const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080/api';

// ==================== TOKEN MANAGEMENT ====================

const TOKEN_KEY = 'sud_jwt_token';

function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
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
}

// ==================== HTTP SERVICE ====================

async function fetchAPI<T>(
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
      headers['Authorization'] = `Bearer ${token}`;
      console.log('✅ Token enviado en header Authorization');
    } else {
      console.error('❌ No hay token disponible');
      throw new Error('No authentication token found. Please log in.');
    }
  }

  console.log(`📡 Enviando ${options.method || 'GET'} a ${API_URL}${endpoint}`);
  
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
    credentials: 'include', // Send cookies too
  });

  if (!response.ok) {
    let errorMessage = `HTTP Error: ${response.status}`;
    
    // Provide more specific error messages
    if (response.status === 401) {
      errorMessage = 'Unauthorized: Your session has expired. Please log in again.';
    } else if (response.status === 403) {
      errorMessage = 'Forbidden: You do not have permission to access this resource. Make sure you are logged in as an admin.';
    }
    
    try {
      const error = await response.json();
      errorMessage = error.message || error.error || errorMessage;
    } catch {
      // Response body is not JSON
    }
    console.error(`❌ Error ${response.status}:`, errorMessage);
    throw new Error(errorMessage);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
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
  }
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

  async addToWhitelist(entry: { phone: string }): Promise<any> {
    return fetchAPI<any>('/whitelist', {
      method: 'POST',
      body: JSON.stringify({ phone: entry.phone }),
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
};

import { fetchAPI } from './backendService';

// ── Types ─────────────────────────────────────────────────────────────
export interface ProfesorDTO {
  id: string;
  name: string;
  email: string;
  phone: string;
  especialidad: string;
  cursosAsignados?: string;
  active: boolean;
  role: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProfesorRequest {
  name: string;
  email: string;
  phone?: string;
  especialidad: string;
  password?: string;
  cursosAsignados?: string;
}

export interface UpdateProfesorRequest {
  name?: string;
  email?: string;
  phone?: string;
  especialidad?: string;
  active?: boolean;
  cursosAsignados?: string;
}

// ── Service ───────────────────────────────────────────────────────────
export const profesorService = {

  async getAll(): Promise<ProfesorDTO[]> {
    return fetchAPI<ProfesorDTO[]>('/profesores');
  },

  async getById(id: string): Promise<ProfesorDTO> {
    return fetchAPI<ProfesorDTO>(`/profesores/${id}`);
  },

  async create(data: CreateProfesorRequest): Promise<ProfesorDTO> {
    return fetchAPI<ProfesorDTO>('/profesores', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async update(id: string, data: UpdateProfesorRequest): Promise<ProfesorDTO> {
    return fetchAPI<ProfesorDTO>(`/profesores/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async remove(id: string): Promise<void> {
    await fetchAPI<{ message: string }>(`/profesores/${id}`, {
      method: 'DELETE',
    });
  },
};

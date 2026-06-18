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

// ── Helper: normalizar campo id ───────────────────────────────────────
function normalize(raw: any): ProfesorDTO {
  return { ...raw, id: raw.id ?? raw.usuarioId ?? '' };
}

// ── Service ───────────────────────────────────────────────────────────
export const profesorService = {

  async getAll(): Promise<ProfesorDTO[]> {
    const data = await fetchAPI<any[]>('/profesores');
    return data.map(normalize);
  },

  async getById(id: string): Promise<ProfesorDTO> {
    const data = await fetchAPI<any>(`/profesores/${id}`);
    return normalize(data);
  },

  async create(data: CreateProfesorRequest): Promise<ProfesorDTO> {
    const raw = await fetchAPI<any>('/profesores', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return normalize(raw);
  },

  async update(id: string, data: UpdateProfesorRequest): Promise<ProfesorDTO> {
    const raw = await fetchAPI<any>(`/profesores/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return normalize(raw);
  },

  async remove(id: string): Promise<void> {
    await fetchAPI<{ message: string }>(`/profesores/${id}`, {
      method: 'DELETE',
    });
  },

  async getMyAlumnos(): Promise<ProfesorAlumnoDTO[]> {
    return fetchAPI<ProfesorAlumnoDTO[]>('/profesores/me/alumnos');
  },
};

export interface ProfesorAlumnoDTO {
  id: string;
  name: string;
  email: string;
  phone?: string;
  profileType?: string;
  status?: string;
  age?: number;
  childName?: string;
  childAge?: number;
  profileImageUrl?: string;
  cursos: {
    id: string;
    titulo: string;
    cursoKey: string;
  }[];
}


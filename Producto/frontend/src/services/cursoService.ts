import { fetchAPI } from './backendService';

// ── Types ─────────────────────────────────────────────────────────────

export interface AlumnoResumen {
  id: string;
  nombre: string;
  email: string;
  profileImageUrl?: string;
}

export interface CursoDTO {
  id: string;
  cursoKey: string;
  titulo: string;
  descripcion: string;
  modalidad: 'PRESENCIAL' | 'ONLINE' | 'MIXTO';
  profesorId?: string;
  profesorNombre?: string;
  alumnos: AlumnoResumen[];
  totalAlumnos: number;
  createdAt: string;
  updatedAt: string;
}

// ── Service ───────────────────────────────────────────────────────────

export const cursoService = {

  async getAll(): Promise<CursoDTO[]> {
    return fetchAPI<CursoDTO[]>('/cursos');
  },

  async getById(id: string): Promise<CursoDTO> {
    return fetchAPI<CursoDTO>(`/cursos/${id}`);
  },

  async getMisCursos(): Promise<CursoDTO[]> {
    return fetchAPI<CursoDTO[]>('/cursos/mis-cursos');
  },

  /** Admin: asigna o desasigna un profesor. Pasar profesorId vacío para desasignar. */
  async assignProfesor(cursoId: string, profesorId: string | null): Promise<CursoDTO> {
    return fetchAPI<CursoDTO>(`/cursos/${cursoId}/profesor`, {
      method: 'PUT',
      body: JSON.stringify({ profesorId: profesorId ?? '' }),
    });
  },

  /** Alumno: inscribirse */
  async enroll(cursoId: string): Promise<CursoDTO> {
    return fetchAPI<CursoDTO>(`/cursos/${cursoId}/enroll`, { method: 'POST' });
  },

  /** Alumno: desinscribirse */
  async unenroll(cursoId: string): Promise<CursoDTO> {
    return fetchAPI<CursoDTO>(`/cursos/${cursoId}/enroll`, { method: 'DELETE' });
  },
};

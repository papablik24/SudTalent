import { fetchAPI } from './backendService';
import { CursoDTO } from '../types';

export const cursoService = {
  async getAll(): Promise<CursoDTO[]> {
    return fetchAPI<CursoDTO[]>('/cursos');
  },

  async getByProfesor(profesorId: string): Promise<CursoDTO[]> {
    return fetchAPI<CursoDTO[]>(`/cursos/profesor/${profesorId}`);
  }
};

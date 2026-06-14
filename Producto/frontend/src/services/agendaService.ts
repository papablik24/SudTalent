import { fetchAPI } from './backendService';

export interface AgendaEventoDTO {
  id: string;
  profesorId: string;
  cursoId: string;
  cursoTitulo: string;
  titulo: string;
  descripcion?: string;
  fecha: string; // YYYY-MM-DD
  hora: string;  // HH:mm
  link?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAgendaEventoRequest {
  cursoId: string;
  titulo: string;
  descripcion?: string;
  fecha: string;
  hora: string;
  link?: string;
}

export const agendaService = {
  async getAgenda(): Promise<AgendaEventoDTO[]> {
    return fetchAPI<AgendaEventoDTO[]>('/profesores/me/agenda');
  },

  async create(data: CreateAgendaEventoRequest): Promise<AgendaEventoDTO> {
    return fetchAPI<AgendaEventoDTO>('/profesores/me/agenda', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async update(id: string, data: CreateAgendaEventoRequest): Promise<AgendaEventoDTO> {
    return fetchAPI<AgendaEventoDTO>(`/profesores/me/agenda/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async delete(id: string): Promise<void> {
    await fetchAPI<void>(`/profesores/me/agenda/${id}`, {
      method: 'DELETE',
    });
  },

  async getAgendaByCurso(cursoId: string): Promise<AgendaEventoDTO[]> {
    return fetchAPI<AgendaEventoDTO[]>(`/cursos/${cursoId}/agenda`);
  },
};

import { fetchAPI } from './backendService';

export type AnuncioTipo = 'ANUNCIO' | 'CAPSULA';

export interface AnuncioDTO {
  id: string;
  cursoId: string;
  autorId: string;
  autorNombre: string;
  autorImageUrl?: string;
  tipo: AnuncioTipo;
  titulo: string;
  contenido: string;
  urlRecurso?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAnuncioRequest {
  tipo: AnuncioTipo;
  titulo: string;
  contenido: string;
  urlRecurso?: string;
}

export const anuncioService = {

  async getAnuncios(cursoId: string): Promise<AnuncioDTO[]> {
    return fetchAPI<AnuncioDTO[]>(`/anuncios/curso/${cursoId}`);
  },

  async create(cursoId: string, data: CreateAnuncioRequest): Promise<AnuncioDTO> {
    return fetchAPI<AnuncioDTO>(`/anuncios/curso/${cursoId}`, {
      method: 'POST',
      body: JSON.stringify({
        tipo: data.tipo,
        titulo: data.titulo,
        contenido: data.contenido,
        urlRecurso: data.urlRecurso ?? '',
      }),
    });
  },

  async delete(cursoId: string, anuncioId: string): Promise<void> {
    await fetchAPI<void>(`/anuncios/curso/${cursoId}/${anuncioId}`, {
      method: 'DELETE',
    });
  },
};

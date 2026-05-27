/**
 * Servicio de Convocatorias
 * Conecta con la API del backend — migrado de localStorage
 */

import { fetchAPI } from './backendService';

export type ConvocatoriaCategoria =
  | 'Doblaje'
  | 'Podcast'
  | 'Locución'
  | 'Presentación'
  | 'Narración'
  | 'Musical'
  | 'Otro';

export type ConvocatoriaEstado = 'BORRADOR' | 'ACTIVA' | 'CERRADA' | 'ARCHIVADA';

export type GeneroVisual =
  | 'Acción'
  | 'Drama'
  | 'Romántico'
  | 'Musical'
  | 'Trágico'
  | 'Cómico'
  | 'Suspenso'
  | 'Fantasía'
  | 'Terror'
  | 'Infantil'
  | 'Otro';

export const CONVOCATORIA_CATEGORIAS: ConvocatoriaCategoria[] = [
  'Doblaje', 'Podcast', 'Locución', 'Presentación', 'Narración', 'Musical', 'Otro',
];

export const CONVOCATORIA_ESTADOS: ConvocatoriaEstado[] = [
  'BORRADOR', 'ACTIVA', 'CERRADA', 'ARCHIVADA',
];

export const GENEROS_VISUALES: GeneroVisual[] = [
  'Acción', 'Drama', 'Romántico', 'Musical', 'Trágico', 'Cómico',
  'Suspenso', 'Fantasía', 'Terror', 'Infantil', 'Otro',
];

export interface Convocatoria {
  id: string;                        // UUID del backend
  titulo: string;
  descripcion: string;
  categoria: ConvocatoriaCategoria;
  generoVisual?: GeneroVisual;
  requisitos: string[];
  fechaLimite: string;               // LocalDate como ISO string
  estado: ConvocatoriaEstado;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;                // UUID del profesor
}

export interface CreateConvocatoriaDTO {
  titulo: string;
  descripcion: string;
  categoria: ConvocatoriaCategoria;
  generoVisual?: GeneroVisual;
  requisitos: string[];
  fechaLimite: string;
  estado: ConvocatoriaEstado;
}

// ── API calls ──────────────────────────────────────────────────────────

/** Todas las convocatorias (admin/profesor) */
export async function getConvocatorias(): Promise<Convocatoria[]> {
  try {
    const data = await fetchAPI<Convocatoria[]>('/convocatorias');
    return data || [];
  } catch (error) {
    console.error('Error al obtener convocatorias:', error);
    throw error;
  }
}

/** Solo convocatorias ACTIVAS (vista alumnos) */
export async function getConvocatoriasActivas(): Promise<Convocatoria[]> {
  try {
    const data = await fetchAPI<Convocatoria[]>('/convocatorias/activas');
    return data || [];
  } catch (error) {
    console.error('Error al obtener convocatorias activas:', error);
    throw error;
  }
}

/** Convocatoria por ID */
export async function getConvocatoriaById(id: string): Promise<Convocatoria | null> {
  try {
    return await fetchAPI<Convocatoria>(`/convocatorias/${id}`);
  } catch (error) {
    console.error(`Error al obtener convocatoria ${id}:`, error);
    return null;
  }
}

/** Crear convocatoria */
export async function createConvocatoria(data: CreateConvocatoriaDTO): Promise<Convocatoria> {
  const response = await fetchAPI<Convocatoria>('/convocatorias', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  console.log('✅ Convocatoria creada:', response);
  return response;
}

/** Actualizar convocatoria */
export async function updateConvocatoria(
  id: string,
  data: Partial<CreateConvocatoriaDTO>,
): Promise<Convocatoria | null> {
  try {
    const response = await fetchAPI<Convocatoria>(`/convocatorias/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    console.log('✅ Convocatoria actualizada:', response);
    return response;
  } catch (error) {
    console.error(`Error al actualizar convocatoria ${id}:`, error);
    throw error;
  }
}

/** Cerrar convocatoria */
export async function closeConvocatoria(id: string): Promise<Convocatoria | null> {
  return updateConvocatoria(id, { estado: 'CERRADA' });
}

/** Archivar convocatoria */
export async function archiveConvocatoria(id: string): Promise<Convocatoria | null> {
  return updateConvocatoria(id, { estado: 'ARCHIVADA' });
}

/** Eliminar convocatoria */
export async function deleteConvocatoria(id: string): Promise<void> {
  await fetchAPI(`/convocatorias/${id}`, { method: 'DELETE' });
  console.log('✅ Convocatoria eliminada');
}

export const convocatoriaService = {
  getConvocatorias,
  getConvocatoriasActivas,
  getConvocatoriaById,
  createConvocatoria,
  updateConvocatoria,
  closeConvocatoria,
  archiveConvocatoria,
  deleteConvocatoria,
};

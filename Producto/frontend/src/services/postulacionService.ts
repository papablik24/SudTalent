/**
 * Servicio de Postulaciones
 * Conecta con la API del backend para gestión de postulaciones
 */

import { fetchAPI } from './backendService';

export type PostulacionEstado = 'PENDIENTE' | 'EN_REVISION' | 'ACEPTADA' | 'RECHAZADA' | 'CANCELADA';

export const POSTULACION_ESTADOS: PostulacionEstado[] = [
  'PENDIENTE', 'EN_REVISION', 'ACEPTADA', 'RECHAZADA', 'CANCELADA'
];

/**
 * Tipo de Postulación desde el backend (con UUIDs)
 */
export interface Postulacion {
  id: string; // UUID
  alumnoId?: string; // UUID del alumno
  convocatoriaId: string; // UUID
  convocatoriaTitulo?: string;
  convocatoriaCategoria?: string;
  convocatoriaDeleted?: boolean;
  userName?: string;
  userEmail?: string;
  userPhone?: string;
  alumnoSpecialties?: string;
  estado?: PostulacionEstado;
  mensaje?: string;
  voiceAudioId?: string;
  voiceAudioTitle?: string;
  voiceAudioUrl?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  audicionId?: string;
  audicionPuntaje?: number;
  audicionObservaciones?: string;
  audicionFecha?: string;
  audicionHora?: string;
  audicionModalidad?: string;
  audicionLugar?: string;
  audicionLink?: string;
  audicionEstado?: string;
  audicionResultado?: string;
  audicionProfesorNombre?: string;
}

export interface CreatePostulacionDTO {
  convocatoriaId: string;   // UUID de la convocatoria
  alumnoId?: string;        // UUID del alumno (opcional, si no lo extrae el backend del JWT)
  mensaje?: string;
  voiceAudioId?: string;
}

// ── Public API ─────────────────────────────────────────────────────────

/**
 * Obtener todas las postulaciones (solo admin)
 */
export async function getAllPostulaciones(): Promise<Postulacion[]> {
  try {
    const data = await fetchAPI<Postulacion[]>('/postulaciones');
    return data || [];
  } catch (error) {
    console.error('Error al obtener postulaciones:', error);
    throw error;
  }
}

/**
 * Obtener postulación por ID
 */
export async function getPostulacionById(id: string): Promise<Postulacion> {
  return fetchAPI<Postulacion>(`/postulaciones/${id}`);
}

/**
 * Obtener postulaciones de un usuario (alumno)
 */
export async function getPostulacionesByUser(userId: string): Promise<Postulacion[]> {
  try {
    const data = await fetchAPI<Postulacion[]>(`/postulaciones/alumno/${userId}`);
    return data || [];
  } catch (error) {
    console.error(`Error al obtener postulaciones del usuario ${userId}:`, error);
    throw error;
  }
}

/**
 * Obtener postulaciones de una convocatoria
 */
export async function getPostulacionesByConvocatoria(convocatoriaId: string): Promise<Postulacion[]> {
  try {
    const data = await fetchAPI<Postulacion[]>(`/postulaciones/convocatoria/${convocatoriaId}`);
    return data || [];
  } catch (error) {
    console.error(`Error al obtener postulaciones de la convocatoria ${convocatoriaId}:`, error);
    throw error;
  }
}

/**
 * Verificar si un usuario ya postuló a una convocatoria
 */
export async function hasUserApplied(userId: string, convocatoriaId: string): Promise<boolean> {
  try {
    const postulaciones = await getPostulacionesByUser(userId);
    return postulaciones.some(p => p.convocatoriaId === convocatoriaId && !p.deletedAt);
  } catch (error) {
    console.error('Error al verificar postulación:', error);
    return false;
  }
}

/**
 * Crear nueva postulación
 */
export async function createPostulacion(data: CreatePostulacionDTO): Promise<Postulacion> {
  try {
    const response = await fetchAPI<Postulacion>('/postulaciones', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    console.log('✅ Postulación creada:', response);
    return response;
  } catch (error) {
    console.error('Error al crear postulación:', error);
    throw error;
  }
}

/**
 * Actualizar estado de postulación (admin)
 */
export async function updatePostulacionStatus(id: string, estado: PostulacionEstado): Promise<Postulacion> {
  try {
    const response = await fetchAPI<Postulacion>(`/postulaciones/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ estado }),
    });
    console.log('✅ Postulación actualizada:', response);
    return response;
  } catch (error) {
    console.error(`Error al actualizar postulación ${id}:`, error);
    throw error;
  }
}

/**
 * Eliminar postulación (soft delete)
 */
export async function deletePostulacion(id: string): Promise<void> {
  try {
    await fetchAPI(`/postulaciones/${id}`, {
      method: 'DELETE',
    }, true); // Requiere autenticación y rol ADMIN
    console.log('✅ Postulación eliminada');
  } catch (error) {
    console.error(`Error al eliminar postulación ${id}:`, error);
    throw error;
  }
}

/**
 * Actualizar campos de la postulación (estado, mensaje, etc.)
 */
export async function updatePostulacion(id: string, data: { estado?: string; mensaje?: string; voiceAudioId?: string }): Promise<Postulacion> {
  try {
    const response = await fetchAPI<Postulacion>(`/postulaciones/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    console.log('✅ Postulación actualizada:', response);
    return response;
  } catch (error) {
    console.error(`Error al actualizar postulación ${id}:`, error);
    throw error;
  }
}

export const postulacionService = {
  getAllPostulaciones,
  getPostulacionById,
  getPostulacionesByUser,
  getPostulacionesByConvocatoria,
  hasUserApplied,
  createPostulacion,
  updatePostulacionStatus,
  updatePostulacion,
  deletePostulacion,
};

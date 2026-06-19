/**
 * Servicio de Audiciones
 * Conecta con la API del backend para la gestión de audiciones
 */

import { fetchAPI } from './backendService';

export type AudicionModalidad = 'ONLINE' | 'PRESENCIAL';
export type AudicionEstado = 'PROGRAMADA' | 'EVALUADA' | 'CANCELADA';
export type AudicionResultado = 'PENDIENTE' | 'APROBADA' | 'RECHAZADA';

export interface Audicion {
  id: string; // UUID
  postulacionId: string; // UUID
  alumnoId: string; // UUID
  profesorId: string; // UUID

  // Alumno Info
  alumnoNombre: string;
  alumnoEmail: string;
  alumnoTelefono: string;

  // Profesor Info
  profesorNombre: string;
  profesorEspecialidad: string;

  // Convocatoria Info
  convocatoriaTitulo: string;
  convocatoriaCategoria: string;

  // Audicion Info
  fecha: string;
  hora: string;
  modalidad: AudicionModalidad;
  lugar: string;
  link?: string;
  estado: AudicionEstado;
  puntaje?: number;
  observaciones?: string;
  resultado: AudicionResultado;

  createdAt: string;
  updatedAt: string;

  // VoiceAudio Info
  voiceAudioId?: string;
  voiceAudioTitle?: string;
  voiceAudioUrl?: string;
}

export interface AudicionRequestPayload {
  postulacionId: string;
  profesorId: string;
  fecha: string;
  hora: string;
  modalidad: AudicionModalidad;
  lugar: string;
  link?: string;
}

export interface AudicionEvaluacionPayload {
  puntaje: number; // 1 a 100
  observaciones: string;
  resultado: 'APROBADA' | 'RECHAZADA';
}

/**
 * Obtener todas las audiciones (solo admin)
 */
export async function getAllAudiciones(): Promise<Audicion[]> {
  try {
    const data = await fetchAPI<Audicion[]>('/audiciones');
    return data || [];
  } catch (error) {
    console.error('Error al obtener todas las audiciones:', error);
    throw error;
  }
}

/**
 * Programar/Crear una audición (solo admin)
 */
export async function crearAudicion(payload: AudicionRequestPayload): Promise<Audicion> {
  try {
    const data = await fetchAPI<Audicion>('/audiciones', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return data;
  } catch (error) {
    console.error('Error al crear audición:', error);
    throw error;
  }
}

/**
 * Cancelar una audición (solo admin)
 */
export async function cancelarAudicion(id: string): Promise<Audicion> {
  try {
    const data = await fetchAPI<Audicion>(`/audiciones/${id}/cancelar`, {
      method: 'PUT',
    });
    return data;
  } catch (error) {
    console.error(`Error al cancelar audición ${id}:`, error);
    throw error;
  }
}

/**
 * Obtener audiciones asignadas al profesor logueado (solo profesor)
 */
export async function getMisAudicionesProfesor(): Promise<Audicion[]> {
  try {
    const data = await fetchAPI<Audicion[]>('/profesores/me/audiciones');
    return data || [];
  } catch (error) {
    console.error('Error al obtener audiciones del profesor:', error);
    throw error;
  }
}

/**
 * Evaluar una audición (solo profesor asignado)
 */
export async function evaluarAudicion(id: string, payload: AudicionEvaluacionPayload): Promise<Audicion> {
  try {
    const data = await fetchAPI<Audicion>(`/profesores/me/audiciones/${id}/evaluacion`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    return data;
  } catch (error) {
    console.error(`Error al evaluar audición ${id}:`, error);
    throw error;
  }
}

export const audicionService = {
  getAllAudiciones,
  crearAudicion,
  cancelarAudicion,
  getMisAudicionesProfesor,
  evaluarAudicion,
};

/**
 * Servicio de Postulaciones
 * Capa de abstracción para gestión de postulaciones.
 * TODO: reemplazar localStorage por llamada a API cuando backend esté listo
 */

export type PostulacionEstado = 'PENDIENTE' | 'EN_REVISION' | 'ACEPTADA' | 'RECHAZADA';

export const POSTULACION_ESTADOS: PostulacionEstado[] = [
  'PENDIENTE', 'EN_REVISION', 'ACEPTADA', 'RECHAZADA'
];

export interface Postulacion {
  id: string;
  convocatoriaId: string;
  convocatoriaTitulo?: string;
  convocatoriaCategoria?: string;
  userId: string;
  userName: string;
  userEmail: string;
  userPhone: string;
  estado: PostulacionEstado;
  mensaje?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePostulacionDTO {
  convocatoriaId: string;
  convocatoriaTitulo?: string;
  convocatoriaCategoria?: string;
  userId: string;
  userName: string;
  userEmail: string;
  userPhone: string;
  mensaje?: string;
}

const STORAGE_KEY = 'sud_postulaciones_v2';

// ── Mock data inicial ──────────────────────────────────────────────────
const MOCK_DATA: Postulacion[] = [
  {
    id: 'post_mock_1',
    convocatoriaId: 'conv_mock_1',
    convocatoriaTitulo: 'Voz juvenil para personaje animado',
    convocatoriaCategoria: 'Doblaje',
    userId: '2',
    userName: 'Lewis Hamilton',
    userEmail: 'sirlewis@sudtalent.cl',
    userPhone: '55888555',
    estado: 'PENDIENTE',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'post_mock_2',
    convocatoriaId: 'conv_mock_2',
    convocatoriaTitulo: 'Narrador para podcast educativo',
    convocatoriaCategoria: 'Podcast',
    userId: '2',
    userName: 'Lewis Hamilton',
    userEmail: 'sirlewis@sudtalent.cl',
    userPhone: '55888555',
    estado: 'EN_REVISION',
    createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'post_mock_3',
    convocatoriaId: 'conv_mock_3',
    convocatoriaTitulo: 'Voz comercial para presentación institucional',
    convocatoriaCategoria: 'Presentación',
    userId: '3',
    userName: 'Talento Demo',
    userEmail: 'demo@sudtalent.cl',
    userPhone: '99887766',
    estado: 'ACEPTADA',
    createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

function getAll(): Postulacion[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(MOCK_DATA));
    return [...MOCK_DATA];
  }
  return JSON.parse(raw);
}

function saveAll(items: Postulacion[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

// ── Public API ─────────────────────────────────────────────────────────

/** Obtener postulaciones de un usuario */
// TODO: reemplazar localStorage por llamada a API cuando backend esté listo
export async function getPostulacionesByUser(userId: string): Promise<Postulacion[]> {
  return getAll().filter(p => p.userId === userId);
}

/** Obtener postulaciones de una convocatoria */
// TODO: reemplazar localStorage por llamada a API cuando backend esté listo
export async function getPostulacionesByConvocatoria(convocatoriaId: string): Promise<Postulacion[]> {
  return getAll().filter(p => p.convocatoriaId === convocatoriaId);
}

/** Obtener todas las postulaciones (admin) */
// TODO: reemplazar localStorage por llamada a API cuando backend esté listo
export async function getAllPostulaciones(): Promise<Postulacion[]> {
  return getAll();
}

/** Verificar si un usuario ya postuló a una convocatoria */
// TODO: reemplazar localStorage por llamada a API cuando backend esté listo
export async function hasUserApplied(userId: string, convocatoriaId: string): Promise<boolean> {
  return getAll().some(p => p.userId === userId && p.convocatoriaId === convocatoriaId);
}

/** Crear nueva postulación */
// TODO: reemplazar localStorage por llamada a API cuando backend esté listo
export async function createPostulacion(data: CreatePostulacionDTO): Promise<Postulacion> {
  const all = getAll();

  // Verificar duplicados
  const exists = all.some(p => p.userId === data.userId && p.convocatoriaId === data.convocatoriaId);
  if (exists) {
    throw new Error('Ya has postulado a esta convocatoria.');
  }

  const now = new Date().toISOString();
  const newPost: Postulacion = {
    ...data,
    id: `post_${Date.now()}`,
    estado: 'PENDIENTE',
    createdAt: now,
    updatedAt: now,
  };
  all.unshift(newPost);
  saveAll(all);
  return newPost;
}

/** Actualizar estado de postulación (admin) */
// TODO: reemplazar localStorage por llamada a API cuando backend esté listo
export async function updatePostulacionStatus(id: string, estado: PostulacionEstado): Promise<Postulacion | null> {
  const all = getAll();
  const idx = all.findIndex(p => p.id === id);
  if (idx === -1) return null;
  all[idx] = { ...all[idx], estado, updatedAt: new Date().toISOString() };
  saveAll(all);
  return all[idx];
}

/** Eliminar postulación */
// TODO: reemplazar localStorage por llamada a API cuando backend esté listo
export async function deletePostulacion(id: string): Promise<void> {
  const all = getAll().filter(p => p.id !== id);
  saveAll(all);
}

export const postulacionService = {
  getPostulacionesByUser,
  getPostulacionesByConvocatoria,
  getAllPostulaciones,
  hasUserApplied,
  createPostulacion,
  updatePostulacionStatus,
  deletePostulacion,
};

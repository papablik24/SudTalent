/**
 * Servicio de Convocatorias
 * Capa de abstracción para gestión de convocatorias.
 * TODO: reemplazar localStorage por llamada a API cuando backend esté listo
 */

export type ConvocatoriaCategoria = 'Doblaje' | 'Podcast' | 'Locución' | 'Presentación' | 'Narración' | 'Musical' | 'Otro';
export type ConvocatoriaEstado = 'BORRADOR' | 'ACTIVA' | 'CERRADA' | 'ARCHIVADA';
export type GeneroVisual = 'Acción' | 'Drama' | 'Romántico' | 'Musical' | 'Trágico' | 'Cómico' | 'Suspenso' | 'Fantasía' | 'Terror' | 'Infantil' | 'Otro';

export const CONVOCATORIA_CATEGORIAS: ConvocatoriaCategoria[] = [
  'Doblaje', 'Podcast', 'Locución', 'Presentación', 'Narración', 'Musical', 'Otro'
];

export const CONVOCATORIA_ESTADOS: ConvocatoriaEstado[] = [
  'BORRADOR', 'ACTIVA', 'CERRADA', 'ARCHIVADA'
];

export const GENEROS_VISUALES: GeneroVisual[] = [
  'Acción', 'Drama', 'Romántico', 'Musical', 'Trágico', 'Cómico', 'Suspenso', 'Fantasía', 'Terror', 'Infantil', 'Otro'
];

export interface Convocatoria {
  id: string;
  titulo: string;
  descripcion: string;
  categoria: ConvocatoriaCategoria;
  generoVisual?: GeneroVisual;
  requisitos: string[];
  fechaLimite: string;
  estado: ConvocatoriaEstado;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
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

const STORAGE_KEY = 'sud_convocatorias_v2';

// ── Mock data inicial ──────────────────────────────────────────────────
const MOCK_DATA: Convocatoria[] = [
  {
    id: 'conv_mock_1',
    titulo: 'Voz juvenil para personaje animado',
    descripcion: 'Buscamos una voz juvenil, enérgica y expresiva para interpretar un personaje principal en una serie animada de aventuras. El personaje es un adolescente curioso y valiente que lidera un grupo de exploradores.',
    categoria: 'Doblaje',
    generoVisual: 'Acción',
    requisitos: ['Rango vocal juvenil (15-20 años)', 'Experiencia en doblaje animado', 'Capacidad de proyección emocional'],
    fechaLimite: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    estado: 'ACTIVA',
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    createdBy: 'admin',
  },
  {
    id: 'conv_mock_2',
    titulo: 'Narrador para podcast educativo',
    descripcion: 'Se requiere narrador con voz cálida y clara para un podcast educativo sobre ciencias naturales dirigido a jóvenes de 12 a 18 años. Episodios semanales de 20 minutos.',
    categoria: 'Podcast',
    generoVisual: undefined,
    requisitos: ['Dicción impecable', 'Voz cálida y amigable', 'Disponibilidad semanal'],
    fechaLimite: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(),
    estado: 'ACTIVA',
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    createdBy: 'admin',
  },
  {
    id: 'conv_mock_3',
    titulo: 'Voz comercial para presentación institucional',
    descripcion: 'Locutor o locutora profesional para grabar la presentación institucional de una empresa de tecnología. Tono corporativo, seguro y moderno.',
    categoria: 'Presentación',
    generoVisual: undefined,
    requisitos: ['Experiencia en locución comercial', 'Equipo de grabación propio', 'Entrega en 48 horas'],
    fechaLimite: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    estado: 'ACTIVA',
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    createdBy: 'admin',
  },
];

function getAll(): Convocatoria[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    // Seed mock data on first load
    localStorage.setItem(STORAGE_KEY, JSON.stringify(MOCK_DATA));
    return [...MOCK_DATA];
  }
  return JSON.parse(raw);
}

function saveAll(items: Convocatoria[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

// ── Public API ─────────────────────────────────────────────────────────

/** Obtener todas las convocatorias */
// TODO: reemplazar localStorage por llamada a API cuando backend esté listo
export async function getConvocatorias(): Promise<Convocatoria[]> {
  return getAll();
}

/** Obtener convocatorias activas (para vista usuario) */
// TODO: reemplazar localStorage por llamada a API cuando backend esté listo
export async function getConvocatoriasActivas(): Promise<Convocatoria[]> {
  return getAll().filter(c => c.estado === 'ACTIVA');
}

/** Obtener una convocatoria por ID */
// TODO: reemplazar localStorage por llamada a API cuando backend esté listo
export async function getConvocatoriaById(id: string): Promise<Convocatoria | null> {
  return getAll().find(c => c.id === id) || null;
}

/** Crear nueva convocatoria */
// TODO: reemplazar localStorage por llamada a API cuando backend esté listo
export async function createConvocatoria(data: CreateConvocatoriaDTO): Promise<Convocatoria> {
  const now = new Date().toISOString();
  const newConv: Convocatoria = {
    ...data,
    id: `conv_${Date.now()}`,
    createdAt: now,
    updatedAt: now,
    createdBy: 'admin',
  };
  const all = getAll();
  all.unshift(newConv);
  saveAll(all);
  return newConv;
}

/** Actualizar convocatoria existente */
// TODO: reemplazar localStorage por llamada a API cuando backend esté listo
export async function updateConvocatoria(id: string, data: Partial<CreateConvocatoriaDTO>): Promise<Convocatoria | null> {
  const all = getAll();
  const idx = all.findIndex(c => c.id === id);
  if (idx === -1) return null;
  all[idx] = { ...all[idx], ...data, updatedAt: new Date().toISOString() };
  saveAll(all);
  return all[idx];
}

/** Cerrar convocatoria */
// TODO: reemplazar localStorage por llamada a API cuando backend esté listo
export async function closeConvocatoria(id: string): Promise<Convocatoria | null> {
  return updateConvocatoria(id, { estado: 'CERRADA' });
}

/** Archivar convocatoria */
// TODO: reemplazar localStorage por llamada a API cuando backend esté listo
export async function archiveConvocatoria(id: string): Promise<Convocatoria | null> {
  return updateConvocatoria(id, { estado: 'ARCHIVADA' });
}

/** Eliminar convocatoria */
// TODO: reemplazar localStorage por llamada a API cuando backend esté listo
export async function deleteConvocatoria(id: string): Promise<void> {
  const all = getAll().filter(c => c.id !== id);
  saveAll(all);
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

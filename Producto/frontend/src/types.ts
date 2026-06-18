/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = 'ADMIN' | 'USER' | 'PROFESOR';
export type ProfileType = 'PERSONAL' | 'PARENT';
export type ProfileCategory = 'ADULT' | 'MINOR' | 'BOTH' | 'NONE';
export type DemoCategory = 'Doblaje' | 'Locución' | 'Podcast' | 'Presentación';
export type ProfileStatus = 'PENDING' | 'APPROVED' | 'INACTIVE';

/** Tipo de medio: distingue demos de audio vs video */
export type MediaType = 'AUDIO' | 'VIDEO';

/** Formato del archivo subido */
export type FileFormat = 'MP3' | 'WAV' | 'MP4' | 'MOV';

/** Género visual / tipo de escena de la demo */
export type VisualGenre =
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

export const VISUAL_GENRES: VisualGenre[] = [
  'Acción', 'Drama', 'Romántico', 'Musical', 'Trágico',
  'Cómico', 'Suspenso', 'Fantasía', 'Terror', 'Infantil', 'Otro'
];

export const DEMO_CATEGORIES: DemoCategory[] = ['Doblaje', 'Locución', 'Podcast', 'Presentación'];

export interface UserProfile {
  uid: string;
  phone: string;
  role: UserRole;
  onboarded: boolean;
  active?: boolean;
  profileType?: ProfileType;
  category?: ProfileCategory;
  name?: string;
  email?: string;
  avatar?: string;
  bio?: string;
  age?: number;
  createdAt: any;
  status?: ProfileStatus;
  primaryCategory?: DemoCategory;
  lastDemoUpdate?: any;
  profileAudioUrl?: string;   // URL del audio de perfil o enlace externo (Drive, etc.)
  profileImageUrl?: string;
}

export interface TalentProfile {
  userId: string;
  type: ProfileType;
  childName?: string;
  childAge?: number;
  age?: number;
  specialties: string[];
  bio?: string;
  location?: string;
  experience?: string;
  availability?: string;
}

export interface VoiceDemo {
  id: string;
  userId: string;
  title: string;
  category: DemoCategory;
  fileUrl: string;
  duration: string;
  createdAt: any;
  // --- Campos extendidos ---
  mediaType?: MediaType;      // AUDIO | VIDEO
  fileFormat?: FileFormat;    // MP3 | WAV | MP4 | MOV
  visualGenre?: VisualGenre;  // Género visual / tipo de escena
  description?: string;       // Descripción opcional
}

export interface WhitelistEntry {
  phone: string;
  name?: string;
  email?: string;
  category?: ProfileCategory;
  status?: string;
  addedAt: any;
  addedBy?: string;
}

export interface Convocation {
  id: string;
  title: string;
  description: string;
  category: 'Doblaje' | 'Locución' | 'Podcast' | 'Voice Acting' | 'Producción';
  requirements: string[];
  deadline: any;
  status: 'ACTIVA' | 'CERRADA' | 'BORRADOR';
  createdAt: any;
  createdBy: string;
}

export interface Application {
  id: string;
  userId: string;
  convocationId: string;
  status: 'PENDIENTE' | 'EN_REVISION' | 'SELECCIONADO' | 'FINALIZADO';
  appliedAt: any;
  userName?: string;
  userPhone?: string;
}

export type AppView = 'AUTH' | 'ADMIN_DASHBOARD' | 'USER_ONBOARDING' | 'USER_PROFILE' | 'USER_DEMOS' | 'PROFILE_TYPE_SELECTION' | 'ADMIN_STUDENTS' | 'ADMIN_TALENT_REVIEW' | 'ADMIN_CONVOCATORIAS' | 'USER_CONVOCATORIAS';

// ── System Catalogs ───────────────────────────────────────────────────

/** Types of catalog managed via Admin > Ajustes */
export type CatalogType =
  | 'CONVOCATORIA_CATEGORY'
  | 'CONVOCATORIA_STATUS'
  | 'SCENE_TYPE'
  | 'DEMO_CATEGORY'
  | 'PROFILE_STATUS'
  | 'COURSE_AREA'
  | 'COURSE_LEVEL';

/** A single catalog entry managed by the admin */
export interface CatalogItem {
  id: string;
  type: CatalogType;
  name: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Display labels for each catalog type (Spanish) */
export const CATALOG_TYPE_LABELS: Record<CatalogType, { title: string; description: string; color: string }> = {
  CONVOCATORIA_CATEGORY: { title: 'Categorías de Convocatoria', description: 'Tipos de convocatoria que se pueden crear', color: 'sud-turquoise' },
  CONVOCATORIA_STATUS:   { title: 'Estados de Convocatoria', description: 'Ciclo de vida de una convocatoria', color: 'sud-yellow' },
  SCENE_TYPE:            { title: 'Tipos de Escena / Género Visual', description: 'Clasificación de demos por género cinematográfico', color: 'purple-400' },
  DEMO_CATEGORY:         { title: 'Categorías de Demo', description: 'Clasificación principal de muestras de voz', color: 'sud-orange' },
  PROFILE_STATUS:        { title: 'Estados de Perfil', description: 'Estados del ciclo de vida de un talento', color: 'green-400' },
  COURSE_AREA:           { title: 'Áreas Formativas / Cursos', description: 'Áreas de formación vocal disponibles', color: 'blue-400' },
  COURSE_LEVEL:          { title: 'Niveles de Curso', description: 'Niveles de progreso dentro de un área formativa', color: 'pink-400' },
};

/** Default seed data — used when no catalogs exist in storage */
export const DEFAULT_CATALOGS: Omit<CatalogItem, 'id' | 'createdAt' | 'updatedAt'>[] = [
  // Convocatoria categories
  { type: 'CONVOCATORIA_CATEGORY', name: 'Doblaje', active: true },
  { type: 'CONVOCATORIA_CATEGORY', name: 'Podcast', active: true },
  { type: 'CONVOCATORIA_CATEGORY', name: 'Locución', active: true },
  { type: 'CONVOCATORIA_CATEGORY', name: 'Presentación', active: true },
  { type: 'CONVOCATORIA_CATEGORY', name: 'Musical', active: true },
  { type: 'CONVOCATORIA_CATEGORY', name: 'Otro', active: true },
  // Convocatoria statuses
  { type: 'CONVOCATORIA_STATUS', name: 'Borrador', active: true },
  { type: 'CONVOCATORIA_STATUS', name: 'Activa', active: true },
  { type: 'CONVOCATORIA_STATUS', name: 'Cerrada', active: true },
  { type: 'CONVOCATORIA_STATUS', name: 'Archivada', active: true },
  // Scene types / visual genres
  { type: 'SCENE_TYPE', name: 'Acción', active: true },
  { type: 'SCENE_TYPE', name: 'Drama', active: true },
  { type: 'SCENE_TYPE', name: 'Romántico', active: true },
  { type: 'SCENE_TYPE', name: 'Musical', active: true },
  { type: 'SCENE_TYPE', name: 'Trágico', active: true },
  { type: 'SCENE_TYPE', name: 'Cómico', active: true },
  { type: 'SCENE_TYPE', name: 'Suspenso', active: true },
  { type: 'SCENE_TYPE', name: 'Fantasía', active: true },
  { type: 'SCENE_TYPE', name: 'Terror', active: true },
  { type: 'SCENE_TYPE', name: 'Infantil', active: true },
  { type: 'SCENE_TYPE', name: 'Otro', active: true },
  // Demo categories
  { type: 'DEMO_CATEGORY', name: 'Doblaje', active: true },
  { type: 'DEMO_CATEGORY', name: 'Podcast', active: true },
  { type: 'DEMO_CATEGORY', name: 'Locución', active: true },
  { type: 'DEMO_CATEGORY', name: 'Presentación', active: true },
  { type: 'DEMO_CATEGORY', name: 'Narración', active: true },
  { type: 'DEMO_CATEGORY', name: 'Musical', active: true },
  { type: 'DEMO_CATEGORY', name: 'Otro', active: true },
  // Profile statuses
  { type: 'PROFILE_STATUS', name: 'Pendiente', active: true },
  { type: 'PROFILE_STATUS', name: 'Aprobado', active: true },
  { type: 'PROFILE_STATUS', name: 'Rechazado', active: true },
  { type: 'PROFILE_STATUS', name: 'Inactivo', active: true },
  // Course areas
  { type: 'COURSE_AREA', name: 'Doblaje', active: true },
  { type: 'COURSE_AREA', name: 'Locución', active: true },
  { type: 'COURSE_AREA', name: 'Podcast', active: true },
  { type: 'COURSE_AREA', name: 'Actuación Vocal', active: true },
  { type: 'COURSE_AREA', name: 'Canto', active: true },
  { type: 'COURSE_AREA', name: 'Producción Vocal', active: true },
  // Course levels
  { type: 'COURSE_LEVEL', name: 'Inicial', active: true },
  { type: 'COURSE_LEVEL', name: 'Intermedio', active: true },
  { type: 'COURSE_LEVEL', name: 'Avanzado', active: true },
];

export interface CursoDTO {
  id: string;
  cursoKey: string;
  descripcion?: string;
  modalidad?: string;
  titulo: string;
  profesorId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Notificacion {
  id: string;
  titulo: string;
  mensaje: string;
  tipo: 'POSTULACION' | 'CURSO' | 'AGENDA' | 'CONVOCATORIA';
  leido: boolean;
  fechaCreacion: string;
  referenciaId?: string;
  referenciaTipo?: string;
}


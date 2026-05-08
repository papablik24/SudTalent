/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = 'ADMIN' | 'USER';
export type ProfileType = 'PERSONAL' | 'PARENT';
export type ProfileCategory = 'ADULT' | 'MINOR' | 'BOTH' | 'NONE';
export type DemoCategory = 'Doblaje' | 'Locución' | 'Podcast' | 'Presentación';
export type ProfileStatus = 'PENDING' | 'APPROVED' | 'INACTIVE';

export interface UserProfile {
  uid: string;
  phone: string;
  role: UserRole;
  onboarded: boolean;
  profileType?: ProfileType;
  category?: ProfileCategory;
  name?: string;
  email?: string;
  avatar?: string;
  createdAt: any;
  status?: ProfileStatus;
  primaryCategory?: DemoCategory;
  lastDemoUpdate?: any;
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
}

export interface VoiceDemo {
  id: string;
  userId: string;
  title: string;
  category: DemoCategory;
  fileUrl: string;
  duration: string;
  createdAt: any;
}

export interface WhitelistEntry {
  phone: string;
  name?: string;
  category?: ProfileCategory;
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

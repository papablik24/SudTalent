/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = 'ADMIN' | 'USER';

export interface UserProfile {
  id: string;
  phone: string;
  name?: string;
  email?: string;
  specialty?: string[]; // Doblaje, Locución, etc.
  onboarded: boolean;
  avatar?: string;
}

export interface WhitelistEntry {
  phone: string;
  addedAt: Date;
}

export type AppView = 'AUTH' | 'ADMIN_DASHBOARD' | 'USER_ONBOARDING' | 'USER_PROFILE';

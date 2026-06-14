import { fetchAPI } from './backendService';
import { Notificacion } from '../types';

export const notificacionService = {
  async getMisNotificaciones(): Promise<Notificacion[]> {
    return fetchAPI<Notificacion[]>('/notificaciones', { method: 'GET' });
  },

  async getUnreadCount(): Promise<number> {
    const data = await fetchAPI<{ count: number }>('/notificaciones/unread-count', { method: 'GET' });
    return data?.count ?? 0;
  },

  async marcarLeida(id: string): Promise<void> {
    return fetchAPI<void>(`/notificaciones/${encodeURIComponent(id)}/leer`, { method: 'PUT' });
  },

  async marcarTodasLeidas(): Promise<void> {
    return fetchAPI<void>('/notificaciones/leer-todas', { method: 'PUT' });
  }
};

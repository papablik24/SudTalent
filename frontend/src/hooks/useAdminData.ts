import { useState, useEffect, useCallback } from 'react';
import { UserProfile, TalentProfile, VoiceDemo, WhitelistEntry, ProfileStatus, ProfileCategory } from '../types';
import { backendService } from '../services/backendService';

export function useAdminData(role: string | null, currentUser: UserProfile | null) {
  const [whitelist, setWhitelist] = useState<WhitelistEntry[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [talentProfiles, setTalentProfiles] = useState<Record<string, TalentProfile>>({});
  const [allDemos, setAllDemos] = useState<Record<string, VoiceDemo[]>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cargar datos del backend
  const loadData = useCallback(async () => {
    if (role !== 'ADMIN' || !currentUser?.uid) {
      setError('You must be logged in as an admin to access this data.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // Cargar whitelist desde el backend
      const whitelistData = await backendService.getWhitelist();
      const mapped: WhitelistEntry[] = whitelistData.map((w: any) => ({
        phone: w.phone,
        name: w.name,
        category: w.category || 'NONE',
        addedAt: w.createdAt,
        addedBy: 'admin',
        status: w.status,
      }));
      setWhitelist(mapped);

      // Cargar usuarios desde el backend
      const usuarios = await backendService.getAllUsers();
      const mappedUsers: UserProfile[] = usuarios.map((u: any) => ({
        uid: String(u.id),
        phone: u.phone || '',
        role: u.role === 'ADMIN' ? 'ADMIN' : 'USER',
        onboarded: u.onboarded,
        name: u.name || '',
        email: u.email || '',
        status: u.status || 'PENDING',
        profileType: u.profileType || undefined,
        createdAt: u.createdAt,
      }));
      setAllUsers(mappedUsers);
    } catch (err: any) {
      console.error('Error cargando datos del backend:', err);
      const errorMsg = err.message || 'Error al cargar datos. Verifica que el backend esté corriendo.';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  }, [role, currentUser?.uid]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Agregar a whitelist
  const addToWhitelist = async (phone: string, name: string, category: ProfileCategory = 'NONE') => {
    try {
      setError(null);
      await backendService.addToWhitelist({ phone });
      
      const newEntry: WhitelistEntry = {
        phone,
        name,
        category,
        addedAt: new Date().toISOString(),
        addedBy: currentUser?.uid
      };
      setWhitelist(prev => [newEntry, ...prev]);
    } catch (err: any) {
      setError(err.message || 'Error al agregar a whitelist');
      throw err;
    }
  };

  // Remover de whitelist
  const removeFromWhitelist = async (phone: string) => {
    try {
      setError(null);
      await backendService.removeFromWhitelist(phone);
      setWhitelist(prev => prev.filter(e => e.phone !== phone));
    } catch (err: any) {
      setError(err.message || 'Error al eliminar de whitelist');
      throw err;
    }
  };

  // Actualizar estudiante
  const updateStudent = async (phone: string, updates: any) => {
    try {
      setError(null);
      await backendService.updateStudent(phone, updates);
      
      setWhitelist(prev => prev.map(e => e.phone === phone ? { ...e, ...updates } : e));
      setAllUsers(prev => prev.map(u => u.phone === phone ? { ...u, ...updates } : u));
    } catch (err: any) {
      setError(err.message || 'Error al actualizar estudiante');
      throw err;
    }
  };

  const updateUserStatus = async (userId: string, status: ProfileStatus) => {
    try {
      setError(null);
      await backendService.updateUserStatus(userId, status);
      setAllUsers(prev => prev.map(u => u.uid === userId ? { ...u, status } : u));
    } catch (err: any) {
      setError(err.message || 'Error al actualizar estado');
      throw err;
    }
  };

  return {
    whitelist,
    allUsers,
    talentProfiles,
    allDemos,
    addToWhitelist,
    removeFromWhitelist,
    updateStudent,
    updateUserStatus,
    loading,
    error,
    refreshData: loadData
  };
}

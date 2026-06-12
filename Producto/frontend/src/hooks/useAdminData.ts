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
      // Cargar whitelist y usuarios en paralelo
      const [whitelistData, usuariosData] = await Promise.all([
        backendService.getWhitelist(),
        backendService.getAllUsers(),
      ]);

      // Mapear usuarios primero
      const mappedUsers: UserProfile[] = usuariosData.map((u: any) => {
        // Buscar categoría en whitelist por email o teléfono
        const wMatch = whitelistData.find((w: any) => {
          const wEmail = (w.email || '').toLowerCase();
          const uEmail = (u.email || '').toLowerCase();
          const wPhone = (w.phone || '').replace(/\D/g, '');
          const uPhone = (u.phone || '').replace(/\D/g, '');
          return (uEmail && wEmail && uEmail === wEmail) ||
                 (uPhone.length >= 8 && wPhone.length >= 8 && uPhone.slice(-8) === wPhone.slice(-8));
        });
        return {
          uid: String(u.id),
          phone: u.phone || '',
          role: u.role === 'ADMIN' ? 'ADMIN' : 'USER',
          onboarded: u.onboarded,
          name: u.name || '',
          email: u.email || '',
          status: u.status || 'PENDING',
          profileType: u.profileType || undefined,
          avatar: u.profileImageUrl || undefined,
          age: u.age,
          bio: u.bio || '',
          createdAt: u.createdAt,
          profileAudioUrl: u.profileAudioUrl || undefined,
          profileImageUrl: u.profileImageUrl || undefined,
          category: wMatch?.category || 'NONE',
          primaryCategory: u.specialties || undefined,
        } as any;
      });
      setAllUsers(mappedUsers);

      // Mapear whitelist — ahora el backend incluye userId y userStatus directamente
      const mapped: WhitelistEntry[] = whitelistData.map((w: any) => {
        // Preferir userId del backend; si no viene, intentar match por email como fallback
        const matchedByEmail = !w.userId
          ? mappedUsers.find(u => {
              const uEmail = (u.email || '').toLowerCase().trim();
              const wEmail = (w.email || '').toLowerCase().trim();
              return uEmail && wEmail && uEmail === wEmail;
            })
          : null;

        const uid = w.userId ? String(w.userId) : matchedByEmail?.uid;
        const userStatus = w.userStatus || matchedByEmail?.status;

        return {
          phone: w.phone,
          name: w.name || '',
          email: w.email || '',
          category: w.category || 'NONE',
          addedAt: w.createdAt,
          addedBy: 'admin',
          status: userStatus || w.status,
          uid,
          userStatus,
        } as any;
      });
      setWhitelist(mapped);

    } catch (err: any) {
      console.error('Error cargando datos del backend:', err);
      setError(err.message || 'Error al cargar datos. Verifica que el backend esté corriendo.');
    } finally {
      setLoading(false);
    }
  }, [role, currentUser?.uid]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Agregar a whitelist
  const addToWhitelist = async (phone: string, name: string, category: ProfileCategory = 'NONE', email: string = '', role: string = 'ALUMNO') => {
    try {
      setError(null);
      
      // ✅ Normalizar teléfono: remover + y caracteres no numéricos
      const normalizedPhone = phone.replace(/\D/g, '');
      
      if (normalizedPhone.length < 8 || normalizedPhone.length > 15) {
        setError('El teléfono debe tener entre 8 y 15 dígitos');
        return;
      }
      
      // ✅ Enviar phone, name, email, category, role al backend
      const response = await backendService.addToWhitelist({ 
        phone: normalizedPhone,
        name,
        email,
        category,
        role
      });
      
      const newEntry: WhitelistEntry = {
        phone: normalizedPhone,
        name,
        email,
        category,
        addedAt: new Date().toISOString(),
        addedBy: currentUser?.uid,
        status: response?.status || 'PENDIENTE'
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
      // Actualizar allUsers
      setAllUsers(prev => prev.map(u => u.uid === userId ? { ...u, status } : u));
      // Actualizar también whitelist (que tiene uid del usuario enriquecido)
      setWhitelist(prev => prev.map((w: any) => w.uid === userId ? { ...w, status, userStatus: status } : w));
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

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
      // Cargar whitelist, usuarios y demos en paralelo
      const [whitelistData, usuariosData, demosData] = await Promise.all([
        backendService.getWhitelist(),
        backendService.getAllUsers(),
        backendService.getAllDemos().catch((err) => {
          console.warn('⚠️ No se pudieron cargar las demos de casting:', err);
          return [] as any[];
        }),
      ]);

      // Mapear usuarios primero
      const mappedUsers: UserProfile[] = usuariosData.map((u: any) => {
        // Extraer primera especialidad para asignarla como primaryCategory
        let primCat: any = undefined;
        if (u.specialties && typeof u.specialties === 'string') {
          const splitList = u.specialties.split(',');
          if (splitList.length > 0) {
            const firstSp = splitList[0].trim();
            // Validar que coincida con DemoCategory
            if (['Doblaje', 'Locución', 'Podcast', 'Presentación'].includes(firstSp)) {
              primCat = firstSp;
            }
          }
        }

        return {
          uid: String(u.id),
          phone: u.phone || '',
          role: u.role === 'ADMIN' ? 'ADMIN' : (u.role === 'PROFESOR' ? 'PROFESOR' : 'USER'),
          onboarded: u.onboarded,
          name: u.name || '',
          email: u.email || '',
          status: u.status || 'PENDING',
          profileType: u.profileType || undefined,
          avatar: u.profileImageUrl || undefined,
          age: u.age,
          bio: u.bio || '',
          createdAt: u.createdAt,
          primaryCategory: primCat,
        };
      });
      setAllUsers(mappedUsers);

      // Mapear perfiles de talentos desde los datos de usuarios
      const profilesMap: Record<string, TalentProfile> = {};
      usuariosData.forEach((u: any) => {
        profilesMap[String(u.id)] = {
          userId: String(u.id),
          type: u.profileType === 'PARENT' ? 'PARENT' : 'PERSONAL',
          childName: u.childName || '',
          childAge: u.childAge || undefined,
          age: u.age || undefined,
          specialties: u.specialties ? u.specialties.split(',').map((s: string) => s.trim()) : [],
          bio: u.bio || '',
          location: 'Santiago, CL' // Ubicación default
        };
      });
      setTalentProfiles(profilesMap);

      // Mapear demos agrupadas por userId
      const demosMap: Record<string, VoiceDemo[]> = {};
      demosData.forEach((d: any) => {
        const uId = String(d.userId);
        if (!demosMap[uId]) {
          demosMap[uId] = [];
        }

        // Formatear duración de segundos a mm:ss
        const formatDuration = (seconds?: number) => {
          if (!seconds) return '0:00';
          const mins = Math.floor(seconds / 60);
          const secs = seconds % 60;
          return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
        };

        const mediaType = (d.mediaType || '').toLowerCase().includes('video') ? 'VIDEO' : 'AUDIO';

        demosMap[uId].push({
          id: String(d.id),
          userId: uId,
          title: d.title || 'Demo sin título',
          category: (d.category === 'demo' ? 'Doblaje' : d.category) || 'Doblaje',
          fileUrl: d.fileUrl || '',
          duration: formatDuration(d.durationSeconds),
          createdAt: d.createdAt,
          mediaType,
          fileFormat: d.fileFormat || 'MP3',
          visualGenre: d.visualGenre || undefined,
          description: d.description || ''
        });
      });
      setAllDemos(demosMap);

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
        const matchedRole = matchedByEmail?.role || (uid ? mappedUsers.find(u => u.uid === uid)?.role : null);

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
          role: matchedRole || w.role || 'ALUMNO',
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

  const updateDemoVisualGenre = async (demoId: string, userId: string, genre: string) => {
    try {
      setError(null);
      // Si el género es "Sin género", lo guardamos como cadena vacía o nula para el backend
      const apiGenre = genre === 'Sin género' ? '' : genre;
      await backendService.updateDemoVisualGenre(demoId, apiGenre);
      
      // Actualizar el estado local de allDemos de manera reactiva e inmediata
      setAllDemos(prev => {
        const userDemos = prev[userId] || [];
        const updatedDemos = userDemos.map(d => 
          d.id === demoId 
            ? { ...d, visualGenre: genre === 'Sin género' ? undefined : (genre as any) } 
            : d
        );
        return { ...prev, [userId]: updatedDemos };
      });
    } catch (err: any) {
      setError(err.message || 'Error al actualizar género visual');
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
    updateDemoVisualGenre,
    loading,
    error,
    refreshData: loadData
  };
}

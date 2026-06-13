import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  Filter, 
  User, 
  Play, 
  Pause, 
  ChevronRight, 
  X, 
  Clock, 
  Shield, 
  CheckCircle, 
  AlertCircle,
  FileAudio,
  Film,
  AudioLines,
  SlidersHorizontal,
  ArrowUpDown,
  ExternalLink,
  Mic2,
  Calendar,
  Phone,
  Mail,
  MapPin
} from 'lucide-react';
import { UserProfile, TalentProfile, VoiceDemo, DemoCategory, ProfileStatus, ProfileType, VisualGenre, MediaType, VISUAL_GENRES } from '../../types';
import { fetchAPI } from '../../services/backendService';
import { AudioPlayer } from '../../components/ui/AudioPlayer';

const AVAILABLE_SPECIALTIES = [
  'Doblaje',
  'Locución',
  'Podcast',
  'Presentación',
  'Narración',
  'Actuación Vocal',
  'Producción Vocal',
  'Canto'
];

interface AdminTalentReviewProps {
  users: UserProfile[];
  talentProfiles: Record<string, TalentProfile>;
  allDemos: Record<string, VoiceDemo[]>;
  onClose?: () => void;
  onUpdateStatus?: (userId: string, status: ProfileStatus) => void;
  onUpdateDemoGenre?: (demoId: string, userId: string, genre: string) => Promise<void>;
}

export function AdminTalentReview({ users, talentProfiles, allDemos, onClose, onUpdateStatus, onUpdateDemoGenre }: AdminTalentReviewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<DemoCategory | 'TODOS'>('TODOS');
  const [selectedStatus, setSelectedStatus] = useState<ProfileStatus | 'TODOS'>('TODOS');
  const [selectedProfileType, setSelectedProfileType] = useState<ProfileType | 'TODOS'>('TODOS');
  const [selectedVisualGenre, setSelectedVisualGenre] = useState<VisualGenre | 'TODOS'>('TODOS');
  const [selectedMediaType, setSelectedMediaType] = useState<MediaType | 'TODOS'>('TODOS');
  const [hasDemosOnly, setHasDemosOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'name' | 'recent'>('name');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [playingDemoId, setPlayingDemoId] = useState<string | null>(null);

  // Demos cargados dinámicamente al seleccionar un usuario
  const [loadedDemos, setLoadedDemos] = useState<VoiceDemo[]>([]);
  const [loadingDemos, setLoadingDemos] = useState(false);
  const [externalLink, setExternalLink] = useState('');

  // Conteo de demos por usuario (para la tabla)
  const [demoCounts, setDemoCounts] = useState<Record<string, number>>({});

  // Cargar conteos de demos para todos los usuarios visibles
  useEffect(() => {
    const nonAdmins = users.filter(u => u.role !== 'ADMIN' && u.role !== 'PROFESOR' && u.uid);
    if (nonAdmins.length === 0) return;
    const missing = nonAdmins.filter(u => demoCounts[u.uid] === undefined);
    if (missing.length === 0) return;

    Promise.allSettled(
      missing.map(u =>
        fetchAPI<any[]>(`/voice-audios/user/${u.uid}`)
          .then(data => ({ uid: u.uid, count: (data || []).filter((d: any) => d.category === 'demo').length }))
          .catch(() => ({ uid: u.uid, count: 0 }))
      )
    ).then(results => {
      const counts: Record<string, number> = {};
      results.forEach(r => {
        if (r.status === 'fulfilled') counts[r.value.uid] = r.value.count;
      });
      setDemoCounts(prev => ({ ...prev, ...counts }));
    });
  }, [users]);

  // Cargar demos y link externo cuando se selecciona un usuario
  useEffect(() => {
    if (!selectedUserId) { setLoadedDemos([]); setExternalLink(''); return; }
    setLoadingDemos(true);
    Promise.all([
      fetchAPI<any[]>(`/voice-audios/user/${selectedUserId}`),
      fetchAPI<any>(`/users/${selectedUserId}`),
    ])
      .then(([demosData, userData]) => {
        const mapped: VoiceDemo[] = (demosData || [])
          .filter((d: any) => d.category === 'demo') // solo demos, no perfil de audio
          .map((d: any) => ({
          id: d.id,
          userId: selectedUserId,
          title: d.title,
          category: d.category || 'Doblaje',
          fileUrl: d.fileUrl,
          duration: d.durationSeconds
            ? `${Math.floor(d.durationSeconds / 60)}:${String(d.durationSeconds % 60).padStart(2, '0')}`
            : '—',
          createdAt: d.createdAt,
          mediaType: (d.mediaType || '').toLowerCase().includes('video') ? 'VIDEO' : 'AUDIO',
          fileFormat: d.fileFormat,
          visualGenre: d.visualGenre || undefined,
        }));
        setLoadedDemos(mapped);
        setExternalLink(userData?.profileAudioUrl || '');
      })
      .catch(() => { setLoadedDemos([]); setExternalLink(''); })
      .finally(() => setLoadingDemos(false));
  }, [selectedUserId]);

  // Edición inline de especialidad
  const [editingSpecialtyId, setEditingSpecialtyId] = useState<string | null>(null);
  // Overrides locales de especialidad (para reflejar cambios sin recargar)
  const [specialtyOverrides, setSpecialtyOverrides] = useState<Record<string, string>>({});

  const getCleanSpecialties = (u: UserProfile): string[] => {
    const raw = specialtyOverrides[u.uid] !== undefined
      ? specialtyOverrides[u.uid]
      : u.primaryCategory || '';
    if (!raw) return [];
    const split = raw.split(',').map(s => s.trim()).filter(Boolean);
    return Array.from(new Set(split));
  };

  const handleSpecialtyChange = async (userId: string, specialty: string) => {
    setEditingSpecialtyId(null);
    const cleanSpec = specialty ? specialty.trim() : '';
    setSpecialtyOverrides(prev => ({ ...prev, [userId]: cleanSpec }));
    try {
      await fetchAPI(`/users/${userId}`, {
        method: 'PUT',
        body: JSON.stringify({ specialties: cleanSpec }),
      });
    } catch (err) {
      // Revertir si falla
      setSpecialtyOverrides(prev => {
        const next = { ...prev };
        delete next[userId];
        return next;
      });
      console.error('Error actualizando especialidad:', err);
    }
  };

  // State y handlers para modificar especialidades desde el panel de detalle
  const [isEditingPanelSpecialties, setIsEditingPanelSpecialties] = useState(false);
  const [panelSpecialties, setPanelSpecialties] = useState<string[]>([]);

  const handleTogglePanelSpecialty = (spec: string) => {
    setPanelSpecialties(prev =>
      prev.includes(spec) ? prev.filter(s => s !== spec) : [...prev, spec]
    );
  };

  const handleSavePanelSpecialties = async () => {
    if (!selectedUserId) return;
    const specialtiesString = panelSpecialties.join(', ');
    setSpecialtyOverrides(prev => ({ ...prev, [selectedUserId]: specialtiesString }));
    setIsEditingPanelSpecialties(false);
    try {
      await fetchAPI(`/users/${selectedUserId}`, {
        method: 'PUT',
        body: JSON.stringify({ specialties: specialtiesString }),
      });
    } catch (err) {
      setSpecialtyOverrides(prev => {
        const next = { ...prev };
        delete next[selectedUserId];
        return next;
      });
      console.error('Error actualizando especialidades en panel:', err);
      alert('Error al actualizar especialidades');
    }
  };

  const filteredUsers = useMemo(() => {
    let result = users.filter(u => u.role !== 'ADMIN' && u.role !== 'PROFESOR');

    if (searchTerm) {
      const lowSearch = searchTerm.toLowerCase();
      result = result.filter(u => 
        u.name?.toLowerCase().includes(lowSearch) || 
        u.phone.includes(lowSearch) ||
        u.email?.toLowerCase().includes(lowSearch)
      );
    }

    if (selectedCategory !== 'TODOS') {
      result = result.filter(u => {
        const specs = getCleanSpecialties(u);
        return specs.some(s => s.toLowerCase() === selectedCategory.toLowerCase());
      });
    }

    if (selectedStatus !== 'TODOS') {
      result = result.filter(u => (u.status || 'PENDING') === selectedStatus);
    }

    if (selectedProfileType !== 'TODOS') {
      result = result.filter(u => u.profileType === selectedProfileType);
    }

    // 1. Filtrar por "Con demos subidas" (hasDemosOnly)
    if (hasDemosOnly) {
      result = result.filter(u => {
        const uDemos = allDemos[u.uid] || [];
        return uDemos.length > 0;
      });
    }

    // 2. Filtrar por "Tipo de medio" (selectedMediaType)
    if (selectedMediaType !== 'TODOS') {
      result = result.filter(u => {
        const uDemos = allDemos[u.uid] || [];
        return uDemos.some(d => {
          const mType = (d.mediaType || '').toUpperCase();
          if (selectedMediaType === 'AUDIO') {
            return mType === 'AUDIO' || mType.includes('AUDIO') || mType.includes('MPEG') || mType.includes('WAV');
          } else if (selectedMediaType === 'VIDEO') {
            return mType === 'VIDEO' || mType.includes('VIDEO') || mType.includes('MP4') || mType.includes('QUICKTIME') || mType.includes('MOV');
          }
          return false;
        });
      });
    }

    // 3. Filtrar por "Género Visual / Escena" (selectedVisualGenre)
    if (selectedVisualGenre !== 'TODOS') {
      result = result.filter(u => {
        const uDemos = allDemos[u.uid] || [];
        return uDemos.some(d => d.visualGenre === selectedVisualGenre);
      });
    }

    if (sortBy === 'name') {
      result.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    } else {
      result.sort((a, b) => {
        const dateA = a.lastDemoUpdate || a.createdAt;
        const dateB = b.lastDemoUpdate || b.createdAt;
        return new Date(dateB).getTime() - new Date(dateA).getTime();
      });
    }

    return result;
  }, [users, allDemos, searchTerm, selectedCategory, selectedStatus, selectedProfileType, selectedVisualGenre, selectedMediaType, hasDemosOnly, sortBy, specialtyOverrides]);

  const selectedUser = users.find(u => u.uid === selectedUserId);

  useEffect(() => {
    if (selectedUser) {
      const currentSpecs = getCleanSpecialties(selectedUser);
      setPanelSpecialties(currentSpecs);
      setIsEditingPanelSpecialties(false);
    }
  }, [selectedUserId, selectedUser]);

  const selectedTalentProfile = selectedUserId ? talentProfiles[selectedUserId] : null;
  const userDemos = loadedDemos;

  const handleToggleDemo = (demoId: string) => {
    if (playingDemoId === demoId) {
      setPlayingDemoId(null);
    } else {
      setPlayingDemoId(demoId);
    }
  };

  return (
    <div className="flex flex-col h-full space-y-8">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black tracking-tighter text-white">
            Motor de <span className="sud-vibrant-text-gradient uppercase tracking-widest">Smart Casting</span>
          </h2>
          <p className="text-slate-400 mt-1 font-medium text-[10px] tracking-widest uppercase">
            Revisión técnica y selección de talentos vocales
          </p>
        </div>
      </header>

      <div className="flex flex-col lg:flex-row gap-8 flex-1 overflow-hidden">
        {/* Filters Sidebar */}
        <aside className="w-full lg:w-72 flex flex-col gap-8 shrink-0">
          <div className="sud-glass-panel p-6 space-y-6">
            <div className="flex items-center gap-2 text-white font-black uppercase text-xs tracking-widest">
              <Filter size={14} className="text-sud-turquoise" />
              Filtros Avanzados
            </div>

            {/* Search */}
            <div className="space-y-2">
              <label className="text-[9px] uppercase font-black text-slate-500 tracking-[0.2em] ml-1">Búsqueda Directa</label>
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-sud-turquoise transition-colors" size={16} />
                <input 
                  type="text"
                  placeholder="Nombre, Teléfono..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="sud-input w-full pl-12 py-3 text-xs"
                />
              </div>
            </div>

            {/* Category */}
            <div className="space-y-2">
              <label className="text-[9px] uppercase font-black text-slate-500 tracking-[0.2em] ml-1">Especialidad</label>
              <div className="grid grid-cols-1 gap-2">
                {['TODOS', 'Doblaje', 'Locución', 'Podcast', 'Presentación'].map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat as any)}
                    className={`text-left px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                      selectedCategory === cat 
                        ? 'bg-sud-turquoise text-black' 
                        : 'bg-white/[0.03] text-slate-400 hover:bg-white/[0.05]'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Status */}
            <div className="space-y-2">
              <label className="text-[9px] uppercase font-black text-slate-500 tracking-[0.2em] ml-1">Estado del Perfil</label>
              <select 
                value={selectedStatus}
                onChange={e => setSelectedStatus(e.target.value as any)}
                className="sud-input w-full text-[10px] font-black uppercase tracking-widest"
              >
                <option value="TODOS">Todos los Estados</option>
                <option value="PENDING">Pendientes</option>
                <option value="APPROVED">Aprobados</option>
                <option value="INACTIVE">Inactivos</option>
              </select>
            </div>

            {/* Profile Type */}
            <div className="space-y-2">
              <label className="text-[9px] uppercase font-black text-slate-500 tracking-[0.2em] ml-1">Tipo de Perfil</label>
              <div className="flex gap-2">
                {['TODOS', 'PERSONAL', 'PARENT'].map(type => (
                  <button
                    key={type}
                    onClick={() => setSelectedProfileType(type as any)}
                    className={`flex-1 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all ${
                      selectedProfileType === type 
                        ? 'bg-white/10 text-white' 
                        : 'bg-white/[0.02] text-slate-500'
                    }`}
                  >
                    {type === 'TODOS' ? 'Ambos' : type === 'PERSONAL' ? 'Adulto' : 'Menor'}
                  </button>
                ))}
              </div>
            </div>

            {/* Media Type Filter */}
            <div className="space-y-2">
              <label className="text-[9px] uppercase font-black text-slate-500 tracking-[0.2em] ml-1">Tipo de Medio</label>
              <div className="flex gap-2">
                {(['TODOS', 'AUDIO', 'VIDEO'] as const).map(type => (
                  <button
                    key={type}
                    onClick={() => setSelectedMediaType(type as any)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                      selectedMediaType === type
                        ? type === 'VIDEO'
                          ? 'bg-sud-turquoise text-black'
                          : type === 'AUDIO'
                          ? 'bg-sud-orange text-black'
                          : 'bg-white/10 text-white'
                        : 'bg-white/[0.02] text-slate-500 hover:bg-white/[0.04]'
                    }`}
                  >
                    {type === 'VIDEO' && <Film size={10} />}
                    {type === 'AUDIO' && <AudioLines size={10} />}
                    {type === 'TODOS' ? 'Ambos' : type}
                  </button>
                ))}
              </div>
            </div>

            {/* Visual Genre Filter */}
            <div className="space-y-2">
              <label className="text-[9px] uppercase font-black text-slate-500 tracking-[0.2em] ml-1">Género Visual / Escena</label>
              <div className="relative">
                <select
                  value={selectedVisualGenre}
                  onChange={e => setSelectedVisualGenre(e.target.value as any)}
                  className="sud-input w-full text-[10px] font-black uppercase tracking-widest appearance-none"
                >
                  <option value="TODOS">Todos los géneros</option>
                  {VISUAL_GENRES.map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Toggle Demos */}
            <label className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/5 cursor-pointer group hover:bg-white/[0.04] transition-all">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-white transition-colors">Con Demos Subidas</span>
              <input 
                type="checkbox" 
                checked={hasDemosOnly}
                onChange={e => setHasDemosOnly(e.target.checked)}
                className="w-4 h-4 rounded bg-black border-white/10 text-sud-turquoise focus:ring-0"
              />
            </label>
          </div>
        </aside>

        {/* Results List */}
        <div className="flex-1 overflow-hidden flex flex-col gap-6">
          <div className="sud-glass-panel flex-1 flex flex-col p-0 overflow-hidden relative">
            {/* Table Header */}
            <div className="grid grid-cols-12 gap-4 px-8 py-5 bg-white/[0.02] border-b border-white/5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
              <div className="col-span-3">Nombre / Talento</div>
              <div className="col-span-2">Especialidad</div>
              <div className="col-span-2">Género / Escena</div>
              <div className="col-span-1">Tipo</div>
              <div className="col-span-2">Estado</div>
              <div className="col-span-2 text-right">Demos</div>
            </div>

            {/* Table Body */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {filteredUsers.length > 0 ? (
                filteredUsers.map((user) => {
                  const selectedUserDemoCount = selectedUserId === user.uid ? loadedDemos.length : (demoCounts[user.uid] ?? null);
                  const isSelected = selectedUserId === user.uid;
                  
                  const uDemos = allDemos[user.uid] || [];
                  const genres = Array.from(new Set(uDemos.map(d => d.visualGenre).filter((g): g is VisualGenre => !!g)));

                  return (
                    <button
                      key={user.uid}
                      onClick={() => setSelectedUserId(user.uid)}
                      className={`w-full grid grid-cols-12 gap-4 px-8 py-5 border-b border-white/[0.02] items-center transition-all hover:bg-white/[0.03] text-left group ${
                        isSelected ? 'bg-white/5 border-l-4 border-l-sud-turquoise' : ''
                      }`}
                    >
                      <div className="col-span-3 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-sud-gradient p-[1px] shrink-0">
                          <div className="w-full h-full rounded-[0.9rem] bg-black flex items-center justify-center overflow-hidden">
                            {user.avatar ? (
                              <img src={user.avatar} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <User size={20} className="text-slate-600" />
                            )}
                          </div>
                        </div>
                        <div className="truncate">
                          <p className="text-sm font-black text-white uppercase tracking-tight group-hover:text-sud-turquoise transition-colors truncate">
                            {user.name || 'Sin Nombre'}
                          </p>
                          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest truncate">
                            {user.phone}
                          </p>
                        </div>
                      </div>
                      
                      <div className="col-span-2" onClick={e => e.stopPropagation()}>
                        {editingSpecialtyId === user.uid ? (
                          <select
                            autoFocus
                            defaultValue={getCleanSpecialties(user)[0] || ''}
                            onBlur={e => handleSpecialtyChange(user.uid, e.target.value)}
                            onChange={e => handleSpecialtyChange(user.uid, e.target.value)}
                            className="bg-black border border-sud-turquoise/40 rounded-lg px-2 py-1 text-[9px] font-black uppercase tracking-widest text-white outline-none w-full"
                          >
                            <option value="">Sin especialidad definida</option>
                            <option value="Doblaje">Doblaje</option>
                            <option value="Locución">Locución</option>
                            <option value="Podcast">Podcast</option>
                            <option value="Presentación">Presentación</option>
                            <option value="Narración">Narración</option>
                            <option value="Actuación Vocal">Actuación Vocal</option>
                            <option value="Producción Vocal">Producción Vocal</option>
                            <option value="Canto">Canto</option>
                          </select>
                        ) : (
                          <button
                            onClick={() => setEditingSpecialtyId(user.uid)}
                            title="Clic para editar especialidad principal"
                            className="flex flex-wrap gap-1"
                          >
                            {getCleanSpecialties(user).length > 0
                              ? getCleanSpecialties(user).map((s, i) => (
                                  <span
                                    key={i}
                                    className="px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest bg-sud-orange/10 text-sud-orange hover:bg-sud-orange/20 transition-all"
                                  >
                                    {s}
                                  </span>
                                ))
                              : <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-slate-500/10 text-slate-500">Sin especialidad definida</span>
                            }
                          </button>
                        )}
                      </div>

                      {/* Género / Escena */}
                      <div className="col-span-2 flex flex-wrap gap-1">
                        {genres.length > 0 ? (
                          genres.map((g, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest bg-sud-turquoise/10 text-sud-turquoise border border-sud-turquoise/20"
                            >
                              {g.toUpperCase()}
                            </span>
                          ))
                        ) : (
                          <span className="text-[10px] font-black uppercase text-slate-600 tracking-widest">
                            Sin género
                          </span>
                        )}
                      </div>

                      <div className="col-span-1">
                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                          {user.profileType === 'PARENT' ? '👶 Menor' : '👤 Adulto'}
                        </span>
                      </div>

                      <div className="col-span-2">
                        <div className="flex items-center gap-2">
                          <div className={`w-1.5 h-1.5 rounded-full ${
                            user.status === 'APPROVED' ? 'bg-sud-turquoise' : 
                            user.status === 'INACTIVE' ? 'bg-red-500' : 'bg-sud-yellow'
                          }`} />
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">
                            {user.status === 'APPROVED' ? 'Aprobado' : 
                             user.status === 'INACTIVE' ? 'Inactivo' : 'Pendiente'}
                          </span>
                        </div>
                      </div>

                      <div className="col-span-2 text-right">
                        <div className="flex items-center justify-end">
                          <span className={`text-[10px] font-black font-mono ${
                            (selectedUserDemoCount ?? 0) > 0 ? 'text-sud-turquoise' : 'text-slate-600'
                          }`}>
                            {selectedUserDemoCount === null ? '…' : selectedUserDemoCount}
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="flex flex-col items-center justify-center py-24 text-slate-500 space-y-4">
                  <div className="w-20 h-20 rounded-full bg-white/[0.02] flex items-center justify-center animate-pulse">
                    <Search size={32} className="opacity-20" />
                  </div>
                  <p className="font-black uppercase tracking-[0.2em] text-[11px]">No se encontraron talentos con estos criterios</p>
                </div>
              )}
            </div>

            {/* Quick Actions Footer */}
            <div className="px-8 py-4 bg-white/[0.01] border-t border-white/5 flex items-center justify-between">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">
                Total Alumnos Filtrados: <span className="text-sud-turquoise ml-2">{filteredUsers.length}</span>
              </p>
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setSortBy(sortBy === 'name' ? 'recent' : 'name')}
                  className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white"
                >
                  <ArrowUpDown size={14} />
                  Ordenar por: {sortBy === 'name' ? 'Nombre' : 'Recientes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Side Panel / Modal */}
      <AnimatePresence>
        {selectedUserId && selectedUser && (
          <>
            <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               onClick={() => setSelectedUserId(null)}
               className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[90]"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 right-0 w-full md:w-[600px] bg-sud-black border-l border-white/10 z-[100] shadow-[-20px_0_40px_rgba(0,0,0,0.5)] flex flex-col h-screen max-h-screen overflow-hidden"
            >
              <div className="flex items-center justify-between p-10 pb-6 shrink-0">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full bg-white/5 text-slate-400">
                    <Shield size={20} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black uppercase tracking-tighter text-white">Perfil de Talento</h3>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">ID: {selectedUser.uid.slice(0, 8)}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedUserId(null)}
                  className="p-4 rounded-2xl bg-white/5 hover:bg-white/10 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar px-10 pb-10 space-y-12">
                {/* Profile Main Info */}
                <section className="flex flex-col md:flex-row gap-10 items-start">
                  <div className="w-32 h-32 rounded-[2.5rem] bg-sud-gradient p-[1px] shrink-0">
                    <div className="w-full h-full rounded-[2.4rem] bg-black flex items-center justify-center overflow-hidden">
                      {selectedUser.avatar ? (
                        <img src={selectedUser.avatar} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <User size={48} className="text-slate-800" />
                      )}
                    </div>
                  </div>
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-4xl font-black text-white uppercase tracking-tighter">
                        {selectedUser.name || 'Sin Nombre'}
                      </h2>
                      <div className="flex flex-wrap gap-3 mt-4">
                        {selectedUser.profileType === 'PARENT' ? (
                          <>
                            <span className="px-4 py-1.5 rounded-full bg-sud-turquoise/10 text-sud-turquoise text-[10px] font-black uppercase tracking-widest border border-sud-turquoise/20">
                              Apoderado
                            </span>
                            <span className="px-4 py-1.5 rounded-full bg-pink-500/10 text-pink-400 text-[10px] font-black uppercase tracking-widest border border-pink-500/20">
                              Alumno Menor
                            </span>
                          </>
                        ) : (
                          <span className="px-4 py-1.5 rounded-full bg-sud-turquoise/10 text-sud-turquoise text-[10px] font-black uppercase tracking-widest border border-sud-turquoise/20">
                            Perfil Personal
                          </span>
                        )}
                        {getCleanSpecialties(selectedUser).length > 0 ? (
                          getCleanSpecialties(selectedUser).map((s, idx) => (
                            <span 
                              key={idx}
                              className="px-4 py-1.5 rounded-full bg-sud-orange/10 text-sud-orange text-[10px] font-black uppercase tracking-widest border border-sud-orange/20"
                            >
                              {s}
                            </span>
                          ))
                        ) : (
                          <span className="px-4 py-1.5 rounded-full bg-slate-500/10 text-slate-500 text-[10px] font-black uppercase tracking-widest border border-slate-500/20">
                            Sin especialidad definida
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                       <div className="flex items-center gap-3 text-slate-400">
                          <Phone size={14} className="text-sud-turquoise" />
                          <span className="text-xs font-bold">{selectedUser.phone}</span>
                       </div>
                       <div className="flex items-center gap-3 text-slate-400">
                          <Mail size={14} className="text-sud-turquoise" />
                          <span className="text-xs font-bold truncate">{selectedUser.email || 'N/A'}</span>
                       </div>
                    </div>
                  </div>
                </section>

                {/* Status Management */}
                <section className="p-8 rounded-[2rem] bg-white/[0.02] border border-white/5 space-y-6">
                   <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Gestión de Acceso y Estado</h4>
                   <div className="flex flex-wrap gap-4">
                      {[
                        { val: 'PENDING', label: 'Pendiente', color: 'sud-yellow', icon: Clock },
                        { val: 'APPROVED', label: 'Aprobar Talento', color: 'sud-turquoise', icon: CheckCircle },
                        { val: 'INACTIVE', label: 'Inactivar', color: 'red-500', icon: AlertCircle }
                      ].map(st => (
                        <button
                          key={st.val}
                          onClick={() => onUpdateStatus?.(selectedUser.uid, st.val as ProfileStatus)}
                          className={`flex items-center gap-3 px-6 py-3 rounded-2xl transition-all font-black uppercase text-[10px] tracking-widest border ${
                            selectedUser.status === st.val 
                              ? `bg-${st.color} text-black border-${st.color}`
                              : `bg-white/[0.03] text-${st.color} border-white/5 hover:bg-white/5`
                          }`}
                        >
                          <st.icon size={16} />
                          {st.label}
                        </button>
                      ))}
                   </div>
                </section>



                 {/* Especialidades de Casting */}
                 <section className="space-y-6">
                    <div className="flex items-center justify-between">
                       <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Especialidades de Casting</h4>
                       <div className="h-[1px] flex-1 bg-white/5 ml-6" />
                    </div>
                    <div className="p-8 rounded-[2rem] bg-white/[0.01] border border-white/5 space-y-6">
                       {!isEditingPanelSpecialties ? (
                         <div className="space-y-4">
                           <div className="flex flex-wrap gap-2">
                             {getCleanSpecialties(selectedUser).length > 0 ? (
                               getCleanSpecialties(selectedUser).map((s, i) => (
                                 <span
                                   key={i}
                                   className="px-4 py-1.5 rounded-full bg-sud-orange/10 text-sud-orange text-[10px] font-black uppercase tracking-widest border border-sud-orange/20"
                                 >
                                   {s}
                                 </span>
                               ))
                             ) : (
                               <span className="text-xs text-slate-500 italic">Sin especialidad definida</span>
                             )}
                           </div>
                           <button
                             onClick={() => {
                               const current = getCleanSpecialties(selectedUser);
                               setPanelSpecialties(current);
                               setIsEditingPanelSpecialties(true);
                             }}
                             className="text-[9px] font-black uppercase tracking-widest px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition-all"
                           >
                             Modificar Especialidades
                           </button>
                         </div>
                       ) : (
                         <div className="space-y-6">
                           <div className="grid grid-cols-2 gap-3">
                             {AVAILABLE_SPECIALTIES.map(spec => {
                               const isChecked = panelSpecialties.includes(spec);
                               return (
                                 <button
                                   key={spec}
                                   onClick={() => handleTogglePanelSpecialty(spec)}
                                   className={`flex items-center justify-between px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                                     isChecked
                                       ? 'bg-sud-orange/10 border-sud-orange/30 text-sud-orange'
                                       : 'bg-white/[0.02] border-white/5 text-slate-500 hover:bg-white/[0.04]'
                                   }`}
                                 >
                                   <span>{spec}</span>
                                   <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center text-[8px] font-black ${
                                     isChecked
                                       ? 'border-sud-orange bg-sud-orange text-black'
                                       : 'border-white/20'
                                   }`}>
                                     {isChecked && '✓'}
                                   </span>
                                 </button>
                               );
                             })}
                           </div>
                           <div className="flex gap-3 justify-end pt-2">
                             <button
                               onClick={() => setIsEditingPanelSpecialties(false)}
                               className="px-4 py-2 text-[9px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-300"
                             >
                               Cancelar
                             </button>
                             <button
                               onClick={handleSavePanelSpecialties}
                               className="px-5 py-2.5 rounded-xl bg-sud-orange text-black text-[9px] font-black uppercase tracking-widest hover:bg-sud-orange/80 transition-all"
                             >
                               Guardar Cambios
                             </button>
                           </div>
                         </div>
                       )}
                    </div>
                 </section>

                 {/* Biography & Locations */}
                <section className="space-y-6">
                   <div className="flex items-center justify-between">
                      <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Acerca del Talento</h4>
                      <div className="h-[1px] flex-1 bg-white/5 ml-6" />
                   </div>
                   <div className="p-8 rounded-[2rem] bg-white/[0.01] border border-white/5 space-y-6">
                      <p className="text-xs text-slate-400 leading-relaxed italic">
                        "{selectedUser.bio || selectedTalentProfile?.bio || 'Este talento aún no ha actualizado su biografía profesional.'}"
                      </p>
                      <div className="flex gap-10">
                        {selectedUser.age && (
                          <div>
                            <p className="text-[8px] uppercase font-black text-slate-600 tracking-widest mb-1">Edad</p>
                            <div className="text-white font-black text-[10px] uppercase">{selectedUser.age} años</div>
                          </div>
                        )}
                        <div>
                          <p className="text-[8px] uppercase font-black text-slate-600 tracking-widest mb-1">Miembro desde</p>
                          <div className="flex items-center gap-2 text-white font-black text-[10px] uppercase">
                            <Calendar size={12} className="text-sud-turquoise" />
                            {new Date(selectedUser.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                   </div>
                </section>

                {/* Demo Playlist */}
                <section className="space-y-6">
                   <div className="flex items-center justify-between">
                      <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-sud-turquoise">
                        Playlist de Demos
                        {loadingDemos && <span className="ml-2 text-slate-600 font-mono text-xs">cargando...</span>}
                      </h4>
                      <div className="h-[1px] flex-1 bg-sud-turquoise/10 ml-6" />
                   </div>

                   <div className="space-y-4 pb-4">
                      {userDemos.length > 0 ? (
                        userDemos.map(demo => (
                          <div
                            key={demo.id}
                            className="p-5 rounded-[1.5rem] bg-white/[0.03] border border-white/5 space-y-3"
                          >
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`px-2 py-0.5 rounded text-[7px] font-black uppercase tracking-widest ${
                                demo.mediaType === 'VIDEO' ? 'bg-sud-turquoise/10 text-sud-turquoise' : 'bg-sud-orange/10 text-sud-orange'
                              }`}>
                                {demo.mediaType === 'VIDEO' ? '🎥 Video' : '🎙 Audio'}
                              </span>
                              <span className="px-2 py-0.5 rounded bg-white/5 text-slate-400 text-[7px] font-black uppercase tracking-widest">
                                {demo.category}
                              </span>
                              <p className="text-sm font-black text-white uppercase tracking-tight">{demo.title}</p>
                            </div>
                            <AudioPlayer src={demo.fileUrl} showVolume />
                            
                            <div className="flex items-center justify-between pt-2 border-t border-white/5 mt-2">
                              <div className="flex items-center gap-2">
                                <span className="text-[9px] uppercase font-black text-slate-500 tracking-widest">Género / Escena:</span>
                                <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${
                                  demo.visualGenre 
                                    ? 'bg-sud-turquoise/10 text-sud-turquoise border border-sud-turquoise/20' 
                                    : 'bg-slate-500/10 text-slate-500'
                                }`}>
                                  {demo.visualGenre || 'Sin género'}
                                </span>
                              </div>
                              
                              <select
                                value={demo.visualGenre || 'Sin género'}
                                onChange={async (e) => {
                                  const val = e.target.value;
                                  if (onUpdateDemoGenre && selectedUserId) {
                                    try {
                                      await onUpdateDemoGenre(demo.id, selectedUserId, val);
                                      // Actualizar localmente el estado de loadedDemos
                                      setLoadedDemos(prev => prev.map(d => d.id === demo.id ? { ...d, visualGenre: val === 'Sin género' ? undefined : val as any } : d));
                                    } catch (err) {
                                      console.error("Error al actualizar género de demo:", err);
                                      alert("Error al actualizar género de la demo");
                                    }
                                  }
                                }}
                                className="bg-black border border-white/10 rounded-lg px-2 py-1 text-[9px] font-black uppercase tracking-widest text-white outline-none focus:border-sud-turquoise/40"
                              >
                                <option value="Sin género">Sin género</option>
                                <option value="Acción">Acción</option>
                                <option value="Drama">Drama</option>
                                <option value="Romántico">Romántico</option>
                                <option value="Musical">Musical</option>
                                <option value="Trágico">Trágico</option>
                                <option value="Cómico">Cómico</option>
                                <option value="Suspenso">Suspenso</option>
                                <option value="Fantasía">Fantasía</option>
                                <option value="Terror">Terror</option>
                                <option value="Infantil">Infantil</option>
                                <option value="Otro">Otro</option>
                              </select>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-12 border-2 border-dashed border-white/5 rounded-[2.5rem] text-center space-y-4">
                           <Mic2 size={32} className="mx-auto text-slate-800" />
                           <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">
                             {loadingDemos ? 'Cargando demos...' : 'Este alumno no ha subido demos aún'}
                           </p>
                        </div>
                      )}                   </div>
                </section>

                {/* Enlace externo — solo desde la carga dinámica */}
                {externalLink && (
                  <section className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-sud-turquoise flex items-center gap-2">
                        <ExternalLink size={13} /> Carpeta externa
                      </h4>
                      <div className="h-px flex-1 bg-sud-turquoise/10 ml-4" />
                    </div>
                    <a
                      href={externalLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-4 rounded-2xl bg-sud-turquoise/5 border border-sud-turquoise/20 hover:bg-sud-turquoise/10 transition-all group"
                    >
                      <ExternalLink size={16} className="text-sud-turquoise shrink-0" />
                      <p className="text-xs text-sud-turquoise truncate group-hover:underline">{externalLink}</p>
                    </a>
                  </section>
                )}

                {/* Footer Actions inside the scroll */}
                <div className="pt-6 pb-12 border-t border-white/5 flex gap-4">
                   <button className="flex-1 sud-btn-secondary">
                      Contactar Alumno
                   </button>
                   <button className="flex-1 sud-btn-primary">
                      Generar Reportería
                   </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

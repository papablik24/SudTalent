import React, { useState, useMemo } from 'react';
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
  SlidersHorizontal,
  ArrowUpDown,
  ExternalLink,
  Mic2,
  Calendar,
  Phone,
  Mail,
  MapPin
} from 'lucide-react';
import { UserProfile, TalentProfile, VoiceDemo, DemoCategory, ProfileStatus, ProfileType } from '../types';

interface AdminTalentReviewProps {
  users: UserProfile[];
  talentProfiles: Record<string, TalentProfile>;
  allDemos: Record<string, VoiceDemo[]>;
  onClose?: () => void;
  onUpdateStatus?: (userId: string, status: ProfileStatus) => void;
}

export function AdminTalentReview({ users, talentProfiles, allDemos, onClose, onUpdateStatus }: AdminTalentReviewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<DemoCategory | 'TODOS'>('TODOS');
  const [selectedStatus, setSelectedStatus] = useState<ProfileStatus | 'TODOS'>('TODOS');
  const [selectedProfileType, setSelectedProfileType] = useState<ProfileType | 'TODOS'>('TODOS');
  const [hasDemosOnly, setHasDemosOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'name' | 'recent'>('name');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [playingDemoId, setPlayingDemoId] = useState<string | null>(null);

  // Filtered Users
  const filteredUsers = useMemo(() => {
    let result = users.filter(u => u.role !== 'ADMIN');

    if (searchTerm) {
      const lowSearch = searchTerm.toLowerCase();
      result = result.filter(u => 
        u.name?.toLowerCase().includes(lowSearch) || 
        u.phone.includes(lowSearch) ||
        u.email?.toLowerCase().includes(lowSearch)
      );
    }

    if (selectedCategory !== 'TODOS') {
      result = result.filter(u => u.primaryCategory === selectedCategory);
    }

    if (selectedStatus !== 'TODOS') {
      result = result.filter(u => (u.status || 'PENDING') === selectedStatus);
    }

    if (selectedProfileType !== 'TODOS') {
      result = result.filter(u => u.profileType === selectedProfileType);
    }

    if (hasDemosOnly) {
      result = result.filter(u => allDemos[u.uid]?.length > 0);
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
  }, [users, searchTerm, selectedCategory, selectedStatus, selectedProfileType, hasDemosOnly, sortBy, allDemos]);

  const selectedUser = users.find(u => u.uid === selectedUserId);
  const selectedTalentProfile = selectedUserId ? talentProfiles[selectedUserId] : null;
  const userDemos = selectedUserId ? (allDemos[selectedUserId] || []) : [];

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
              <div className="col-span-4">Nombre / Talento</div>
              <div className="col-span-2">Categoría</div>
              <div className="col-span-2">Tipo</div>
              <div className="col-span-2">Estado</div>
              <div className="col-span-2 text-right">Demos</div>
            </div>

            {/* Table Body */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {filteredUsers.length > 0 ? (
                filteredUsers.map((user) => {
                  const demos = allDemos[user.uid] || [];
                  const isSelected = selectedUserId === user.uid;
                  
                  return (
                    <button
                      key={user.uid}
                      onClick={() => setSelectedUserId(user.uid)}
                      className={`w-full grid grid-cols-12 gap-4 px-8 py-5 border-b border-white/[0.02] items-center transition-all hover:bg-white/[0.03] text-left group ${
                        isSelected ? 'bg-white/5 border-l-4 border-l-sud-turquoise' : ''
                      }`}
                    >
                      <div className="col-span-4 flex items-center gap-4">
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
                      
                      <div className="col-span-2">
                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                          user.primaryCategory ? 'bg-sud-orange/10 text-sud-orange' : 'bg-slate-500/10 text-slate-500'
                        }`}>
                          {user.primaryCategory || 'Sin Cat.'}
                        </span>
                      </div>

                      <div className="col-span-2">
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
                        <div className="flex items-center justify-end gap-2">
                          <div className="flex -space-x-2">
                            {demos.slice(0, 3).map((_, i) => (
                              <div key={i} className="w-6 h-6 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                                <FileAudio size={10} className="text-sud-turquoise" />
                              </div>
                            ))}
                          </div>
                          <span className="text-[10px] font-black text-slate-500">{demos.length}</span>
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
              className="fixed inset-y-0 right-0 w-full md:w-[600px] bg-sud-black border-l border-white/10 z-[100] shadow-[-20px_0_40px_rgba(0,0,0,0.5)] flex flex-col p-10"
            >
              <div className="flex items-center justify-between mb-12">
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

              <div className="flex-1 overflow-y-auto custom-scrollbar pr-4 space-y-12">
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
                      <h2 className="text-4xl font-black text-white uppercase tracking-tighter italic">
                        {selectedUser.name || 'Sin Nombre'}
                      </h2>
                      <div className="flex flex-wrap gap-3 mt-4">
                        <span className="px-4 py-1.5 rounded-full bg-sud-turquoise/10 text-sud-turquoise text-[10px] font-black uppercase tracking-widest border border-sud-turquoise/20">
                          {selectedUser.profileType === 'PARENT' ? 'Apoderado' : 'Perfil Personal'}
                        </span>
                        <span className="px-4 py-1.5 rounded-full bg-sud-orange/10 text-sud-orange text-[10px] font-black uppercase tracking-widest border border-sud-orange/20">
                          {selectedUser.primaryCategory || 'Sin Categoría'}
                        </span>
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

                {/* Talent Sheet / Minor Data */}
                {selectedUser.profileType === 'PARENT' && (
                  <section className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-sud-orange">Ficha Técnica del Menor</h4>
                      <div className="h-[1px] flex-1 bg-sud-orange/10 ml-6" />
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                      <div className="p-6 rounded-[1.8rem] bg-white/[0.02] border border-white/5">
                        <p className="text-[8px] uppercase font-black text-slate-600 tracking-widest mb-2">Nombre del Alumno</p>
                        <p className="text-lg font-black text-white uppercase">{selectedTalentProfile?.childName || 'N/A'}</p>
                      </div>
                      <div className="p-6 rounded-[1.8rem] bg-white/[0.02] border border-white/5">
                        <p className="text-[8px] uppercase font-black text-slate-600 tracking-widest mb-2">Edad / Categoría</p>
                        <p className="text-lg font-black text-white uppercase">{selectedTalentProfile?.childAge ? `${selectedTalentProfile.childAge} Años` : 'N/A'}</p>
                      </div>
                    </div>
                  </section>
                )}

                {/* Biography & Locations */}
                <section className="space-y-6">
                   <div className="flex items-center justify-between">
                      <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Acerca del Talento</h4>
                      <div className="h-[1px] flex-1 bg-white/5 ml-6" />
                   </div>
                   <div className="p-8 rounded-[2rem] bg-white/[0.01] border border-white/5 space-y-6">
                      <p className="text-xs text-slate-400 leading-relaxed italic">
                        "{selectedTalentProfile?.bio || 'Este talento aún no ha actualizado su biografía profesional.'}"
                      </p>
                      <div className="flex gap-10">
                        <div>
                          <p className="text-[8px] uppercase font-black text-slate-600 tracking-widest mb-1">Ubicación</p>
                          <div className="flex items-center gap-2 text-white font-black text-[10px] uppercase">
                            <MapPin size={12} className="text-sud-turquoise" />
                            {selectedTalentProfile?.location || 'Santiago, CL'}
                          </div>
                        </div>
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

                {/* Audio Playlist */}
                <section className="space-y-6">
                   <div className="flex items-center justify-between">
                      <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-sud-turquoise">Playlist de Demos</h4>
                      <div className="h-[1px] flex-1 bg-sud-turquoise/10 ml-6" />
                   </div>
                   <div className="space-y-4 pb-12">
                      {userDemos.length > 0 ? (
                        userDemos.map(demo => (
                          <div 
                            key={demo.id} 
                            className="p-6 rounded-[2rem] bg-white/[0.03] border border-white/5 hover:border-sud-turquoise/20 transition-all flex items-center justify-between group"
                          >
                            <div className="flex items-center gap-6">
                              <button 
                                onClick={() => handleToggleDemo(demo.id)}
                                className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${
                                  playingDemoId === demo.id 
                                    ? 'bg-sud-turquoise text-black' 
                                    : 'bg-white/5 text-sud-turquoise group-hover:bg-white/10'
                                } shadow-xl shadow-black/40`}
                              >
                                {playingDemoId === demo.id ? <Pause size={24} /> : <Play size={24} className="ml-1" />}
                              </button>
                              <div>
                                <div className="flex items-center gap-3 mb-1">
                                  <span className="px-2 py-0.5 rounded bg-sud-turquoise/10 text-sud-turquoise text-[7px] font-black uppercase tracking-widest">
                                    {demo.category}
                                  </span>
                                  <p className="text-sm font-black text-white uppercase tracking-tight">{demo.title}</p>
                                </div>
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Duración: {demo.duration}</p>
                              </div>
                            </div>
                            <button className="p-4 rounded-xl bg-white/5 text-slate-500 hover:text-white transition-colors">
                              <ExternalLink size={18} />
                            </button>
                          </div>
                        ))
                      ) : (
                        <div className="p-12 border-2 border-dashed border-white/5 rounded-[2.5rem] text-center space-y-4">
                           <Mic2 size={32} className="mx-auto text-slate-800" />
                           <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">Este alumno no ha subido demos aún</p>
                        </div>
                      )}
                   </div>
                </section>
              </div>

              {/* Sticky Footer Actions */}
              <div className="pt-8 border-t border-white/5 flex gap-4 bg-sud-black z-10 mt-auto">
                 <button className="flex-1 sud-btn-secondary">
                    Contactar Alumno
                 </button>
                 <button className="flex-1 sud-btn-primary">
                    Generar Reportería
                 </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

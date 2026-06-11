import React, { useState, useEffect } from 'react';
import { Plus, Search, ShieldCheck, Settings, Trash2, CheckCircle2, LogOut, CheckCircle, XCircle, Clock, FileDown, X, User, Phone, Mail, Calendar, AudioLines, Play, Pause, ChevronRight } from 'lucide-react';
import { UserProfile, WhitelistEntry, ProfileCategory, ProfileStatus } from '../../types';
import { generateAlumnosPDF, generateAlumnosExcel } from '../../services/reportService';
import { fetchAPI } from '../../services/backendService';
import { AudioPlayer } from '../../components/ui/AudioPlayer';

interface AdminStudentsProps {
  whitelist: WhitelistEntry[];
  users: UserProfile[];
  onAdd: (phone: string, name: string, category: ProfileCategory, email?: string, role?: string) => void;
  onRemove: (phone: string) => void;
  onUpdate: (phone: string, updates: any) => void;
  onUpdateStatus?: (userId: string, status: ProfileStatus) => void;
}

export function AdminStudents({ whitelist, users, onAdd, onRemove, onUpdate, onUpdateStatus }: AdminStudentsProps) {
  const [newPhone, setNewPhone] = useState('');
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newCategory, setNewCategory] = useState<ProfileCategory>('NONE');
  const [newRole, setNewRole] = useState('ALUMNO');
  const [searchTerm, setSearchTerm] = useState('');
  const [exportingExcel, setExportingExcel] = useState(false);
  const [demoCounts, setDemoCounts] = useState<Record<string, number>>({});

  // ── Lista unificada ────────────────────────────────────────────
  const displayUsers = [
    ...whitelist.map(w => ({
      ...(w as any),
      type: 'WHITELIST' as const,
      category: (w as any).category || 'NONE',
      uid: (w as any).uid,
      status: (w as any).userStatus || (w as any).status,
    })),
    ...users
      .filter(u => u.role !== 'ADMIN')
      .filter(u => {
        const uEmail = (u.email || '').toLowerCase();
        const uPhone = (u.phone || '').replace(/\D/g, '');
        return !whitelist.some((w: any) => {
          const wEmail = (w.email || '').toLowerCase();
          const wPhone = (w.phone || '').replace(/\D/g, '');
          return (uEmail && wEmail && uEmail === wEmail) ||
            (uPhone.length >= 8 && wPhone.length >= 8 && uPhone.slice(-8) === wPhone.slice(-8));
        });
      })
      .map(u => ({
        phone: u.phone, name: u.name, email: u.email,
        addedAt: u.createdAt, type: 'REGISTERED' as const,
        status: u.status, category: (u as any).category || 'NONE', uid: u.uid,
      })),
  ];

  const filteredList = displayUsers.filter(e =>
    e.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.phone?.includes(searchTerm) ||
    e.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    const fetchAllDemoCounts = async () => {
      const uidsToFetch = displayUsers
        .filter(u => u.uid && demoCounts[u.uid] === undefined)
        .map(u => u.uid);

      if (uidsToFetch.length === 0) return;

      const counts: Record<string, number> = { ...demoCounts };
      await Promise.all(
        uidsToFetch.map(async (uid) => {
          try {
            const audios = await fetchAPI<any[]>(`/voice-audios/user/${uid}`);
            counts[uid] = audios ? audios.length : 0;
          } catch (err) {
            console.error(`Error al obtener demos del usuario ${uid}:`, err);
            counts[uid] = 0;
          }
        })
      );
      setDemoCounts(counts);
    };

    fetchAllDemoCounts();
  }, [displayUsers]);

  const handleExportExcel = async () => {
    setExportingExcel(true);
    try {
      const enrichedData = await Promise.all(
        filteredList.map(async (entry) => {
          let demoCount: string | number = 0;
          if (entry.uid) {
            try {
              const audios = await fetchAPI<any[]>(`/voice-audios/user/${entry.uid}`);
              demoCount = audios ? audios.length : 0;
            } catch (err) {
              console.error(`Error al obtener demos de ${entry.name}:`, err);
              demoCount = 'No disponible';
            }
          } else {
            demoCount = 'No disponible';
          }

          // Buscar el usuario registrado correspondiente
          const registeredUser = users.find(u =>
            u.uid === entry.uid ||
            (u.email && entry.email && u.email.toLowerCase() === entry.email.toLowerCase()) ||
            (u.phone && entry.phone && u.phone.replace(/\D/g, '').slice(-8) === entry.phone.replace(/\D/g, '').slice(-8))
          );

          // Obtener rol / tipo de perfil
          let rolTipo = 'No disponible';
          if (registeredUser?.role === 'ADMIN') {
            rolTipo = 'Administrador';
          } else if (registeredUser?.profileType) {
            rolTipo = registeredUser.profileType;
          } else if (entry.category && entry.category !== 'NONE') {
            rolTipo = entry.category;
          } else if (entry.role) {
            rolTipo = entry.role;
          }

          // Mapear etiquetas de estado
          const STATUS_LABELS: Record<string, string> = {
            APPROVED: 'Aprobado',
            PENDING: 'En Revisión',
            INACTIVE: 'Inactivo',
            PENDIENTE: 'Pendiente',
            ACTIVO: 'Activo',
            INACTIVO: 'Inactivo',
          };
          const rawStatus = entry.status || registeredUser?.status || '';
          const estado = STATUS_LABELS[rawStatus] || rawStatus || 'No disponible';

          // Fecha de registro formateada
          const rawDate = entry.addedAt || registeredUser?.createdAt;
          const fechaRegistro = rawDate ? new Date(rawDate).toLocaleDateString('es-CL') : 'No disponible';

          return {
            'Nombre': entry.name || registeredUser?.name || 'No disponible',
            'Email': entry.email || registeredUser?.email || 'No disponible',
            'Teléfono': entry.phone || registeredUser?.phone || 'No disponible',
            'Edad': registeredUser?.age && registeredUser.age > 0 ? registeredUser.age : 'No disponible',
            'Rol/Tipo de Perfil': rolTipo,
            'Estado del Perfil': estado,
            'Cantidad de Demos': demoCount,
            'Fecha de Registro': fechaRegistro
          };
        })
      );

      generateAlumnosExcel(enrichedData);
    } catch (error) {
      console.error('Error al exportar a Excel:', error);
      alert('Hubo un error al exportar los datos a Excel.');
    } finally {
      setExportingExcel(false);
    }
  };

  // Estado de edición inline
  const [editingEntry, setEditingEntry] = useState<any | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editCategory, setEditCategory] = useState<ProfileCategory>('NONE');

  // Panel de perfil
  const [selectedEntry, setSelectedEntry] = useState<any | null>(null);
  const [userDemos, setUserDemos] = useState<any[]>([]);
  const [loadingDemos, setLoadingDemos] = useState(false);

  // Cargar demos cuando se selecciona un usuario
  useEffect(() => {
    if (!selectedEntry?.uid) { setUserDemos([]); return; }
    setLoadingDemos(true);
    fetchAPI<any[]>(`/voice-audios/user/${selectedEntry.uid}`)
      .then(data => setUserDemos(data || []))
      .catch(() => setUserDemos([]))
      .finally(() => setLoadingDemos(false));
  }, [selectedEntry?.uid]);

  // (Lista unificada y filtrada movida arriba para evitar temporal dead zone)

  // ── Añadir ────────────────────────────────────────────────────
  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const digitsOnly = newPhone.replace(/\D/g, '');
    if (digitsOnly.length >= 8 && newName.trim()) {
      onAdd(`569${digitsOnly}`, newName.trim(), newCategory, newEmail.trim(), newRole);
      setNewPhone(''); setNewName(''); setNewEmail(''); setNewCategory('NONE'); setNewRole('ALUMNO');
    } else {
      alert('Por favor ingrese un nombre y 8 dígitos de teléfono.');
    }
  };

  // ── Edición inline ────────────────────────────────────────────
  const handleStartEdit = (entry: any) => {
    setEditingEntry(entry);
    setEditName(entry.name || '');
    setEditEmail(entry.email || '');
    setEditCategory(entry.category || 'NONE');
    const digits = (entry.phone || '').replace(/\D/g, '');
    const local = digits.startsWith('56') ? digits.slice(2) : digits;
    const n = local.startsWith('9') ? local.slice(1) : local;
    setEditPhone(n.slice(0, 8));
  };

  const handleSaveEdit = () => {
    if (!editingEntry) return;
    const fullPhone = editPhone.length === 8 ? `569${editPhone}` : editingEntry.phone;
    onUpdate(editingEntry.phone, {
      name: editName,
      email: editEmail,
      phone: fullPhone,
      category: editCategory,
    });
    setEditingEntry(null);
  };

  // ── Helpers ───────────────────────────────────────────────────
  const formatPhone = (phone?: string) => {
    if (!phone) return null;
    const digits = phone.replace(/\D/g, '');
    const local = digits.startsWith('56') ? digits.slice(2) : digits;
    const n = local.startsWith('9') ? local.slice(1) : local;
    if (n.length < 8) return phone;
    return `+56 9 ${n.slice(0, 4)} ${n.slice(4, 8)}`;
  };

  const getCategoryLabel = (cat?: ProfileCategory) => {
    switch (cat) {
      case 'ADULT': return 'Adulto';
      case 'MINOR': return 'Menor';
      case 'BOTH': return 'Ambos';
      default: return 'Sin categoría';
    }
  };

  const getStatusInfo = (entry: any) => {
    if (entry.status === 'APPROVED') return { label: 'Aprobado', cls: 'text-sud-turquoise bg-sud-turquoise/10 border-sud-turquoise/20', Icon: CheckCircle };
    if (entry.status === 'INACTIVE') return { label: 'Inactivo', cls: 'text-red-400 bg-red-400/10 border-red-400/20', Icon: XCircle };
    if (entry.status === 'PENDING' || entry.type === 'REGISTERED') return { label: 'En Revisión', cls: 'text-sud-yellow bg-sud-yellow/10 border-sud-yellow/20', Icon: Clock };
    if (entry.type === 'WHITELIST' && !entry.uid) return { label: 'Sin registrar', cls: 'text-slate-500 bg-white/5 border-white/10', Icon: Clock };
    return null;
  };

  // ── Render ────────────────────────────────────────────────────
  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-8">
        <div>
          <h2 className="text-3xl font-black tracking-tighter text-white">
            Gestión de <span className="sud-vibrant-text-gradient uppercase tracking-widest">Alumnos</span>
          </h2>
          <p className="text-slate-400 mt-1 font-medium text-[10px] tracking-widest uppercase">
            Autorización de acceso y gestión de membresías
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* ── Formulario añadir ── */}
        <div className="lg:col-span-4">
          <section className="bg-white/[0.03] border border-white/10 rounded-[2.5rem] p-8 shadow-2xl space-y-6">
            <h3 className="text-lg font-black uppercase tracking-tight text-white flex items-center gap-2">
              <Plus className="text-sud-orange" size={20} />
              Añadir Nuevo Alumno
            </h3>
            <form onSubmit={handleAdd} className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold text-slate-500 px-1 tracking-widest">Nombre del Alumno</label>
                <input type="text" value={newName} onChange={e => setNewName(e.target.value)}
                  className="sud-input w-full" placeholder="Ej: Juan Pérez" required />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold text-slate-500 px-1 tracking-widest">Número Móvil</label>
                <div className="flex items-center bg-white/5 border border-white/10 rounded-xl overflow-hidden focus-within:border-sud-orange/50">
                  <span className="px-3 py-2.5 text-white/40 font-mono text-xs border-r border-white/10 select-none shrink-0">+56 9</span>
                  <input type="tel" placeholder="XXXX XXXX" value={newPhone}
                    onChange={e => setNewPhone(e.target.value.replace(/\D/g, '').slice(0, 8))}
                    className="bg-transparent px-3 py-2.5 text-white font-mono text-sm outline-none flex-1 tracking-widest" required />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold text-slate-500 px-1 tracking-widest">Categoría del Perfil</label>
                <select value={newCategory} onChange={e => setNewCategory(e.target.value as ProfileCategory)}
                  className="sud-input w-full appearance-none cursor-pointer">
                  <option value="NONE">Asignar luego</option>
                  <option value="ADULT">Adulto</option>
                  <option value="MINOR">Menor</option>
                  <option value="BOTH">Ambos</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold text-slate-500 px-1 tracking-widest">Tipo de Perfil / Rol</label>
                <select value={newRole} onChange={e => setNewRole(e.target.value)} className="sud-input w-full appearance-none cursor-pointer">
                  <option value="ALUMNO">Alumno</option>
                  <option value="PROFESOR">Profesor</option>
                  <option value="ADMIN">Administrador</option>
                </select>
                <p className="text-[8px] text-slate-700 uppercase tracking-widest font-bold px-1">El rol se asignará cuando el usuario se registre</p>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold text-slate-500 px-1 tracking-widest">
                  Correo <span className="text-slate-700">(opcional)</span>
                </label>
                <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)}
                  className="sud-input w-full" placeholder="alumno@ejemplo.cl" />
              </div>
              <button type="submit" className="w-full sud-btn-primary py-4 text-xs font-black uppercase tracking-widest">
                Autorizar Alumno
              </button>
            </form>
          </section>
        </div>

        {/* ── Tabla ── */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white/[0.02] border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/[0.01]">
              <h3 className="font-black text-sm uppercase tracking-widest flex items-center gap-2">
                <ShieldCheck className="text-sud-turquoise" size={20} />
                Lista de Acceso
                <span className="text-slate-600 font-mono text-xs ml-1">({filteredList.length})</span>
              </h3>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => generateAlumnosPDF(filteredList)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-sud-orange/10 hover:bg-sud-orange/20 border border-sud-orange/20 text-sud-orange font-black text-[10px] uppercase tracking-widest transition-all"
                  title="Exportar lista como PDF"
                >
                  <FileDown size={15} />
                  Exportar PDF
                </button>
                <button
                  onClick={handleExportExcel}
                  disabled={exportingExcel}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-sud-turquoise/10 hover:bg-sud-turquoise/20 border border-sud-turquoise/20 text-sud-turquoise font-black text-[10px] uppercase tracking-widest transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Exportar lista como Excel"
                >
                  {exportingExcel ? (
                    <span className="w-3.5 h-3.5 rounded-full border border-sud-turquoise border-t-transparent animate-spin shrink-0" />
                  ) : (
                    <FileDown size={15} className="shrink-0" />
                  )}
                  {exportingExcel ? 'Exportando...' : 'Exportar Excel'}
                </button>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" size={16} />
                  <input placeholder="Buscar alumno..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                    className="bg-black/40 border border-white/5 rounded-full py-1.5 pl-9 pr-4 text-[10px] outline-none focus:border-white/20 transition-all font-medium uppercase tracking-widest" />
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="text-[10px] uppercase text-white/20 bg-white/[0.02] font-black tracking-widest">
                  <tr>
                    <th className="px-4 py-4">Alumno</th>
                    <th className="px-4 py-4">Teléfono</th>
                    <th className="px-4 py-4">Correo</th>
                    <th className="px-4 py-4">Estado</th>
                    <th className="px-4 py-4">Demos</th>
                    <th className="px-4 py-4">Categoría</th>
                    <th className="px-4 py-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredList.map((entry, idx) => {
                    const statusInfo = getStatusInfo(entry);
                    const isEditing = editingEntry?.phone === entry.phone;

                    return (
                      <tr key={idx} className="hover:bg-white/[0.01] transition-colors group">

                        {/* Nombre */}
                        <td className="px-4 py-3">
                          {isEditing ? (
                            <input value={editName} onChange={e => setEditName(e.target.value)} autoFocus
                              placeholder="Nombre"
                              className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm font-black text-white uppercase tracking-tight w-full outline-none focus:border-sud-turquoise/50 min-w-[120px]" />
                          ) : (
                            <button
                              onClick={() => {
                                if (!entry.uid) return;
                                // Enriquecer con avatar del usuario registrado
                                const fullUser = users.find(u => u.uid === entry.uid);
                                setSelectedEntry({ ...entry, avatar: fullUser?.avatar || entry.avatar });
                              }}
                              className={`text-sm font-black uppercase tracking-tight text-left transition-colors ${entry.uid
                                  ? 'text-white hover:text-sud-turquoise cursor-pointer'
                                  : 'text-slate-500 cursor-default'
                                }`}
                              title={entry.uid ? 'Ver perfil' : 'Sin cuenta registrada'}
                            >
                              {entry.name || 'Sin Nombre'}
                              {entry.uid && <ChevronRight size={12} className="inline ml-1 opacity-50" />}
                            </button>
                          )}
                        </td>

                        {/* Teléfono */}
                        <td className="px-4 py-3">
                          {isEditing ? (
                            <div className="flex items-center bg-white/5 border border-white/10 rounded-lg overflow-hidden focus-within:border-sud-turquoise/50 min-w-[160px]">
                              <span className="px-2 py-1.5 text-slate-500 font-mono text-xs border-r border-white/10 select-none shrink-0">+56 9</span>
                              <input
                                type="tel"
                                value={editPhone}
                                onChange={e => setEditPhone(e.target.value.replace(/\D/g, '').slice(0, 8))}
                                placeholder="XXXX XXXX"
                                maxLength={8}
                                className="bg-transparent px-2 py-1.5 text-white font-mono text-sm outline-none w-full tracking-widest"
                              />
                            </div>
                          ) : (
                            <span className="font-mono text-sm text-slate-400">
                              {formatPhone(entry.phone) ?? <span className="text-slate-600 italic text-xs">Sin teléfono</span>}
                            </span>
                          )}
                        </td>

                        {/* Correo */}
                        <td className="px-4 py-3">
                          {isEditing ? (
                            <input
                              type="email"
                              value={editEmail}
                              onChange={e => setEditEmail(e.target.value)}
                              placeholder="correo@ejemplo.cl"
                              className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:border-sud-turquoise/50 w-full min-w-[150px]"
                            />
                          ) : (
                            <span className={`text-xs font-bold ${entry.email ? 'text-slate-400' : 'text-slate-600 italic'}`}>
                              {entry.email || '—'}
                            </span>
                          )}
                        </td>

                        {/* Estado + botones de aprobación */}
                        <td className="px-4 py-3">
                          {entry.uid && onUpdateStatus ? (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {statusInfo && (
                                <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border flex items-center gap-1 ${statusInfo.cls}`}>
                                  <statusInfo.Icon size={9} />
                                  {statusInfo.label}
                                </span>
                              )}
                              {entry.status !== 'APPROVED' && (
                                <button onClick={() => onUpdateStatus(entry.uid!, 'APPROVED')}
                                  className="w-6 h-6 rounded-full bg-sud-turquoise/10 hover:bg-sud-turquoise/30 flex items-center justify-center transition-colors md:opacity-0 group-hover:opacity-100"
                                  title="Aprobar perfil">
                                  <CheckCircle size={13} className="text-sud-turquoise" />
                                </button>
                              )}
                              {entry.status !== 'INACTIVE' && (
                                <button onClick={() => onUpdateStatus(entry.uid!, 'INACTIVE')}
                                  className="w-6 h-6 rounded-full bg-red-500/10 hover:bg-red-500/30 flex items-center justify-center transition-colors md:opacity-0 group-hover:opacity-100"
                                  title="Desactivar perfil">
                                  <XCircle size={13} className="text-red-400" />
                                </button>
                              )}
                              {entry.status !== 'PENDING' && (
                                <button onClick={() => onUpdateStatus(entry.uid!, 'PENDING')}
                                  className="w-6 h-6 rounded-full bg-sud-yellow/10 hover:bg-sud-yellow/30 flex items-center justify-center transition-colors md:opacity-0 group-hover:opacity-100"
                                  title="Volver a revisión">
                                  <Clock size={13} className="text-sud-yellow" />
                                </button>
                              )}
                            </div>
                          ) : (
                            <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border flex items-center gap-1 w-fit ${statusInfo?.cls ?? 'text-slate-600 border-white/10'}`}>
                              {statusInfo ? <><statusInfo.Icon size={9} />{statusInfo.label}</> : '—'}
                            </span>
                          )}
                        </td>

                        {/* Demos */}
                        <td className="px-4 py-3">
                          <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${entry.uid && demoCounts[entry.uid] > 0
                              ? 'text-sud-turquoise border-sud-turquoise/20 bg-sud-turquoise/5 font-black'
                              : 'text-slate-500 border-white/5 bg-white/5'
                            }`}>
                            {entry.uid ? (demoCounts[entry.uid] !== undefined ? (demoCounts[entry.uid] > 0 ? `${demoCounts[entry.uid]} demos` : 'Sin demos') : 'Cargando...') : 'Sin demos'}
                          </span>
                        </td>

                        {/* Categoría */}
                        <td className="px-4 py-3">
                          {isEditing ? (
                            <select value={editCategory} onChange={e => setEditCategory(e.target.value as ProfileCategory)}
                              className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-[10px] font-black text-white uppercase tracking-tight outline-none cursor-pointer focus:border-sud-turquoise/30">
                              <option value="NONE">Sin Cat.</option>
                              <option value="ADULT">Adulto</option>
                              <option value="MINOR">Menor</option>
                              <option value="BOTH">Ambos</option>
                            </select>
                          ) : (
                            <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md border border-current/10 ${entry.category === 'ADULT' ? 'text-blue-400 bg-blue-400/5' :
                                entry.category === 'MINOR' ? 'text-pink-400 bg-pink-400/5' :
                                  entry.category === 'BOTH' ? 'text-purple-400 bg-purple-400/5' :
                                    'text-slate-500 opacity-50 bg-white/5'
                              }`}>
                              {getCategoryLabel(entry.category)}
                            </span>
                          )}
                        </td>

                        {/* Acciones */}
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {isEditing ? (
                              <>
                                <button onClick={handleSaveEdit}
                                  className="p-2 text-green-400 hover:bg-green-400/10 rounded-lg transition-colors" title="Guardar">
                                  <CheckCircle2 size={18} />
                                </button>
                                <button onClick={() => setEditingEntry(null)}
                                  className="p-2 text-slate-500 hover:bg-white/5 rounded-lg transition-colors" title="Cancelar">
                                  <LogOut size={18} className="rotate-180" />
                                </button>
                              </>
                            ) : (
                              <>
                                {entry.uid && (
                                  <button onClick={() => {
                                    const fullUser = users.find(u => u.uid === entry.uid);
                                    setSelectedEntry({ ...entry, avatar: fullUser?.avatar || entry.avatar });
                                  }}
                                    className="p-2 text-white/10 hover:text-sud-turquoise hover:bg-sud-turquoise/5 rounded-lg transition-colors md:opacity-0 group-hover:opacity-100 cursor-pointer"
                                    title="Ver perfil">
                                    <User size={18} />
                                  </button>
                                )}
                                <button onClick={() => handleStartEdit(entry)}
                                  className="p-2 text-white/10 hover:text-sud-turquoise hover:bg-sud-turquoise/5 rounded-lg transition-colors md:opacity-0 group-hover:opacity-100"
                                  title="Editar">
                                  <Settings size={18} />
                                </button>
                                <button onClick={() => onRemove(entry.phone)}
                                  className="p-2 text-white/10 hover:text-red-400 hover:bg-red-400/5 rounded-lg transition-colors md:opacity-0 group-hover:opacity-100"
                                  title="Eliminar">
                                  <Trash2 size={18} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* ── Panel de perfil del alumno ── */}
      {selectedEntry && (
        <>
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40" onClick={() => setSelectedEntry(null)} />
          <div className="fixed inset-y-0 right-0 w-full md:w-[520px] bg-sud-black border-l border-white/10 z-50 flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/10 shrink-0">
              <div>
                <h3 className="text-lg font-black uppercase tracking-tight text-white">Perfil del Alumno</h3>
                <p className="text-[9px] text-slate-600 uppercase tracking-widest font-bold mt-0.5">
                  {selectedEntry.uid ? `ID: ${String(selectedEntry.uid).slice(0, 8)}...` : 'Sin cuenta'}
                </p>
              </div>
              <button onClick={() => setSelectedEntry(null)}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Avatar + info básica */}
              <div className="flex items-center gap-5">
                <div className="w-16 h-16 rounded-[1.5rem] bg-sud-gradient p-[1px] shrink-0">
                  <div className="w-full h-full rounded-[1.3rem] bg-black flex items-center justify-center overflow-hidden">
                    {selectedEntry.avatar ? (
                      <img src={selectedEntry.avatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <User size={28} className="text-sud-turquoise" />
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-xl font-black text-white uppercase tracking-tight">{selectedEntry.name || 'Sin nombre'}</p>
                  {(() => {
                    const si = getStatusInfo(selectedEntry);
                    return si ? (
                      <div className="flex items-center gap-1.5 mt-1">
                        <si.Icon size={11} className={si.cls.split(' ')[0]} />
                        <span className={`text-[10px] font-black uppercase tracking-widest ${si.cls.split(' ')[0]}`}>{si.label}</span>
                      </div>
                    ) : null;
                  })()}
                </div>
              </div>

              {/* Datos de contacto */}
              <div className="space-y-3">
                {selectedEntry.email && (
                  <div className="flex items-center gap-3 p-3 bg-white/[0.03] rounded-xl border border-white/5">
                    <Mail size={14} className="text-sud-turquoise shrink-0" />
                    <div>
                      <p className="text-[9px] text-slate-600 uppercase font-black tracking-widest">Correo</p>
                      <p className="text-sm text-slate-300">{selectedEntry.email}</p>
                    </div>
                  </div>
                )}
                {selectedEntry.phone && (
                  <div className="flex items-center gap-3 p-3 bg-white/[0.03] rounded-xl border border-white/5">
                    <Phone size={14} className="text-sud-turquoise shrink-0" />
                    <div>
                      <p className="text-[9px] text-slate-600 uppercase font-black tracking-widest">Teléfono</p>
                      <p className="text-sm text-slate-300 font-mono">{formatPhone(selectedEntry.phone)}</p>
                    </div>
                  </div>
                )}
                {selectedEntry.addedAt && (
                  <div className="flex items-center gap-3 p-3 bg-white/[0.03] rounded-xl border border-white/5">
                    <Calendar size={14} className="text-sud-turquoise shrink-0" />
                    <div>
                      <p className="text-[9px] text-slate-600 uppercase font-black tracking-widest">Registrado</p>
                      <p className="text-sm text-slate-300">
                        {new Date(selectedEntry.addedAt).toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Cambiar estado */}
              {selectedEntry.uid && onUpdateStatus && (
                <div className="space-y-3">
                  <p className="text-[10px] uppercase font-black text-slate-600 tracking-widest">Estado del perfil</p>
                  <div className="flex gap-2 flex-wrap">
                    {selectedEntry.status !== 'APPROVED' && (
                      <button onClick={() => { onUpdateStatus(selectedEntry.uid, 'APPROVED'); setSelectedEntry({ ...selectedEntry, status: 'APPROVED' }); }}
                        className="flex items-center gap-2 px-4 py-2 bg-sud-turquoise/10 hover:bg-sud-turquoise/20 border border-sud-turquoise/20 text-sud-turquoise font-black text-[10px] uppercase tracking-widest rounded-xl transition-all">
                        <CheckCircle size={13} /> Aprobar
                      </button>
                    )}
                    {selectedEntry.status !== 'INACTIVE' && (
                      <button onClick={() => { onUpdateStatus(selectedEntry.uid, 'INACTIVE'); setSelectedEntry({ ...selectedEntry, status: 'INACTIVE' }); }}
                        className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 font-black text-[10px] uppercase tracking-widest rounded-xl transition-all">
                        <XCircle size={13} /> Desactivar
                      </button>
                    )}
                    {selectedEntry.status !== 'PENDING' && (
                      <button onClick={() => { onUpdateStatus(selectedEntry.uid, 'PENDING'); setSelectedEntry({ ...selectedEntry, status: 'PENDING' }); }}
                        className="flex items-center gap-2 px-4 py-2 bg-sud-yellow/10 hover:bg-sud-yellow/20 border border-sud-yellow/20 text-sud-yellow font-black text-[10px] uppercase tracking-widest rounded-xl transition-all">
                        <Clock size={13} /> En revisión
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Demos */}
              <div className="space-y-3">
                <p className="text-[10px] uppercase font-black text-slate-600 tracking-widest flex items-center gap-2">
                  <AudioLines size={13} className="text-sud-orange" /> Demos
                  {!loadingDemos && <span className="text-slate-700 font-mono">({userDemos.filter(d => d.category === 'demo').length})</span>}
                </p>

                {loadingDemos ? (
                  <div className="flex items-center justify-center py-6">
                    <div className="w-6 h-6 border-2 border-sud-orange/30 border-t-sud-orange rounded-full animate-spin" />
                  </div>
                ) : userDemos.filter(d => d.category === 'demo').length === 0 ? (
                  <div className="p-6 text-center border border-dashed border-white/5 rounded-2xl">
                    <p className="text-[10px] text-slate-600 font-black uppercase tracking-widest">Sin demos subidas</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {userDemos.filter(d => d.category === 'demo').map(demo => (
                      <div key={demo.id} className="p-4 bg-white/[0.03] rounded-2xl border border-white/5 space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-black text-white uppercase tracking-tight truncate">{demo.title}</p>
                          <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${(demo.mediaType || '').toLowerCase().includes('video')
                              ? 'bg-sud-turquoise/10 text-sud-turquoise'
                              : 'bg-sud-orange/10 text-sud-orange'
                            }`}>
                            {(demo.mediaType || '').toLowerCase().includes('video') ? 'Video' : 'Audio'}
                          </span>
                        </div>
                        {!(demo.mediaType || '').toLowerCase().includes('video') && (
                          <AudioPlayer src={demo.fileUrl} showVolume />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

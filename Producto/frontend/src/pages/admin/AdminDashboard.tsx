import React, { useState } from 'react';
import { Plus, Sparkles, ChevronRight, X, User, Phone, Mail, Calendar, CheckCircle, XCircle, Clock } from 'lucide-react';
import { StatCard } from '../../components/ui/StatCard';
import { UserProfile, WhitelistEntry, ProfileStatus } from '../../types';

interface AdminDashboardProps {
  whitelist: WhitelistEntry[];
  users: UserProfile[];
  onNavigate: (view: string) => void;
  onUpdateStatus?: (userId: string, status: ProfileStatus) => void;
}

export function AdminDashboard({ whitelist, users, onNavigate, onUpdateStatus }: AdminDashboardProps) {

  const [selectedUser, setSelectedUser] = useState<any | null>(null);

  // Unir whitelist con datos de users por email, ordenado por fecha desc
  const recentActivity = whitelist
    .map(w => {
      const wAny = w as any;
      const matchedUser = users.find(u =>
        (u.email && u.email.toLowerCase() === (w.email || '').toLowerCase()) ||
        (wAny.uid && u.uid === wAny.uid)
      );
      return {
        phone: w.phone,
        name: w.name || matchedUser?.name || 'Sin nombre',
        email: w.email || matchedUser?.email || '',
        addedAt: w.addedAt,
        status: matchedUser?.status || 'PENDING',
        uid: matchedUser?.uid || wAny.uid,
        avatar: matchedUser?.avatar,
        profileType: matchedUser?.profileType,
        age: matchedUser?.age,
        bio: matchedUser?.bio,
      };
    })
    .filter(e => e.name && e.name !== 'Sin nombre')
    .sort((a, b) => {
      const dateA = a.addedAt ? new Date(a.addedAt).getTime() : 0;
      const dateB = b.addedAt ? new Date(b.addedAt).getTime() : 0;
      return dateB - dateA;
    });

  // Stats reales
  const totalAlumnos = users.filter(u => u.role !== 'ADMIN').length;
  const usuariosActivos = users.filter(u => u.role !== 'ADMIN' && u.active !== false && u.status === 'APPROVED').length;
  const enRevision = users.filter(u => u.role !== 'ADMIN' && u.status === 'PENDING').length;

  const getStatusInfo = (status: string) => {
    if (status === 'APPROVED') return { label: 'Aprobado', cls: 'text-sud-turquoise', Icon: CheckCircle };
    if (status === 'INACTIVE') return { label: 'Inactivo', cls: 'text-red-400', Icon: XCircle };
    return { label: 'En Revisión', cls: 'text-sud-yellow', Icon: Clock };
  };

  const formatDate = (val: any) => {
    if (!val) return '—';
    const d = new Date(val);
    return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatPhone = (phone?: string) => {
    if (!phone) return null;
    const digits = phone.replace(/\D/g, '');
    const local = digits.startsWith('56') ? digits.slice(2) : digits;
    const n = local.startsWith('9') ? local.slice(1) : local;
    if (n.length < 8) return phone;
    return `+56 9 ${n.slice(0, 4)} ${n.slice(4, 8)}`;
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black tracking-tighter text-white">
            Panel de <span className="sud-vibrant-text-gradient uppercase tracking-widest">Administración</span>
          </h2>
          <p className="text-slate-400 mt-1 font-medium text-[10px] tracking-widest uppercase">
            Resumen general de la plataforma
          </p>
        </div>
        <button onClick={() => onNavigate('/admin/students')} className="sud-btn-primary px-8 py-4">
          <Plus size={18} />
          <span>Nuevo Alumno</span>
        </button>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard label="Total Alumnos" value={totalAlumnos.toString()} color="sud-turquoise" />
        <StatCard label="Aprobados" value={usuariosActivos.toString()} color="sud-orange" />
        <StatCard label="En Revisión" value={enRevision.toString()} color="sud-yellow" />
        <button
          onClick={() => onNavigate('/admin/casting')}
          className="sud-stat-card bg-gradient-to-br from-sud-turquoise/20 to-sud-turquoise/5 border-sud-turquoise/40 group relative overflow-hidden text-left"
        >
          <div className="absolute top-0 right-0 w-32 h-32 blur-3xl opacity-30 -mr-16 -mt-16 bg-sud-turquoise pointer-events-none" />
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mb-2">Smart Casting</p>
          <p className="text-xl font-black tracking-tight text-white group-hover:text-sud-turquoise transition-colors">
            Revisión de Talento
          </p>
          <div className="mt-4 flex items-center gap-2 text-[8px] font-black uppercase tracking-widest text-sud-turquoise">
            Ir al panel <ChevronRight size={12} />
          </div>
        </button>
      </div>

      {/* Actividad reciente */}
      <section className="bg-white/[0.01] border border-white/5 rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-sud-turquoise/[0.03] blur-[100px] rounded-full pointer-events-none" />
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-xl font-black uppercase tracking-tighter text-white flex items-center gap-3">
            <Sparkles className="text-sud-orange" size={20} />
            Actividad Reciente
          </h3>
          <button
            onClick={() => onNavigate('/admin/students')}
            className="text-[10px] font-black uppercase tracking-[0.2em] text-sud-turquoise hover:underline cursor-pointer relative z-10"
          >
            Ver todos los alumnos
          </button>
        </div>

        <div className="space-y-4">
          {recentActivity.slice(0, 5).map((entry, i) => {
            const statusInfo = getStatusInfo(entry.status);
            return (
              <div
                key={i}
                className="group flex items-center justify-between p-6 bg-white/[0.02] border border-white/[0.05] rounded-[2rem] hover:bg-white/[0.05] hover:border-white/10 transition-all relative z-10"
              >
                <div className="flex items-center gap-5">
                  {/* Avatar */}
                  <div className="w-14 h-14 rounded-2xl bg-sud-gradient p-[1px] shadow-lg shrink-0">
                    <div className="w-full h-full rounded-[0.85rem] bg-black flex items-center justify-center overflow-hidden">
                      {entry.avatar ? (
                        <img src={entry.avatar} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-sud-turquoise font-black text-xl">
                          {entry.name ? entry.name[0].toUpperCase() : 'A'}
                        </span>
                      )}
                    </div>
                  </div>

                  <div>
                    <p className="text-base font-black text-white uppercase tracking-tight">{entry.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <statusInfo.Icon size={11} className={statusInfo.cls} />
                      <span className={`text-[10px] font-black uppercase tracking-widest ${statusInfo.cls}`}>
                        {statusInfo.label}
                      </span>
                      {entry.addedAt && (
                        <span className="text-[9px] text-slate-700 font-mono ml-2">{formatDate(entry.addedAt)}</span>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedUser(entry)}
                  className="p-3 rounded-full bg-white/5 hover:bg-sud-turquoise hover:text-black transition-all"
                  title="Ver perfil"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            );
          })}

          {recentActivity.length === 0 && (
            <div className="p-12 text-center border-2 border-dashed border-white/5 rounded-[2rem]">
              <p className="text-slate-500 font-black uppercase tracking-widest text-[10px]">No hay alumnos registrados</p>
            </div>
          )}
        </div>
      </section>

      {/* ── Panel de perfil de alumno (drawer lateral) ── */}
      {selectedUser && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40"
            onClick={() => setSelectedUser(null)}
          />

          {/* Panel */}
          <div className="fixed inset-y-0 right-0 w-full md:w-[480px] bg-sud-black border-l border-white/10 z-50 shadow-2xl flex flex-col overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-8 border-b border-white/10">
              <h3 className="text-lg font-black uppercase tracking-tight text-white">Perfil del Alumno</h3>
              <button
                onClick={() => setSelectedUser(null)}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Contenido */}
            <div className="p-8 space-y-8 flex-1">
              {/* Avatar + nombre */}
              <div className="flex items-center gap-6">
                <div className="w-20 h-20 rounded-[1.5rem] bg-sud-gradient p-[1px] shrink-0">
                  <div className="w-full h-full rounded-[1.4rem] bg-black flex items-center justify-center overflow-hidden">
                    {selectedUser.avatar ? (
                      <img src={selectedUser.avatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <User size={32} className="text-sud-turquoise" />
                    )}
                  </div>
                </div>
                <div>
                  <h2 className="text-2xl font-black text-white uppercase tracking-tight">{selectedUser.name}</h2>
                  {(() => {
                    const si = getStatusInfo(selectedUser.status);
                    return (
                      <div className="flex items-center gap-2 mt-1">
                        <si.Icon size={13} className={si.cls} />
                        <span className={`text-[10px] font-black uppercase tracking-widest ${si.cls}`}>{si.label}</span>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Datos */}
              <div className="space-y-4">
                {selectedUser.email && (
                  <div className="flex items-center gap-3 p-4 bg-white/[0.03] rounded-2xl border border-white/5">
                    <Mail size={16} className="text-sud-turquoise shrink-0" />
                    <div>
                      <p className="text-[9px] text-slate-600 uppercase font-black tracking-widest">Correo</p>
                      <p className="text-sm text-slate-300 font-mono">{selectedUser.email}</p>
                    </div>
                  </div>
                )}
                {selectedUser.phone && (
                  <div className="flex items-center gap-3 p-4 bg-white/[0.03] rounded-2xl border border-white/5">
                    <Phone size={16} className="text-sud-turquoise shrink-0" />
                    <div>
                      <p className="text-[9px] text-slate-600 uppercase font-black tracking-widest">Teléfono</p>
                      <p className="text-sm text-slate-300 font-mono">{formatPhone(selectedUser.phone)}</p>
                    </div>
                  </div>
                )}
                {selectedUser.age && (
                  <div className="flex items-center gap-3 p-4 bg-white/[0.03] rounded-2xl border border-white/5">
                    <Calendar size={16} className="text-sud-turquoise shrink-0" />
                    <div>
                      <p className="text-[9px] text-slate-600 uppercase font-black tracking-widest">Edad</p>
                      <p className="text-sm text-slate-300">{selectedUser.age} años</p>
                    </div>
                  </div>
                )}
                {selectedUser.bio && (
                  <div className="p-4 bg-white/[0.03] rounded-2xl border border-white/5">
                    <p className="text-[9px] text-slate-600 uppercase font-black tracking-widest mb-2">Biografía</p>
                    <p className="text-sm text-slate-400 leading-relaxed italic">{selectedUser.bio}</p>
                  </div>
                )}
                <div className="p-4 bg-white/[0.03] rounded-2xl border border-white/5">
                  <p className="text-[9px] text-slate-600 uppercase font-black tracking-widest mb-1">Registrado</p>
                  <p className="text-sm text-slate-400 font-mono">{formatDate(selectedUser.addedAt)}</p>
                </div>
              </div>

              {/* Acciones de estado */}
              {selectedUser.uid && onUpdateStatus && (
                <div className="space-y-3">
                  <p className="text-[10px] uppercase font-black text-slate-600 tracking-widest">Cambiar estado</p>
                  <div className="flex gap-3 flex-wrap">
                    {selectedUser.status !== 'APPROVED' && (
                      <button
                        onClick={() => {
                          onUpdateStatus(selectedUser.uid, 'APPROVED');
                          setSelectedUser({ ...selectedUser, status: 'APPROVED' });
                        }}
                        className="flex items-center gap-2 px-5 py-2.5 bg-sud-turquoise/10 hover:bg-sud-turquoise/20 border border-sud-turquoise/30 text-sud-turquoise font-black text-[10px] uppercase tracking-widest rounded-2xl transition-all"
                      >
                        <CheckCircle size={14} /> Aprobar
                      </button>
                    )}
                    {selectedUser.status !== 'INACTIVE' && (
                      <button
                        onClick={() => {
                          onUpdateStatus(selectedUser.uid, 'INACTIVE');
                          setSelectedUser({ ...selectedUser, status: 'INACTIVE' });
                        }}
                        className="flex items-center gap-2 px-5 py-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 font-black text-[10px] uppercase tracking-widest rounded-2xl transition-all"
                      >
                        <XCircle size={14} /> Desactivar
                      </button>
                    )}
                    {selectedUser.status !== 'PENDING' && (
                      <button
                        onClick={() => {
                          onUpdateStatus(selectedUser.uid, 'PENDING');
                          setSelectedUser({ ...selectedUser, status: 'PENDING' });
                        }}
                        className="flex items-center gap-2 px-5 py-2.5 bg-sud-yellow/10 hover:bg-sud-yellow/20 border border-sud-yellow/20 text-sud-yellow font-black text-[10px] uppercase tracking-widest rounded-2xl transition-all"
                      >
                        <Clock size={14} /> En revisión
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

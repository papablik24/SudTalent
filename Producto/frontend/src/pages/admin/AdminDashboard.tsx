import React from 'react';
import { Plus, Sparkles, ChevronRight } from 'lucide-react';
import { StatCard } from '../../components/ui/StatCard';
import { UserProfile, WhitelistEntry } from '../../types';

interface AdminDashboardProps {
  whitelist: WhitelistEntry[];
  users: UserProfile[];
  onNavigate: (view: string) => void;
}

export function AdminDashboard({ whitelist, users, onNavigate }: AdminDashboardProps) {
  // Combine whitelist and pending users
  const displayUsers = [
    ...whitelist.map(w => ({ ...w, type: 'WHITELIST' as const })),
    ...users
      .filter(u => u.status === 'PENDING' || u.uid.startsWith('mock_'))
      .filter(u => !whitelist.some(w => w.phone === u.phone))
      .map(u => ({ 
        phone: u.phone, 
        name: u.name, 
        addedAt: u.createdAt, 
        type: 'REGISTERED' as const,
        status: u.status,
        uid: u.uid
      }))
  ];

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black tracking-tighter text-white">Panel de <span className="sud-vibrant-text-gradient uppercase tracking-widest">Administración</span></h2>
          <p className="text-slate-400 mt-1 font-medium text-[10px] tracking-widest uppercase">Resumen general de la plataforma</p>
        </div>
        <div className="flex items-center gap-4">
           <button 
              onClick={() => onNavigate('/admin/students')}
              className="sud-btn-primary px-8 py-4"
           >
              <Plus size={18} />
              <span>Nuevo Alumno</span>
           </button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard label="Total Alumnos" value={displayUsers.length.toString()} color="sud-turquoise" />
        <StatCard label="Demos Totales" value="24" color="sud-orange" />
        <StatCard label="Usuarios Activos" value="18" color="sud-yellow" />
        <button 
          onClick={() => onNavigate('/admin/casting')}
          className="sud-stat-card bg-gradient-to-br from-sud-turquoise/20 to-sud-turquoise/5 border-sud-turquoise/40 group relative overflow-hidden text-left"
        >
          <div className="absolute top-0 right-0 w-32 h-32 blur-3xl opacity-30 -mr-16 -mt-16 bg-sud-turquoise" />
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mb-2">Smart Casting</p>
          <p className="text-xl font-black tracking-tight text-white group-hover:text-sud-turquoise transition-colors">Revisión de Talento</p>
          <div className="mt-4 flex items-center gap-2 text-[8px] font-black uppercase tracking-widest text-sud-turquoise">
            Ir al panel <ChevronRight size={12} />
          </div>
        </button>
      </div>

      <section className="bg-white/[0.01] border border-white/5 rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-sud-turquoise/[0.03] blur-[100px] rounded-full" />
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-xl font-black uppercase tracking-tighter text-white flex items-center gap-3">
            <Sparkles className="text-sud-orange" size={20} />
            Actividad Reciente
          </h3>
          <button 
            onClick={() => onNavigate('/admin/students')}
            className="text-[10px] font-black uppercase tracking-[0.2em] text-sud-turquoise hover:underline"
          >
            Ver todos los alumnos
          </button>
        </div>
        <div className="space-y-4">
          {displayUsers.slice(0, 3).map((entry, i) => (
            <div key={i} className="group flex items-center justify-between p-7 bg-white/[0.02] border border-white/[0.05] rounded-[2rem] hover:bg-white/[0.05] hover:border-white/10 transition-all cursor-pointer">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 rounded-2xl bg-sud-gradient p-[1px] shadow-lg shadow-sud-turquoise/5">
                  <div className="w-full h-full rounded-[0.9rem] bg-black flex items-center justify-center text-sud-turquoise font-black text-2xl">
                    {entry.name ? entry.name[0].toUpperCase() : 'A'}
                  </div>
                </div>
                <div>
                  <p className="text-lg font-black text-white uppercase tracking-tight group-hover:sud-vibrant-text-gradient transition-all">{entry.name || 'Alumno Sin Nombre'}</p>
                  <p className="text-[10px] text-slate-600 font-black uppercase tracking-[0.2em] mt-1">
                    {entry.type === 'REGISTERED' ? 'En Revisión Casting' : 'Autorizado en Plataforma'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <span className="text-[10px] text-slate-700 font-black uppercase tracking-widest hidden md:block">Recién Agregado</span>
                <div className="p-3 rounded-full bg-white/5 group-hover:bg-sud-turquoise group-hover:text-black transition-all">
                  <ChevronRight size={20} />
                </div>
              </div>
            </div>
          ))}
          {displayUsers.length === 0 && (
            <div className="p-12 text-center border-2 border-dashed border-white/5 rounded-[2rem]">
              <p className="text-slate-500 font-black uppercase tracking-widest text-[10px]">No hay alumnos registrados</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

import React from 'react';
import { 
  Mic2, 
  Users, 
  ShieldCheck, 
  User as UserIcon, 
  Settings, 
  AudioLines, 
  Sparkles, 
  LogOut,
  Briefcase
} from 'lucide-react';
import { NavItem } from './ui/NavItem';
import { UserProfile, UserRole } from '../types';

interface SidebarProps {
  role: UserRole;
  user: UserProfile | null;
  currentPath: string;
  onLogout: () => void;
  onNavigate: (path: string) => void;
}

export function Sidebar({ role, user, currentPath, onLogout, onNavigate }: SidebarProps) {
  return (
    <aside className="w-full md:w-72 sud-glass-sidebar flex flex-col p-8 space-y-10 backdrop-blur-3xl relative z-20">
      <div className="flex flex-col">
        <h1 
          className="text-3xl font-black tracking-tighter leading-none text-white uppercase group-hover:sud-vibrant-text-gradient transition-all cursor-pointer"
          onClick={() => onNavigate('/')}
        >
          SUD<span className="sud-vibrant-text-gradient">TALENT</span>
        </h1>
        <span className="text-[10px] text-slate-500 tracking-[0.2em] uppercase font-black mt-1">
          Gestión de Voces
        </span>
      </div>

      <nav className="flex-1 space-y-3">
        <p className="text-[10px] uppercase font-black text-slate-700 tracking-[0.3em] mb-4 px-2">Navegación</p>
        
        {role === 'ADMIN' ? (
          <>
            <NavItem 
              icon={<ShieldCheck size={20} />} 
              label="Lista Blanca" 
              active={currentPath === '/admin'} 
              onClick={() => onNavigate('/admin')}
            />
            <NavItem 
              icon={<Users size={20} />} 
              label="Gestión Alumnos" 
              active={currentPath === '/admin/students'}
              onClick={() => onNavigate('/admin/students')}
            />
            <NavItem 
              icon={<Mic2 size={20} />} 
              label="Revisión Casting" 
              active={currentPath === '/admin/casting'}
              onClick={() => onNavigate('/admin/casting')}
            />
            <NavItem 
              icon={<Briefcase size={20} />} 
              label="Convocatorias" 
              active={currentPath === '/admin/convocatorias'}
              onClick={() => onNavigate('/admin/convocatorias')}
            />
            <NavItem icon={<Settings size={20} />} label="Ajustes" />
          </>
        ) : (
          <>
            <NavItem 
              icon={<UserIcon size={20} />} 
              label="Mi Perfil" 
              active={currentPath === '/profile'} 
              onClick={() => onNavigate('/profile')}
            />
            <NavItem 
              icon={<AudioLines size={20} />} 
              label="Mis Demos" 
              active={currentPath === '/demos'}
              onClick={() => onNavigate('/demos')}
            />
            <NavItem 
              icon={<Sparkles size={20} />} 
              label="Oportunidades" 
              active={currentPath === '/convocatorias'}
              onClick={() => onNavigate('/convocatorias')}
            />
          </>
        )}
      </nav>

      <div className="pt-8 border-t border-white/5 space-y-6">
        <div className="flex items-center space-x-4 p-4 rounded-3xl bg-white/[0.02] border border-white/5">
          <div className="w-12 h-12 rounded-2xl bg-sud-gradient p-[1px] flex items-center justify-center shadow-lg shadow-sud-turquoise/10">
            <div className="w-full h-full rounded-[0.9rem] bg-black flex items-center justify-center overflow-hidden">
              {user?.avatar ? (
                <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <UserIcon className="text-sud-turquoise" size={24} />
              )}
            </div>
          </div>
          <div className="truncate flex-1">
            <p className="text-sm font-black truncate text-white uppercase tracking-tight">{user?.name || (role === 'ADMIN' ? 'Admin' : 'Alumno')}</p>
            <p className="text-[10px] text-slate-500 truncate uppercase tracking-widest font-bold">{role === 'ADMIN' ? 'Acceso Total' : user?.phone}</p>
          </div>
        </div>
        <button 
          onClick={onLogout}
          className="flex items-center space-x-3 text-slate-500 hover:text-white transition-all w-full group px-4 py-3 rounded-2xl hover:bg-red-500/5 hover:border-red-500/10 border border-transparent"
        >
          <LogOut size={18} className="group-hover:text-red-400 group-hover:translate-x-1 transition-all" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em] group-hover:text-red-400">Cerrar Sesión</span>
        </button>
      </div>
    </aside>
  );
}

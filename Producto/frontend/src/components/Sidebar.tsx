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
  Briefcase,
  FileText,
  ClipboardList,
  Bot,
  Sun,
  Moon
} from 'lucide-react';
import { NavItem } from './ui/NavItem';
import { UserProfile, UserRole } from '../types';
import { useTheme } from '../contexts/ThemeContext';

interface SidebarProps {
  role: UserRole;
  user: UserProfile | null;
  currentPath: string;
  onLogout: () => void;
  onNavigate: (path: string) => void;
}

export function Sidebar({ role, user, currentPath, onLogout, onNavigate }: SidebarProps) {
  const { theme, toggleTheme } = useTheme();
  return (
    <aside className="w-72 sud-glass-sidebar flex flex-col p-6 md:p-8 space-y-10 backdrop-blur-3xl relative z-20 h-full overflow-y-auto">
      <div className="flex flex-col">
        <button 
          onClick={() => onNavigate('/')}
          className="group/logo transition-all duration-300 hover:scale-[1.03] active:scale-95 cursor-pointer"
        >
          <img 
            src="/logos/SUD_LOGO_4.png" 
            alt="Sudamerican Voices" 
            className="h-10 w-auto object-contain drop-shadow-[0_0_12px_rgba(45,212,191,0.15)] group-hover/logo:drop-shadow-[0_0_20px_rgba(45,212,191,0.3)] transition-all duration-500"
          />
        </button>
        <span className="text-[10px] text-slate-500 tracking-[0.2em] uppercase font-black mt-2">
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
            <NavItem 
              icon={<ClipboardList size={20} />} 
              label="Postulaciones" 
              active={currentPath === '/admin/postulaciones'}
              onClick={() => onNavigate('/admin/postulaciones')}
            />
            <NavItem 
              icon={<Bot size={20} />} 
              label="Asistente IA" 
              active={currentPath === '/admin/asistente-ia'}
              onClick={() => onNavigate('/admin/asistente-ia')}
            />
            <NavItem 
              icon={<Settings size={20} />} 
              label="Ajustes" 
              active={currentPath === '/admin/settings'}
              onClick={() => onNavigate('/admin/settings')}
            />
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
            <NavItem 
              icon={<FileText size={20} />} 
              label="Mis Postulaciones" 
              active={currentPath === '/mis-postulaciones'}
              onClick={() => onNavigate('/mis-postulaciones')}
            />
            <NavItem 
              icon={<Bot size={20} />} 
              label="Asistente IA" 
              active={currentPath === '/asistente-ia'}
              onClick={() => onNavigate('/asistente-ia')}
            />
          </>
        )}
      </nav>

      <div className="pt-8 border-t border-white/5 space-y-6">
        <div className="flex items-center space-x-4 p-4 rounded-3xl bg-white/[0.02] border border-white/5">
          <div className="w-12 h-12 rounded-2xl bg-sud-gradient p-[1px] flex items-center justify-center shadow-lg shadow-sud-turquoise/10 shrink-0">
            <div className="w-full h-full rounded-[0.9rem] bg-black flex items-center justify-center overflow-hidden">
              {user?.avatar ? (
                <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <UserIcon className="text-sud-turquoise" size={24} />
              )}
            </div>
          </div>
          <div className="truncate flex-1 min-w-0 space-y-0.5">
            <p className="text-sm font-black truncate text-white uppercase tracking-tight">
              {user?.name || (role === 'ADMIN' ? 'Admin' : 'Alumno')}
            </p>
            {user?.phone && (
              <p className="text-[12px] text-slate-500 truncate font-mono">
                {(() => {
                  const d = user.phone.replace(/[^0-9]/g, '');
                  const local = d.startsWith('56') ? d.slice(2) : d;
                  const n = local.startsWith('9') ? local.slice(1) : local;
                  return `+56 9 ${n.slice(0, 4)} ${n.slice(4)}`.trim();
                })()}
              </p>
            )}
            {user?.email && (
              <p className="text-[10px] text-slate-600 truncate">{user.email}</p>
            )}
          </div>
        </div>
        {/* Switch de Tema (Modo Claro / Modo Oscuro) */}
        <button 
          onClick={toggleTheme}
          className="flex items-center space-x-3 text-slate-500 hover:text-white transition-all w-full group px-4 py-3 rounded-2xl hover:bg-white/5 border border-transparent cursor-pointer"
        >
          {theme === 'dark' ? (
            <>
              <Sun size={18} className="text-slate-500 group-hover:text-amber-400 transition-all" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">Modo Claro</span>
            </>
          ) : (
            <>
              <Moon size={18} className="text-slate-500 group-hover:text-indigo-600 transition-all" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 light:text-slate-700">Modo Oscuro</span>
            </>
          )}
        </button>

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

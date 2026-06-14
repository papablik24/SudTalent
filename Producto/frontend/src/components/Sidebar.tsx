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
  GraduationCap,
  BookOpen,
  Sun,
  Moon,
  Bell,
  CheckCheck,
  Calendar
} from 'lucide-react';
import { NavItem } from './ui/NavItem';
import { UserProfile, UserRole, Notificacion } from '../types';
import { useTheme } from '../contexts/ThemeContext';
import { notificacionService } from '../services/notificacionService';
import { useLocation } from 'react-router-dom';

interface SidebarProps {
  role: UserRole;
  user: UserProfile | null;
  currentPath: string;
  onLogout: () => void;
  onNavigate: (path: string) => void;
}

export function Sidebar({ role, user, currentPath, onLogout, onNavigate }: SidebarProps) {
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const activePath = location.pathname + location.search;

  // Notification States
  const [notifications, setNotifications] = React.useState<Notificacion[]>([]);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [showNotifications, setShowNotifications] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  const fetchUnreadCount = async () => {
    if (!user) return;
    try {
      const count = await notificacionService.getUnreadCount();
      setUnreadCount(count);
    } catch (err) {
      console.error('Error fetching unread count:', err);
    }
  };

  const fetchNotifications = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const list = await notificacionService.getMisNotificaciones();
      setNotifications(list);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  // Poll for unread count
  React.useEffect(() => {
    if (!user) return;
    fetchUnreadCount();
    fetchNotifications();

    const interval = setInterval(() => {
      fetchUnreadCount();
    }, 20000); // Check every 20s

    return () => clearInterval(interval);
  }, [user?.uid]);

  // Refetch notifications when dropdown is opened
  React.useEffect(() => {
    if (showNotifications) {
      fetchNotifications();
      fetchUnreadCount();
    }
  }, [showNotifications]);

  const handleMarkAsRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await notificacionService.marcarLeida(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, leido: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Error marking as read:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificacionService.marcarTodasLeidas();
      setNotifications(prev => prev.map(n => ({ ...n, leido: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  };

  const handleNotificationClick = async (notif: Notificacion) => {
    if (!notif.leido) {
      try {
        await notificacionService.marcarLeida(notif.id);
        setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, leido: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
      } catch (err) {
        console.error('Error marking as read:', err);
      }
    }
    setShowNotifications(false);

    if (notif.tipo === 'POSTULACION') {
      onNavigate('/mis-postulaciones');
    } else if (notif.tipo === 'CURSO' || notif.tipo === 'AGENDA') {
      onNavigate('/cursos');
    }
  };

  // Close dropdown on click outside
  React.useEffect(() => {
    const handleClickOutside = () => {
      setShowNotifications(false);
    };
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  return (
    <aside className="w-72 sud-glass-sidebar flex flex-col p-6 md:p-8 space-y-10 backdrop-blur-3xl relative z-20 h-full overflow-y-auto">
      <div className="flex items-center justify-between relative">
        <div className="flex flex-col">
          <button 
            onClick={() => onNavigate('/')}
            className="cursor-pointer text-left"
          >
            <img 
              src="/logos/SUD_LOGO_4.png" 
              alt="Sudamerican Voices" 
              className={`h-10 w-auto object-contain${theme === 'light' ? ' logo-light-outline' : ''}`}
            />
          </button>
          <span className="text-[10px] text-slate-500 tracking-[0.2em] uppercase font-black mt-2">
            Gestión de Voces
          </span>
        </div>

        {/* Campana de Notificaciones */}
        {user && (
          <div className="relative" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className={`relative p-2 rounded-xl border transition-all cursor-pointer flex items-center justify-center ${
                unreadCount > 0 
                  ? 'sud-bell-unread' 
                  : 'border-white/10 light:border-slate-300 bg-white/5 light:bg-slate-200 hover:bg-white/10 light:hover:bg-slate-300 text-slate-400 hover:text-white light:hover:text-slate-900'
              }`}
              title="Notificaciones"
            >
              <Bell size={18} className={unreadCount > 0 ? "animate-swing" : ""} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-sud-orange text-white text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center border-2 border-black light:border-slate-300">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Dropdown de Notificaciones */}
            {showNotifications && (
              <div 
                className="absolute top-12 right-0 w-64 bg-[#0d0d0d]/95 light:bg-slate-200/95 border border-white/10 light:border-slate-300 rounded-2xl shadow-2xl z-50 p-4 space-y-3 backdrop-blur-2xl"
                onClick={e => e.stopPropagation()}
              >
                <div className="flex items-center justify-between border-b border-white/5 light:border-slate-300 pb-2">
                  <h4 className="text-[10px] font-black uppercase tracking-wider text-white light:text-slate-800">Notificaciones</h4>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllAsRead}
                      className="text-[9px] font-black uppercase text-sud-turquoise hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <CheckCheck size={12} /> Marcar todo
                    </button>
                  )}
                </div>

                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {loading && notifications.length === 0 ? (
                    <div className="py-8 text-center text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                      Cargando...
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="py-8 text-center text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                      No tienes notificaciones
                    </div>
                  ) : (
                    notifications.map(notif => (
                      <div
                        key={notif.id}
                        onClick={() => handleNotificationClick(notif)}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex gap-2 relative ${
                          notif.leido ? 'notification-read' : 'notification-unread'
                        }`}
                      >
                        <div className="flex flex-col flex-1 min-w-0 space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5">
                              <span className={`text-[7px] font-black uppercase px-1.5 py-0.5 rounded border ${
                                notif.tipo === 'POSTULACION'
                                  ? 'bg-sud-orange/10 text-sud-orange border-sud-orange/20'
                                  : notif.tipo === 'CURSO'
                                    ? 'bg-sud-turquoise/10 text-sud-turquoise border-sud-turquoise/20'
                                    : 'bg-sud-blue/10 text-sud-blue border-sud-blue/20'
                              }`}>
                                {notif.tipo}
                              </span>
                              {!notif.leido && (
                                <span className="badge-new text-[6px] uppercase px-1 py-0.2 rounded tracking-wider">
                                  NUEVA
                                </span>
                              )}
                            </div>
                            <span className="text-[8px] text-slate-500 font-mono">
                              {new Date(notif.fechaCreacion).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                            </span>
                          </div>
                          <p className={`text-[10px] font-black uppercase tracking-tight truncate leading-tight ${
                            notif.leido ? 'text-slate-400 light:text-slate-500' : 'text-white light:text-slate-900'
                          }`}>
                            {notif.titulo}
                          </p>
                          <p className={`text-[9px] font-medium leading-relaxed break-words ${
                            notif.leido ? 'text-slate-500 light:text-slate-500' : 'text-slate-300 light:text-slate-700'
                          }`}>
                            {notif.mensaje}
                          </p>
                        </div>

                        {!notif.leido && (
                          <button
                            onClick={(e) => handleMarkAsRead(notif.id, e)}
                            className="text-slate-500 hover:text-sud-turquoise self-start p-1 rounded transition-colors cursor-pointer"
                            title="Marcar como leída"
                          >
                            <CheckCheck size={14} />
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <nav className="flex-1 space-y-3">
        <p className="text-[10px] uppercase font-black text-slate-700 light:text-slate-400 tracking-[0.3em] mb-4 px-2">Navegación</p>
        
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
              icon={<GraduationCap size={20} />} 
              label="Profesores" 
              active={currentPath === '/admin/profesores'}
              onClick={() => onNavigate('/admin/profesores')}
            />
            <NavItem 
              icon={<BookOpen size={20} />} 
              label="Cursos" 
              active={currentPath === '/admin/cursos'}
              onClick={() => onNavigate('/admin/cursos')}
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
        ) : role === 'PROFESOR' ? (
          <>
            <NavItem 
              icon={<BookOpen size={20} />} 
              label="Mis Cursos" 
              active={activePath === '/profesor?view=dashboard' || activePath === '/profesor' || activePath === '/profesor/'} 
              onClick={() => onNavigate('/profesor?view=dashboard')}
            />
            <NavItem 
              icon={<Users size={20} />} 
              label="Mis Alumnos" 
              active={activePath === '/profesor?view=alumnos'} 
              onClick={() => onNavigate('/profesor?view=alumnos')}
            />
            <NavItem 
              icon={<Calendar size={20} />} 
              label="Mi Agenda" 
              active={activePath === '/profesor?view=agenda'} 
              onClick={() => onNavigate('/profesor?view=agenda')}
            />
            <NavItem 
              icon={<Bot size={20} />} 
              label="Asistente IA" 
              active={activePath === '/profesor?view=ia'} 
              onClick={() => onNavigate('/profesor?view=ia')}
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
              icon={<BookOpen size={20} />} 
              label="Cursos" 
              active={currentPath === '/cursos'}
              onClick={() => onNavigate('/cursos')}
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

      <div className="pt-8 border-t border-white/5 light:border-slate-200 space-y-6">
        <div className="flex items-center space-x-4 p-4 rounded-3xl bg-white/2 light:bg-slate-100 border border-white/5 light:border-slate-200">
          <div className="w-12 h-12 rounded-2xl bg-sud-gradient p-px flex items-center justify-center shadow-lg shadow-sud-turquoise/10 shrink-0">
            <div className="w-full h-full rounded-[0.9rem] bg-black light:bg-slate-200 flex items-center justify-center overflow-hidden">
              {user?.avatar ? (
                <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <UserIcon className="text-sud-turquoise" size={24} />
              )}
            </div>
          </div>
          <div className="truncate flex-1 min-w-0 space-y-0.5">
            <p className="text-sm font-black truncate text-white light:text-slate-900 uppercase tracking-tight">
              {user?.name || (role === 'ADMIN' ? 'Admin' : role === 'PROFESOR' ? 'Profesor' : 'Alumno')}
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
          className="flex items-center space-x-3 text-slate-500 hover:text-white light:hover:text-slate-900 transition-all w-full group px-4 py-3 rounded-2xl hover:bg-white/5 light:hover:bg-slate-100 border border-transparent cursor-pointer"
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
          className="flex items-center space-x-3 text-slate-500 hover:text-white light:hover:text-red-600 transition-all w-full group px-4 py-3 rounded-2xl hover:bg-red-500/5 light:hover:bg-red-50 hover:border-red-500/10 light:hover:border-red-200 border border-transparent"
        >
          <LogOut size={18} className="group-hover:text-red-400 group-hover:translate-x-1 transition-all" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em] group-hover:text-red-400">Cerrar Sesión</span>
        </button>
      </div>
    </aside>
  );
}

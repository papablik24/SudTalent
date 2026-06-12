import React, { useState, useEffect } from 'react';
import { LogOut, GraduationCap, Clock, Award, Users, BookOpen } from 'lucide-react';
import { UserProfile, CursoDTO } from '../../types';
import { profesorService, ProfesorDTO } from '../../services/profesorService';
import { cursoService } from '../../services/cursoService';

interface ProfesorDashboardProps {
  user: UserProfile;
  onLogout: () => void;
}

interface DisplayCurso {
  titulo: string;
  modalidad: string;
  descripcion?: string;
}

export function ProfesorDashboard({ user, onLogout }: ProfesorDashboardProps) {
  const [profesorData, setProfesorData] = useState<ProfesorDTO | null>(null);
  const [realCursos, setRealCursos] = useState<CursoDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfesorAndCursos = async () => {
      try {
        const profData = await profesorService.getById(user.uid);
        setProfesorData(profData);

        try {
          const cursosData = await cursoService.getByProfesor(user.uid);
          setRealCursos(cursosData);
        } catch (cursosErr) {
          console.warn('Error al cargar cursos relacionales, usando fallback:', cursosErr);
        }
      } catch (err: any) {
        console.error('Error al cargar datos del profesor:', err);
        setError(err.message || 'Error al cargar perfil del profesor.');
      } finally {
        setLoading(false);
      }
    };
    fetchProfesorAndCursos();
  }, [user.uid]);

  const displayCursos: DisplayCurso[] = realCursos.length > 0
    ? realCursos.map(rc => ({
        titulo: rc.titulo,
        modalidad: rc.modalidad || 'Docencia Oficial',
        descripcion: rc.descripcion
      }))
    : (profesorData?.cursosAsignados
        ? profesorData.cursosAsignados.split(',').map(c => c.trim()).filter(Boolean).map(c => ({
            titulo: c,
            modalidad: 'Docencia Oficial'
          }))
        : []);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-slate-100 relative overflow-hidden flex flex-col justify-between">
      {/* Background gradients */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-sud-turquoise/[0.03] blur-[150px] rounded-full -mr-48 -mt-48 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-sud-orange/[0.02] blur-[150px] rounded-full -ml-48 -mb-48 pointer-events-none" />

      {/* Navigation Header */}
      <header className="border-b border-white/5 bg-black/30 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sud-gradient p-[1px]">
              <div className="w-full h-full rounded-[0.6rem] bg-black flex items-center justify-center">
                <GraduationCap className="text-sud-turquoise" size={20} />
              </div>
            </div>
            <div>
              <span className="text-sm font-black tracking-tight text-white uppercase">SudTalent</span>
              <span className="block text-[8px] text-sud-turquoise font-black uppercase tracking-widest -mt-1">Docentes</span>
            </div>
          </div>

          <button
            onClick={onLogout}
            className="px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-black uppercase tracking-widest text-slate-300 hover:text-white flex items-center gap-2 transition-all cursor-pointer"
          >
            <LogOut size={14} /> Cerrar Sesión
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-4xl mx-auto px-6 py-16 flex flex-col justify-center items-center text-center space-y-12 z-10 w-full">
        {/* Welcome Section */}
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-sud-turquoise/10 border border-sud-turquoise/20 text-[9px] font-black text-sud-turquoise uppercase tracking-widest">
            <Award size={12} /> Espacio Docente Activo
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-white">
            ¡Hola, Profesor <span className="sud-vibrant-text-gradient uppercase">{user.name || 'Docente'}</span>!
          </h1>
          <p className="text-slate-400 text-sm max-w-xl mx-auto leading-relaxed">
            Te damos la bienvenida al portal de profesores de SudTalent. Tu cuenta controlada ha sido configurada con éxito.
          </p>
        </div>

        {/* Info Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 w-full max-w-3xl">
          {[
            { icon: <Users className="text-sud-turquoise" size={24} />, label: 'Mis Alumnos', desc: 'Próximamente gestión de estudiantes' },
            { 
              icon: <BookOpen className="text-sud-orange" size={24} />, 
              label: 'Mis Cursos', 
              desc: loading 
                ? 'Cargando cursos...' 
                : displayCursos.length > 0 
                  ? `${displayCursos.length} curso(s) asignado(s)` 
                  : 'Aún no tienes cursos asignados' 
            },
            { icon: <Clock className="text-violet-400" size={24} />, label: 'Mi Agenda', desc: 'Planificación de clases and horarios' },
          ].map((item, i) => (
            <div key={i} className="sud-glass-panel p-6 border-white/5 text-center flex flex-col items-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-center">
                {item.icon}
              </div>
              <h3 className="text-sm font-black text-white uppercase tracking-tight">{item.label}</h3>
              <p className="text-[10px] text-slate-500 font-medium leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>

        {/* Cursos Asignados Section */}
        <div className="w-full max-w-3xl space-y-6 text-left">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <h2 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-2">
              <BookOpen className="text-sud-orange" size={20} /> Mis Cursos Asignados
            </h2>
            <span className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded bg-white/5 border border-white/10 text-slate-400">
              Semestre Activo
            </span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-10">
              <div className="w-8 h-8 border-3 border-sud-orange/20 border-t-sud-orange rounded-full animate-spin" />
            </div>
          ) : error ? (
            <div className="p-6 text-center border border-red-500/20 rounded-2xl bg-red-500/5 text-red-400 text-xs font-bold uppercase tracking-widest">
              {error}
            </div>
          ) : displayCursos.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {displayCursos.map((curso, idx) => (
                <div 
                  key={idx} 
                  className="sud-glass-panel p-5 border-white/5 hover:border-sud-orange/30 hover:bg-sud-orange/[0.01] transition-all flex items-start gap-4"
                >
                  <div className="w-10 h-10 rounded-xl bg-sud-orange/10 border border-sud-orange/20 flex items-center justify-center shrink-0">
                    <Award className="text-sud-orange" size={18} />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-xs font-black text-white uppercase tracking-tight leading-snug">{curso.titulo}</h3>
                    <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">{curso.modalidad}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center border-2 border-dashed border-white/5 rounded-3xl bg-white/[0.005]">
              <BookOpen size={32} className="mx-auto text-slate-700 mb-4" />
              <p className="text-slate-500 font-black uppercase tracking-widest text-[10px]">
                Aún no tienes cursos asignados
              </p>
              <p className="text-slate-600 text-[9px] uppercase tracking-widest mt-1.5">
                Ponte en contacto con el administrador para que asigne tus asignaturas
              </p>
            </div>
          )}
        </div>

        {/* Under construction alert */}
        <div className="p-6 rounded-2xl border border-white/5 bg-white/[0.01] max-w-xl text-center space-y-2 mx-auto">
          <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Aviso del Portal</p>
          <p className="text-xs text-slate-500 leading-relaxed">
            Actualmente estamos expandiendo este panel para incorporar la gestión de tus convocatorias y evaluaciones. 
            Pronto recibirás actualizaciones sobre tus clases y herramientas avanzadas de voz.
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-6 bg-black/10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[8px] text-slate-600 font-bold uppercase tracking-widest">
            Uso Restringido © Sudamerican Voices 2026
          </p>
          <img src="/logos/LIBERA TU VOZ.png" alt="Libera tu voz" className="h-4 opacity-20" />
        </div>
      </footer>
    </div>
  );
}

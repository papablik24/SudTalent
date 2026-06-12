import { useState, useEffect } from 'react';
import {
  BookOpen,
  GraduationCap,
  Monitor,
  MapPin,
  Music,
  Mic2,
  Video,
  Zap,
  ChevronDown,
  CheckCircle2,
  UserX,
  Loader,
  AlertCircle,
  Users,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { profesorService, ProfesorDTO } from '../../services/profesorService';
import { cursoService, CursoDTO, AlumnoResumen } from '../../services/cursoService';
import { CursoDetalle } from '../shared/CursoDetalle';

// ── Metadata visual de cada cursoKey ────────────────────────────────
const CURSO_META: Record<string, { icono: React.ReactNode; color: string }> = {
  'doblaje-presencial':  { icono: <Mic2 size={22} />,         color: 'text-sud-orange border-sud-orange/30 bg-sud-orange/10' },
  'doblaje-online':      { icono: <Monitor size={22} />,       color: 'text-sky-400 border-sky-400/30 bg-sky-400/10' },
  'doblaje-musical':     { icono: <Music size={22} />,         color: 'text-pink-400 border-pink-400/30 bg-pink-400/10' },
  'locucion-presencial': { icono: <Mic2 size={22} />,         color: 'text-sud-yellow border-sud-yellow/30 bg-sud-yellow/10' },
  'canto':               { icono: <Music size={22} />,         color: 'text-violet-400 border-violet-400/30 bg-violet-400/10' },
  'intensivo-360':       { icono: <Zap size={22} />,           color: 'text-sud-turquoise border-sud-turquoise/30 bg-sud-turquoise/10' },
  'doblaje-advance':     { icono: <GraduationCap size={22} />, color: 'text-emerald-400 border-emerald-400/30 bg-emerald-400/10' },
  'opening-lab':         { icono: <Video size={22} />,         color: 'text-red-400 border-red-400/30 bg-red-400/10' },
};

function ModalidadBadge({ modalidad }: { modalidad: string }) {
  if (modalidad === 'PRESENCIAL')
    return (
      <span className="inline-flex items-center gap-1 text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
        <MapPin size={9} /> Presencial
      </span>
    );
  if (modalidad === 'ONLINE')
    return (
      <span className="inline-flex items-center gap-1 text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md bg-sky-400/10 text-sky-400 border border-sky-400/20">
        <Monitor size={9} /> Online
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md bg-violet-400/10 text-violet-400 border border-violet-400/20">
      <BookOpen size={9} /> Mixto
    </span>
  );
}

// ── Componente principal ─────────────────────────────────────────────
export function AdminCursos() {
  const [cursos, setCursos] = useState<CursoDTO[]>([]);
  const [profesores, setProfesores] = useState<ProfesorDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  // Modal de alumnos
  const [alumnosModal, setAlumnosModal] = useState<{ curso: CursoDTO; alumnos: AlumnoResumen[] } | null>(null);
  // Vista detalle
  const [selectedCurso, setSelectedCurso] = useState<CursoDTO | null>(null);

  useEffect(() => {
    Promise.all([cursoService.getAll(), profesorService.getAll()])
      .then(([c, p]) => {
        setCursos(c);
        setProfesores(p.filter(prof => prof.active));
      })
      .catch(err => setError(err.message || 'Error al cargar datos'))
      .finally(() => setLoading(false));
  }, []);

  const handleAssign = async (cursoId: string, profesorId: string) => {
    setSaving(cursoId);
    try {
      const updated = await cursoService.assignProfesor(cursoId, profesorId || null);
      setCursos(prev => prev.map(c => (c.id === cursoId ? updated : c)));
    } catch (err: any) {
      setError(err.message || 'Error al asignar profesor');
    } finally {
      setSaving(null);
    }
  };

  const asignados = cursos.filter(c => c.profesorId).length;
  const totalAlumnos = cursos.reduce((sum, c) => sum + c.totalAlumnos, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-10 h-10 border-4 border-sud-orange/20 border-t-sud-orange rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-12 text-center border border-red-500/20 rounded-[2rem] bg-red-500/5">
        <AlertCircle size={32} className="mx-auto text-red-400 mb-4" />
        <p className="text-red-400 font-bold text-sm">{error}</p>
        <button
          onClick={() => { setError(null); setLoading(true); }}
          className="mt-4 text-[10px] text-red-400 underline uppercase tracking-widest font-bold"
        >
          Reintentar
        </button>
      </div>
    );
  }

  // Vista detalle del curso
  if (selectedCurso) {
    const updated = cursos.find(c => c.id === selectedCurso.id) ?? selectedCurso;
    return (
      <CursoDetalle
        curso={updated}
        userRole="ADMIN"
        userId=""
        onBack={() => setSelectedCurso(null)}
      />
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <header>
        <h2 className="text-3xl font-black tracking-tighter text-white">
          Gestión de{' '}
          <span className="sud-vibrant-text-gradient uppercase tracking-widest">Cursos</span>
        </h2>
        <p className="text-slate-400 mt-1 font-medium text-[10px] tracking-widest uppercase">
          Asigna profesores y gestiona la inscripción de alumnos
        </p>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Cursos',    value: cursos.length, color: 'text-white',         bg: 'bg-white/5',         border: 'border-white/10' },
          { label: 'Con Profesor',    value: asignados,     color: 'text-emerald-400',   bg: 'bg-emerald-500/5',   border: 'border-emerald-500/20' },
          { label: 'Sin Asignar',     value: cursos.length - asignados, color: 'text-amber-400', bg: 'bg-amber-500/5', border: 'border-amber-500/20' },
          { label: 'Total Inscritos', value: totalAlumnos,  color: 'text-sud-turquoise', bg: 'bg-sud-turquoise/5', border: 'border-sud-turquoise/20' },
        ].map(stat => (
          <div key={stat.label} className={`p-5 rounded-2xl border ${stat.bg} ${stat.border} text-center`}>
            <p className={`text-3xl font-black ${stat.color}`}>{stat.value}</p>
            <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Lista de cursos */}
      <div className="space-y-4">
        {cursos.map((curso, i) => {
          const meta = CURSO_META[curso.cursoKey] ?? {
            icono: <BookOpen size={22} />,
            color: 'text-slate-400 border-slate-400/30 bg-slate-400/10',
          };
          const isSaving = saving === curso.id;

          return (
            <motion.div
              key={curso.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="sud-glass-panel p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center gap-6 group hover:border-white/20 transition-all"
            >
              {/* Icono */}
              <div className={`w-14 h-14 rounded-2xl border flex items-center justify-center shrink-0 ${meta.color}`}>
                {meta.icono}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base font-black text-white uppercase tracking-tight group-hover:text-sud-turquoise transition-colors">
                    {curso.titulo}
                  </h3>
                  <ModalidadBadge modalidad={curso.modalidad} />
                </div>
                <p className="text-[10px] text-slate-500">{curso.descripcion}</p>

                <div className="flex items-center gap-4 flex-wrap">
                  {/* Profesor */}
                  {curso.profesorId ? (
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 size={12} className="text-emerald-400 shrink-0" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">
                        {curso.profesorNombre}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <UserX size={12} className="text-amber-400 shrink-0" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">
                        Sin profesor
                      </span>
                    </div>
                  )}

                  {/* Alumnos */}
                  <button
                    onClick={() => setAlumnosModal({ curso, alumnos: curso.alumnos })}
                    className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-sud-turquoise transition-colors"
                  >
                    <Users size={12} />
                    {curso.totalAlumnos} alumno{curso.totalAlumnos !== 1 ? 's' : ''}
                  </button>
                </div>
              </div>

              {/* Botón ver detalle + Selector de profesor */}
              <div className="flex items-center gap-3 shrink-0 w-full md:w-auto">
                <button
                  onClick={() => setSelectedCurso(curso)}
                  className="flex items-center gap-1.5 px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-white/10 bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-all shrink-0"
                >
                  Ver
                </button>

              {/* Selector de profesor */}
              <div className="relative flex-1 md:w-64">                {isSaving ? (
                  <div className="flex items-center justify-center gap-2 h-12 px-4 rounded-2xl bg-sud-turquoise/10 border border-sud-turquoise/20 text-[10px] font-black uppercase tracking-widest text-sud-turquoise">
                    <Loader size={13} className="animate-spin" /> Guardando...
                  </div>
                ) : (
                  <>
                    <select
                      value={curso.profesorId ?? ''}
                      onChange={e => handleAssign(curso.id, e.target.value)}
                      className="sud-input w-full appearance-none pr-10 text-[10px] font-black uppercase tracking-widest"
                    >
                      <option value="">— Sin asignar —</option>
                      {profesores.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name} · {p.especialidad}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                  </>
                )}
              </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {profesores.length === 0 && (
        <div className="p-8 text-center border border-amber-500/20 rounded-3xl bg-amber-500/5">
          <GraduationCap size={32} className="mx-auto text-amber-400 mb-3" />
          <p className="text-amber-400 font-black text-sm uppercase tracking-widest">No hay profesores activos</p>
          <p className="text-slate-500 text-xs mt-1">Crea profesores en la sección "Profesores" primero.</p>
        </div>
      )}

      {/* ── Modal: alumnos del curso ──────────────────────────────── */}
      <AnimatePresence>
        {alumnosModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          >
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setAlumnosModal(null)} />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md bg-[#0f0f0f] border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl max-h-[80vh] flex flex-col"
            >
              <div className="flex items-center justify-between mb-6 shrink-0">
                <div>
                  <h3 className="text-lg font-black text-white uppercase tracking-tight">
                    {alumnosModal.curso.titulo}
                  </h3>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-0.5">
                    {alumnosModal.alumnos.length} alumno{alumnosModal.alumnos.length !== 1 ? 's' : ''} inscrito{alumnosModal.alumnos.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <button onClick={() => setAlumnosModal(null)} className="p-2 rounded-xl hover:bg-white/5 text-slate-500 hover:text-white transition-all">
                  <X size={20} />
                </button>
              </div>

              <div className="overflow-y-auto flex-1 space-y-3 pr-1">
                {alumnosModal.alumnos.length === 0 ? (
                  <div className="py-12 text-center">
                    <Users size={32} className="mx-auto text-slate-700 mb-3" />
                    <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">
                      No hay alumnos inscritos aún
                    </p>
                  </div>
                ) : (
                  alumnosModal.alumnos.map(a => (
                    <div key={a.id} className="flex items-center gap-3 p-3 rounded-2xl bg-white/[0.02] border border-white/5">
                      <div className="w-10 h-10 rounded-xl bg-sud-gradient p-px shrink-0">
                        <div className="w-full h-full rounded-[0.6rem] bg-black flex items-center justify-center overflow-hidden">
                          {a.profileImageUrl ? (
                            <img src={a.profileImageUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-sud-turquoise font-black text-base">
                              {a.nombre?.[0]?.toUpperCase() ?? 'A'}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-black text-white uppercase tracking-tight truncate">{a.nombre}</p>
                        <p className="text-[10px] text-slate-500 truncate">{a.email}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

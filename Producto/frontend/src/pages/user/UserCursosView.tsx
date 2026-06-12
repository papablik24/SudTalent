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
  Users,
  CheckCircle2,
  AlertCircle,
  Loader,
  UserPlus,
  UserMinus,
  ChevronRight,
} from 'lucide-react';
import { motion } from 'motion/react';
import { cursoService, CursoDTO } from '../../services/cursoService';
import { UserProfile } from '../../types';
import { CursoDetalle } from '../shared/CursoDetalle';

// ── Metadata visual ──────────────────────────────────────────────────
const CURSO_META: Record<string, { icono: React.ReactNode; color: string; colorBg: string }> = {
  'doblaje-presencial':  { icono: <Mic2 size={24} />,         color: 'text-sud-orange',    colorBg: 'bg-sud-orange/10 border-sud-orange/30' },
  'doblaje-online':      { icono: <Monitor size={24} />,       color: 'text-sky-400',       colorBg: 'bg-sky-400/10 border-sky-400/30' },
  'doblaje-musical':     { icono: <Music size={24} />,         color: 'text-pink-400',      colorBg: 'bg-pink-400/10 border-pink-400/30' },
  'locucion-presencial': { icono: <Mic2 size={24} />,         color: 'text-sud-yellow',    colorBg: 'bg-sud-yellow/10 border-sud-yellow/30' },
  'canto':               { icono: <Music size={24} />,         color: 'text-violet-400',    colorBg: 'bg-violet-400/10 border-violet-400/30' },
  'intensivo-360':       { icono: <Zap size={24} />,           color: 'text-sud-turquoise', colorBg: 'bg-sud-turquoise/10 border-sud-turquoise/30' },
  'doblaje-advance':     { icono: <GraduationCap size={24} />, color: 'text-emerald-400',   colorBg: 'bg-emerald-400/10 border-emerald-400/30' },
  'opening-lab':         { icono: <Video size={24} />,         color: 'text-red-400',       colorBg: 'bg-red-400/10 border-red-400/30' },
};

interface Props {
  user: UserProfile;
}

export function UserCursosView({ user }: Props) {
  const [cursos, setCursos] = useState<CursoDTO[]>([]);
  const [misCursos, setMisCursos] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [enrolling, setEnrolling] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [selectedCurso, setSelectedCurso] = useState<CursoDTO | null>(null);

  useEffect(() => {
    Promise.all([cursoService.getAll(), cursoService.getMisCursos()])
      .then(([todos, mios]) => {
        setCursos(todos);
        setMisCursos(new Set(mios.map(c => c.id)));
      })
      .catch(err => setError(err.message || 'Error al cargar cursos'))
      .finally(() => setLoading(false));
  }, []);

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const handleToggle = async (curso: CursoDTO) => {
    setEnrolling(curso.id);
    try {
      if (misCursos.has(curso.id)) {
        const updated = await cursoService.unenroll(curso.id);
        setCursos(prev => prev.map(c => (c.id === curso.id ? updated : c)));
        setMisCursos(prev => { const n = new Set(prev); n.delete(curso.id); return n; });
        showToast(`Te desinscribiste de "${curso.titulo}"`, true);
      } else {
        const updated = await cursoService.enroll(curso.id);
        setCursos(prev => prev.map(c => (c.id === curso.id ? updated : c)));
        setMisCursos(prev => new Set([...prev, curso.id]));
        showToast(`¡Inscrito en "${curso.titulo}"!`, true);
      }
    } catch (err: any) {
      showToast(err.message || 'Error al procesar inscripción', false);
    } finally {
      setEnrolling(null);
    }
  };

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
      </div>
    );
  }

  // Vista interior del curso seleccionado
  if (selectedCurso) {
    const updated = cursos.find(c => c.id === selectedCurso.id) ?? selectedCurso;
    return (
      <CursoDetalle
        curso={updated}
        userRole="USER"
        userId={(user as any).uid ?? (user as any).id ?? ''}
        onBack={() => setSelectedCurso(null)}
      />
    );
  }

  const inscritos = cursos.filter(c => misCursos.has(c.id));
  const disponibles = cursos.filter(c => !misCursos.has(c.id));  return (
    <div className="space-y-10">
      {/* Toast */}
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className={`fixed top-6 right-6 z-[9999] px-5 py-3 rounded-2xl text-sm font-black uppercase tracking-widest shadow-2xl ${
            toast.ok
              ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-400'
              : 'bg-red-500/20 border border-red-500/30 text-red-400'
          }`}
        >
          {toast.msg}
        </motion.div>
      )}

      {/* Header */}
      <header>
        <h2 className="text-3xl font-black tracking-tighter text-white">
          Mis{' '}
          <span className="sud-vibrant-text-gradient uppercase tracking-widest">Cursos</span>
        </h2>
        <p className="text-slate-400 mt-1 font-medium text-[10px] tracking-widest uppercase">
          Explora y enrólate en los cursos de Sudamerican Voices
        </p>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Disponibles',    value: cursos.length,    color: 'text-white',         bg: 'bg-white/5',         border: 'border-white/10' },
          { label: 'Inscrito en',    value: inscritos.length, color: 'text-emerald-400',   bg: 'bg-emerald-500/5',   border: 'border-emerald-500/20' },
          { label: 'Por explorar',   value: disponibles.length, color: 'text-sud-turquoise', bg: 'bg-sud-turquoise/5', border: 'border-sud-turquoise/20' },
        ].map(s => (
          <div key={s.label} className={`p-5 rounded-2xl border ${s.bg} ${s.border} text-center`}>
            <p className={`text-3xl font-black ${s.color}`}>{s.value}</p>
            <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Mis cursos inscritos */}
      {inscritos.length > 0 && (
        <section className="space-y-4">
          <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-500 flex items-center gap-2">
            <CheckCircle2 size={14} className="text-emerald-400" /> Mis Inscripciones
          </h3>
          {inscritos.map((curso, i) => (
            <CursoCard
              key={curso.id}
              curso={curso}
              enrolled
              enrolling={enrolling === curso.id}
              onToggle={handleToggle}
              onView={() => setSelectedCurso(curso)}
              delay={i * 0.04}
            />
          ))}
        </section>
      )}

      {/* Cursos disponibles */}
      <section className="space-y-4">
        <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-500 flex items-center gap-2">
          <BookOpen size={14} className="text-sud-turquoise" /> Cursos Disponibles
        </h3>
        {disponibles.length === 0 ? (
          <div className="py-16 text-center border-2 border-dashed border-white/5 rounded-[3rem]">
            <GraduationCap size={36} className="mx-auto text-slate-700 mb-4" />
            <p className="text-slate-500 font-black text-[10px] uppercase tracking-widest">
              Ya estás inscrito en todos los cursos disponibles
            </p>
          </div>
        ) : (
          disponibles.map((curso, i) => (
            <CursoCard
              key={curso.id}
              curso={curso}
              enrolled={false}
              enrolling={enrolling === curso.id}
              onToggle={handleToggle}
              onView={() => setSelectedCurso(curso)}
              delay={i * 0.04}
            />
          ))
        )}
      </section>
    </div>
  );
}

// ── Card de curso ────────────────────────────────────────────────────
function CursoCard({
  curso,
  enrolled,
  enrolling,
  onToggle,
  onView,
  delay,
}: {
  curso: CursoDTO;
  enrolled: boolean;
  enrolling: boolean;
  onToggle: (c: CursoDTO) => void;
  onView: () => void;
  delay: number;
}) {
  const meta = CURSO_META[curso.cursoKey] ?? {
    icono: <BookOpen size={24} />,
    color: 'text-slate-400',
    colorBg: 'bg-slate-400/10 border-slate-400/30',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className={`sud-glass-panel p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center gap-6 transition-all ${
        enrolled ? 'border-emerald-500/20' : 'hover:border-white/20'
      }`}
    >
      {/* Icono */}
      <div className={`w-14 h-14 rounded-2xl border flex items-center justify-center shrink-0 ${meta.colorBg} ${meta.color}`}>
        {meta.icono}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className={`text-base font-black uppercase tracking-tight transition-colors ${
            enrolled ? 'text-emerald-400' : 'text-white'
          }`}>
            {curso.titulo}
          </h3>
          <ModalidadBadge modalidad={curso.modalidad} />
          {enrolled && (
            <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Inscrito
            </span>
          )}
        </div>

        <p className="text-[10px] text-slate-500">{curso.descripcion}</p>

        <div className="flex items-center gap-4 flex-wrap">
          {curso.profesorNombre && (
            <span className="text-[10px] text-slate-400 flex items-center gap-1.5">
              <GraduationCap size={12} className="text-violet-400" />
              {curso.profesorNombre}
            </span>
          )}
          <span className="text-[10px] text-slate-600 flex items-center gap-1.5">
            <Users size={11} />
            {curso.totalAlumnos} inscrito{curso.totalAlumnos !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Botón inscripción + ver detalle */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={onView}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-white/10 bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-all"
        >
          Ver <ChevronRight size={13} />
        </button>
        <button
          onClick={() => onToggle(curso)}
          disabled={enrolling}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all disabled:opacity-50 ${
            enrolled
              ? 'bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20'
              : 'bg-sud-turquoise/10 border-sud-turquoise/20 text-sud-turquoise hover:bg-sud-turquoise/20'
          }`}
        >
          {enrolling ? (
            <Loader size={14} className="animate-spin" />
          ) : enrolled ? (
            <><UserMinus size={14} /> Desinscribirse</>
          ) : (
            <><UserPlus size={14} /> Inscribirse</>
          )}
        </button>
      </div>
    </motion.div>
  );
}

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

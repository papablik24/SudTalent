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
  AlertCircle,
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCurso, setSelectedCurso] = useState<CursoDTO | null>(null);

  useEffect(() => {
    cursoService.getMisCursos()
      .then(data => {
        setCursos(data || []);
      })
      .catch(err => setError(err.message || 'Error al cargar cursos'))
      .finally(() => setLoading(false));
  }, []);

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
        userId={user.uid}
        onBack={() => setSelectedCurso(null)}
      />
    );
  }

  return (
    <div className="space-y-10">
      {/* Header */}
      <header>
        <h2 className="text-3xl font-black tracking-tighter text-white">
          Mis{' '}
          <span className="sud-vibrant-text-gradient uppercase tracking-widest">Cursos</span>
        </h2>
        <p className="text-slate-400 mt-1 font-medium text-[10px] tracking-widest uppercase">
          Accede a tus clases oficiales y revisa anuncios y materiales
        </p>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 text-center md:text-left md:flex md:items-center md:justify-between">
          <div>
            <p className="text-3xl font-black text-emerald-400">{cursos.length}</p>
            <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mt-1">Cursos Asignados</p>
          </div>
          <div className="hidden md:block text-slate-500 text-xs font-medium">
            Clases oficiales asignadas por administración.
          </div>
        </div>
      </div>

      {/* Mis cursos asignados */}
      <section className="space-y-4">
        {cursos.length === 0 ? (
          <div className="py-16 text-center border-2 border-dashed border-white/5 rounded-[3rem]">
            <GraduationCap size={36} className="mx-auto text-slate-700 mb-4" />
            <p className="text-slate-500 font-black text-[10px] uppercase tracking-widest">
              No tienes cursos asignados aún
            </p>
            <p className="text-slate-600 text-xs mt-1">Contacta a la administración para que te asigne un curso oficial.</p>
          </div>
        ) : (
          cursos.map((curso, i) => (
            <CursoCard
              key={curso.id}
              curso={curso}
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
  onView,
  delay,
}: {
  curso: CursoDTO;
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
      onClick={onView}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onView();
        }
      }}
      role="button"
      tabIndex={0}
      className="sud-glass-panel p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center gap-6 transition-all hover:border-white/20 hover:bg-white/[0.02] active:scale-[0.99] cursor-pointer group/card outline-none focus-visible:ring-2 focus-visible:ring-sud-turquoise/50"
    >
      {/* Icono */}
      <div className={`w-14 h-14 rounded-2xl border flex items-center justify-center shrink-0 ${meta.colorBg} ${meta.color}`}>
        {meta.icono}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-base font-black uppercase tracking-tight text-white">
            {curso.titulo}
          </h3>
          <ModalidadBadge modalidad={curso.modalidad} />
        </div>

        <p className="text-[10px] text-slate-500">{curso.descripcion}</p>

        <div className="flex items-center gap-4 flex-wrap">
          {curso.profesorNombre && (
            <span className="text-[10px] text-slate-400 flex items-center gap-1.5">
              <GraduationCap size={12} className="text-violet-400" />
              Profesor: {curso.profesorNombre}
            </span>
          )}
          <span className="text-[10px] text-slate-600 flex items-center gap-1.5">
            <Users size={11} />
            {curso.totalAlumnos} alumno{curso.totalAlumnos !== 1 ? 's' : ''} inscrito{curso.totalAlumnos !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Botón ver detalle */}
      <div className="flex items-center gap-2 shrink-0 w-full md:w-auto mt-4 md:mt-0 justify-end">
        <div
          className="flex items-center justify-center gap-1.5 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest bg-sud-turquoise/10 border border-sud-turquoise/20 text-sud-turquoise group-hover/card:bg-sud-turquoise/20 transition-all w-full md:w-auto text-center select-none"
        >
          Entrar al Curso <ChevronRight size={13} />
        </div>
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

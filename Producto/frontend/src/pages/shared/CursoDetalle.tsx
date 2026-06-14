import { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Users,
  GraduationCap,
  Megaphone,
  BookOpen,
  Plus,
  Trash2,
  Pencil,
  Link2,
  Loader,
  AlertCircle,
  Monitor,
  MapPin,
  Send,
  X,
  Calendar,
  Clock,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CursoDTO } from '../../services/cursoService';
import { anuncioService, AnuncioDTO, CreateAnuncioRequest } from '../../services/anuncioService';
import { agendaService, AgendaEventoDTO } from '../../services/agendaService';

function formatAgendaDateTime(fechaStr: string, horaStr?: string): string {
  if (!fechaStr) return '';
  const parts = fechaStr.split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const meses = [
      'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
      'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
    ];
    const monthName = meses[month] || '';
    const formattedDate = `${day} de ${monthName} de ${year}`;
    if (horaStr) {
      return `${formattedDate} · ${horaStr} hrs`;
    }
    return formattedDate;
  }
  return `${fechaStr}${horaStr ? ` · ${horaStr} hrs` : ''}`;
}

// ── Tipos de usuario que pueden publicar ──────────────────────────
type UserRole = 'ADMIN' | 'PROFESOR' | 'USER';

interface Props {
  curso: CursoDTO;
  userRole: UserRole;
  userId: string;
  onBack: () => void;
}

const TIPO_LABELS: Record<string, { label: string; icon: React.ReactNode; color: string; bg: string }> = {
  ANUNCIO: { label: 'Anuncio', icon: <Megaphone size={14} />, color: 'text-sud-yellow', bg: 'bg-sud-yellow/10 border-sud-yellow/20' },
  CAPSULA: { label: 'Cápsula', icon: <BookOpen size={14} />,  color: 'text-sud-turquoise', bg: 'bg-sud-turquoise/10 border-sud-turquoise/20' },
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// ── Vista interior del curso ──────────────────────────────────────
export function CursoDetalle({ curso, userRole, userId, onBack }: Props) {
  const [anuncios, setAnuncios] = useState<AnuncioDTO[]>([]);
  const [agenda, setAgenda] = useState<AgendaEventoDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingAgenda, setLoadingAgenda] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal detail states
  const [selectedActivity, setSelectedActivity] = useState<AgendaEventoDTO | null>(null);
  const [selectedAnuncioDetail, setSelectedAnuncioDetail] = useState<AnuncioDTO | null>(null);

  // Form & Editing States
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<CreateAnuncioRequest>({
    tipo: 'ANUNCIO',
    titulo: '',
    contenido: '',
    urlRecurso: '',
  });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [editingAnuncio, setEditingAnuncio] = useState<AnuncioDTO | null>(null);
  const [deleteConfirmAnuncio, setDeleteConfirmAnuncio] = useState<AnuncioDTO | null>(null);

  const canPublish = userRole === 'ADMIN' || userRole === 'PROFESOR';

  useEffect(() => {
    anuncioService.getAnuncios(curso.id)
      .then(setAnuncios)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [curso.id]);

  useEffect(() => {
    setLoadingAgenda(true);
    agendaService.getAgendaByCurso(curso.id)
      .then(setAgenda)
      .catch(err => console.error("Error al cargar la agenda del curso:", err))
      .finally(() => setLoadingAgenda(false));
  }, [curso.id]);

  const handleStartEdit = (a: AnuncioDTO) => {
    setEditingAnuncio(a);
    setForm({
      tipo: a.tipo,
      titulo: a.titulo,
      contenido: a.contenido,
      urlRecurso: a.urlRecurso || '',
    });
    setFormError(null);
    setShowForm(true);
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditingAnuncio(null);
    setForm({ tipo: 'ANUNCIO', titulo: '', contenido: '', urlRecurso: '' });
    setFormError(null);
  };

  const handleSubmit = async () => {
    if (!form.titulo.trim()) { setFormError('El título es obligatorio'); return; }
    if (!form.contenido.trim()) { setFormError('El contenido es obligatorio'); return; }
    setSaving(true);
    setFormError(null);
    try {
      if (editingAnuncio) {
        const updated = await anuncioService.update(curso.id, editingAnuncio.id, {
          tipo: form.tipo,
          titulo: form.titulo.trim(),
          contenido: form.contenido.trim(),
          urlRecurso: form.urlRecurso?.trim() || undefined,
        });
        setAnuncios(prev => prev.map(x => x.id === updated.id ? updated : x));
        handleCancelForm();
      } else {
        const created = await anuncioService.create(curso.id, {
          tipo: form.tipo,
          titulo: form.titulo.trim(),
          contenido: form.contenido.trim(),
          urlRecurso: form.urlRecurso?.trim() || undefined,
        });
        setAnuncios(prev => [created, ...prev]);
        handleCancelForm();
      }
    } catch (err: any) {
      setFormError(err.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (a: AnuncioDTO) => {
    try {
      await anuncioService.delete(curso.id, a.id);
      setAnuncios(prev => prev.filter(x => x.id !== a.id));
    } catch (err: any) {
      setError(err.message || 'Error al eliminar');
    }
  };

  const modalidadIcon = curso.modalidad === 'ONLINE'
    ? <Monitor size={13} />
    : <MapPin size={13} />;

  return (
    <div className="space-y-8">
      {/* ── Cabecera ─────────────────────────────────────────────── */}
      <div className="flex items-start gap-4">
        <button
          onClick={onBack}
          className="mt-1 p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white transition-all shrink-0"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <h2 className="text-2xl md:text-3xl font-black tracking-tighter text-white">
            {curso.titulo}
          </h2>
          <div className="flex flex-wrap items-center gap-3 mt-2">
            <span className={`inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg border ${
              curso.modalidad === 'ONLINE'
                ? 'bg-sky-400/10 text-sky-400 border-sky-400/20'
                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
            }`}>
              {modalidadIcon} {curso.modalidad}
            </span>
            {curso.profesorNombre && (
              <span className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg border bg-violet-500/10 text-violet-400 border-violet-500/20">
                <GraduationCap size={13} /> {curso.profesorNombre}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg border bg-white/5 text-slate-400 border-white/10">
              <Users size={13} /> {curso.totalAlumnos} alumno{curso.totalAlumnos !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </div>

      {/* ── Info del curso ────────────────────────────────────────── */}
      <div className="sud-glass-panel p-6 md:p-8 space-y-6">
        <div>
          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mb-3">Descripción</h3>
          <p className="text-slate-300 text-sm leading-relaxed">{curso.descripcion}</p>
        </div>

        {/* Grid de stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-2 border-t border-white/5">
          <div className="space-y-1">
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-600">Modalidad</p>
            <p className="text-sm font-black text-white">{curso.modalidad}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-600">Alumnos inscritos</p>
            <p className="text-sm font-black text-white">{curso.totalAlumnos}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-600">Publicaciones</p>
            <p className="text-sm font-black text-white">{anuncios.length}</p>
          </div>
        </div>

        {/* Lista de alumnos */}
        <div className="pt-2 border-t border-white/5">
          <div className="flex flex-col gap-1 mb-3">
            <p className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-600">
              Alumnos ({curso.alumnos.length})
            </p>
            <p className="text-[10px] text-slate-500">
              Los alumnos se asignan desde Gestión Alumnos.
            </p>
          </div>
          {curso.alumnos.length > 0 ? (
            <div className="space-y-2">
              {curso.alumnos.map(a => (
                <div key={a.id} className="flex items-center gap-3 p-3 rounded-2xl bg-white/[0.02] border border-white/5">
                  {/* Avatar */}
                  <div className="w-9 h-9 rounded-xl bg-sud-gradient p-px shrink-0">
                    <div className="w-full h-full rounded-[0.6rem] bg-black flex items-center justify-center overflow-hidden">
                      {a.profileImageUrl ? (
                        <img src={a.profileImageUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-[10px] font-black text-sud-turquoise">
                          {a.nombre?.[0]?.toUpperCase() ?? 'A'}
                        </span>
                      )}
                    </div>
                  </div>
                  {/* Nombre completo y email */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-white uppercase tracking-tight truncate">
                      {a.nombre}
                    </p>
                    {a.email && (
                      <p className="text-[10px] text-slate-500 truncate">{a.email}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-500 text-xs italic py-2">Sin alumnos inscritos.</p>
          )}
        </div>
      </div>

      {/* ── Próximas actividades ────────────────────────── */}
      {userRole === 'USER' && (
        <section className="space-y-4">
          <h3 className="text-lg font-black text-white uppercase tracking-tight flex items-center gap-2">
            <Calendar size={18} className="text-violet-400" /> Próximas Actividades
          </h3>
          {loadingAgenda ? (
            <div className="flex justify-center py-6">
              <div className="w-6 h-6 border-3 border-violet-400/20 border-t-violet-400 rounded-full animate-spin" />
            </div>
          ) : agenda.length === 0 ? (
            <div className="py-10 text-center border border-dashed border-white/5 rounded-[2rem] bg-white/[0.005]">
              <Calendar size={28} className="mx-auto text-slate-700 mb-3" />
              <p className="text-slate-400 font-bold text-xs">
                No hay actividades agendadas para este curso.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {agenda.map((evt) => (
                <div
                  key={evt.id}
                  onClick={() => setSelectedActivity(evt)}
                  className="sud-glass-panel p-5 border-white/5 hover:border-white/20 hover:shadow-[0_0_20px_rgba(255,255,255,0.02)] transition-all space-y-3 cursor-pointer hover:scale-[1.01] active:scale-[0.99]"
                >
                  <div>
                    <h4 className="text-sm font-black text-white uppercase tracking-tight">{evt.titulo}</h4>
                    {evt.descripcion && (
                      <p className="text-xs text-slate-400 mt-1 whitespace-pre-wrap leading-relaxed line-clamp-2">{evt.descripcion}</p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/5 text-[10px] text-slate-500 font-bold uppercase tracking-widest pl-1">
                    <span className="flex items-center gap-1.5 text-slate-300">
                      <Calendar size={12} className="text-violet-400" />
                      {formatAgendaDateTime(evt.fecha, evt.hora)}
                    </span>

                    {evt.link && (
                      <a
                        href={evt.link.startsWith('http') ? evt.link : `https://${evt.link}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sud-turquoise/5 border border-sud-turquoise/20 text-sud-turquoise hover:bg-sud-turquoise/15 transition-all text-[9px]"
                      >
                        <Link2 size={12} /> Ir a reunión / recurso
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ── Tablón de anuncios y cápsulas ────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-black text-white uppercase tracking-tight flex items-center gap-2">
            <Megaphone size={18} className="text-sud-orange" /> Tablón del Curso
          </h3>
          {canPublish && (
            <button
              onClick={() => {
                if (showForm) {
                  handleCancelForm();
                } else {
                  setShowForm(true);
                }
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest bg-sud-orange/10 border border-sud-orange/20 text-sud-orange hover:bg-sud-orange/20 transition-all"
            >
              {showForm ? <X size={14} /> : <Plus size={14} />}
              {showForm ? (editingAnuncio ? 'Cancelar Edición' : 'Cancelar') : 'Publicar'}
            </button>
          )}
        </div>

        {/* ── Form de publicación ─────────────────────────────────── */}
        <AnimatePresence>
          {showForm && canPublish && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="sud-glass-panel p-6 space-y-4"
            >
              <div className="flex gap-3">
                {(['ANUNCIO', 'CAPSULA'] as const).map(t => {
                  const meta = TIPO_LABELS[t];
                  return (
                    <button
                      key={t}
                      onClick={() => setForm(f => ({ ...f, tipo: t }))}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                        form.tipo === t
                          ? `${meta.bg} ${meta.color}`
                          : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
                      }`}
                    >
                      {meta.icon} {meta.label}
                    </button>
                  );
                })}
              </div>

              {formError && (
                <p className="text-red-400 text-xs font-bold flex items-center gap-2">
                  <AlertCircle size={13} /> {formError}
                </p>
              )}

              <input
                type="text"
                placeholder="Título del anuncio o cápsula..."
                value={form.titulo}
                onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
                className="sud-input w-full"
              />

              <textarea
                placeholder={form.tipo === 'CAPSULA'
                  ? 'Describe la cápsula educativa...'
                  : 'Escribe tu anuncio aquí...'}
                value={form.contenido}
                onChange={e => setForm(f => ({ ...f, contenido: e.target.value }))}
                rows={4}
                className="sud-input w-full resize-none"
              />

              {form.tipo === 'CAPSULA' && (
                <div className="relative">
                  <Link2 size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" />
                  <input
                    type="url"
                    placeholder="URL del recurso (video, PDF, audio...)"
                    value={form.urlRecurso}
                    onChange={e => setForm(f => ({ ...f, urlRecurso: e.target.value }))}
                    className="sud-input w-full pl-11"
                  />
                </div>
              )}

              <div className="flex justify-end">
                <button
                  onClick={handleSubmit}
                  disabled={saving}
                  className="sud-btn-primary px-6 py-3 text-xs font-black uppercase tracking-widest flex items-center gap-2 disabled:opacity-50"
                >
                  {saving ? <Loader size={14} className="animate-spin" /> : <Send size={14} />}
                  {saving ? (editingAnuncio ? 'Guardando...' : 'Publicando...') : (editingAnuncio ? 'Guardar Cambios' : 'Publicar')}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Lista de anuncios ─────────────────────────────────────── */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-sud-orange/20 border-t-sud-orange rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="p-6 text-center border border-red-500/20 rounded-3xl bg-red-500/5">
            <AlertCircle size={24} className="mx-auto text-red-400 mb-2" />
            <p className="text-red-400 text-sm font-bold">{error}</p>
          </div>
        ) : anuncios.length === 0 ? (
          <div className="py-16 text-center border-2 border-dashed border-white/5 rounded-[3rem]">
            <Megaphone size={36} className="mx-auto text-slate-700 mb-4" />
            <p className="text-slate-300 font-bold text-sm">
              Este curso aún no tiene anuncios ni recursos publicados.
            </p>
            {canPublish && (
              <p className="text-slate-500 text-xs mt-2">
                Usa Publicar para compartir información con los alumnos inscritos.
              </p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {anuncios.map((a, i) => {
              const meta = TIPO_LABELS[a.tipo] ?? TIPO_LABELS['ANUNCIO'];
              const isOwn = a.autorId === userId;
              return (
                <motion.div
                  key={a.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  onClick={() => setSelectedAnuncioDetail(a)}
                  className="sud-glass-panel p-6 space-y-3 cursor-pointer hover:border-white/20 hover:shadow-[0_0_20px_rgba(255,255,255,0.02)] transition-all hover:scale-[1.01] active:scale-[0.99]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      {/* Avatar autor */}
                      <div className="w-9 h-9 rounded-xl bg-sud-gradient p-px shrink-0">
                        <div className="w-full h-full rounded-[0.6rem] bg-black flex items-center justify-center overflow-hidden">
                          {a.autorImageUrl ? (
                            <img src={a.autorImageUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-[10px] font-black text-violet-400">
                              {a.autorNombre?.[0]?.toUpperCase() ?? 'P'}
                            </span>
                          )}
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                          {a.autorNombre}
                        </p>
                        <p className="text-[9px] text-slate-600 font-mono">{formatDate(a.createdAt)}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`inline-flex items-center gap-1.5 text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-lg border ${meta.bg} ${meta.color}`}>
                        {meta.icon} {meta.label}
                      </span>
                      {(canPublish && isOwn) || userRole === 'ADMIN' ? (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleStartEdit(a); }}
                            className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-all"
                          >
                            <Pencil size={12} />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setDeleteConfirmAnuncio(a); }}
                            className="p-1.5 rounded-lg bg-red-500/5 border border-red-500/10 text-red-400/50 hover:text-red-400 hover:bg-red-500/10 transition-all"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-base font-black text-white uppercase tracking-tight">{a.titulo}</h4>
                    <p className="text-slate-400 text-sm leading-relaxed mt-1 whitespace-pre-wrap line-clamp-3">{a.contenido}</p>
                  </div>

                  {a.urlRecurso && (
                    <a
                      href={a.urlRecurso}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-sud-turquoise hover:text-sud-turquoise/80 transition-colors border border-sud-turquoise/20 bg-sud-turquoise/5 px-3 py-2 rounded-xl"
                    >
                      <Link2 size={12} /> Ver recurso
                    </a>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Modal de Confirmación de Eliminación ─────────────────── */}
      <AnimatePresence>
        {deleteConfirmAnuncio && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="sud-glass-panel max-w-sm w-full p-6 space-y-6 text-center border border-white/10"
            >
              <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center mx-auto animate-pulse">
                <Trash2 size={24} />
              </div>
              <div className="space-y-2">
                <h4 className="text-lg font-black text-white uppercase tracking-tight">¿Eliminar esta publicación?</h4>
                <p className="text-slate-400 text-xs leading-relaxed">Esta acción no se puede deshacer.</p>
              </div>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => setDeleteConfirmAnuncio(null)}
                  className="px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest bg-white/5 border border-white/10 text-slate-400 hover:bg-white/10 transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={async () => {
                    const toDelete = deleteConfirmAnuncio;
                    setDeleteConfirmAnuncio(null);
                    await handleDelete(toDelete);
                  }}
                  className="px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30 transition-all"
                >
                  Eliminar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Modal Detalle de Actividad ─────────────────── */}
      <AnimatePresence>
        {selectedActivity && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative max-w-lg w-full bg-[#0f0f0f] border border-white/10 rounded-[2rem] p-6 md:p-8 space-y-6 shadow-2xl"
            >
              <button
                type="button"
                onClick={() => setSelectedActivity(null)}
                className="absolute right-5 top-5 p-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-white transition-all cursor-pointer"
              >
                <X size={16} />
              </button>

              <div className="space-y-4">
                <div className="space-y-2">
                  <span className="inline-flex items-center text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded bg-sud-orange/15 text-sud-orange border border-sud-orange/20">
                    Actividad Programada
                  </span>
                  <h4 className="text-xl font-black text-white uppercase tracking-tight leading-snug">{selectedActivity.titulo}</h4>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-[10px] text-slate-400 font-bold uppercase tracking-widest py-2 border-y border-white/5">
                  <span className="flex items-center gap-1.5 text-slate-300">
                    <Calendar size={13} className="text-violet-400" />
                    {formatAgendaDateTime(selectedActivity.fecha, selectedActivity.hora)}
                  </span>
                  {curso.titulo && (
                    <span className="flex items-center gap-1.5 text-slate-300">
                      <GraduationCap size={13} className="text-sud-turquoise" />
                      {curso.titulo}
                    </span>
                  )}
                </div>

                {selectedActivity.descripcion ? (
                  <div className="space-y-1">
                    <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Descripción</h5>
                    <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">{selectedActivity.descripcion}</p>
                  </div>
                ) : (
                  <p className="text-slate-500 text-xs italic">Sin descripción adicional.</p>
                )}

                {selectedActivity.link && (
                  <div className="pt-4 border-t border-white/5 flex justify-end">
                    <a
                      href={selectedActivity.link.startsWith('http') ? selectedActivity.link : `https://${selectedActivity.link}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-[1.8rem] bg-gradient-to-r from-sud-yellow via-sud-orange to-sud-turquoise text-black font-black uppercase tracking-widest text-[10px] transition-all hover:scale-[1.02]"
                    >
                      <Link2 size={14} /> Abrir enlace
                    </a>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Modal Detalle de Publicación ─────────────────── */}
      <AnimatePresence>
        {selectedAnuncioDetail && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative max-w-lg w-full bg-[#0f0f0f] border border-white/10 rounded-[2rem] p-6 md:p-8 space-y-6 shadow-2xl"
            >
              <button
                type="button"
                onClick={() => setSelectedAnuncioDetail(null)}
                className="absolute right-5 top-5 p-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-white transition-all cursor-pointer"
              >
                <X size={16} />
              </button>

              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  {/* Avatar autor */}
                  <div className="w-9 h-9 rounded-xl bg-sud-gradient p-px shrink-0">
                    <div className="w-full h-full rounded-[0.6rem] bg-black flex items-center justify-center overflow-hidden">
                      {selectedAnuncioDetail.autorImageUrl ? (
                        <img src={selectedAnuncioDetail.autorImageUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-[10px] font-black text-violet-400">
                          {selectedAnuncioDetail.autorNombre?.[0]?.toUpperCase() ?? 'P'}
                        </span>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      {selectedAnuncioDetail.autorNombre}
                    </p>
                    <p className="text-[9px] text-slate-600 font-mono">{formatDate(selectedAnuncioDetail.createdAt)}</p>
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <span className={`text-[7px] font-black uppercase tracking-widest px-2 py-0.5 rounded border ${
                    selectedAnuncioDetail.tipo === 'CAPSULA' 
                      ? 'bg-violet-500/10 text-violet-400 border-violet-500/20' 
                      : 'bg-sud-orange/10 text-sud-orange border-sud-orange/20'
                  }`}>
                    {selectedAnuncioDetail.tipo === 'CAPSULA' ? 'Material / Cápsula' : 'Anuncio'}
                  </span>
                  <h4 className="text-xl font-black text-white uppercase tracking-tight leading-snug">{selectedAnuncioDetail.titulo}</h4>
                </div>

                <div className="space-y-1">
                  <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Contenido</h5>
                  <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">{selectedAnuncioDetail.contenido}</p>
                </div>

                {selectedAnuncioDetail.urlRecurso && (
                  <div className="pt-4 border-t border-white/5 flex justify-end">
                    <a
                      href={selectedAnuncioDetail.urlRecurso.startsWith('http') ? selectedAnuncioDetail.urlRecurso : `https://${selectedAnuncioDetail.urlRecurso}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-[1.8rem] bg-gradient-to-r from-sud-yellow via-sud-orange to-sud-turquoise text-black font-black uppercase tracking-widest text-[10px] transition-all hover:scale-[1.02]"
                    >
                      <Link2 size={14} /> Ver recurso
                    </a>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

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
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CursoDTO } from '../../services/cursoService';
import { anuncioService, AnuncioDTO, CreateAnuncioRequest } from '../../services/anuncioService';

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
          <div className="space-y-4">
            {anuncios.map((a, i) => {
              const meta = TIPO_LABELS[a.tipo] ?? TIPO_LABELS['ANUNCIO'];
              const isOwn = a.autorId === userId;
              return (
                <motion.div
                  key={a.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="sud-glass-panel p-6 space-y-3"
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
                            onClick={() => handleStartEdit(a)}
                            className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-all"
                          >
                            <Pencil size={12} />
                          </button>
                          <button
                            onClick={() => setDeleteConfirmAnuncio(a)}
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
                    <p className="text-slate-400 text-sm leading-relaxed mt-1 whitespace-pre-wrap">{a.contenido}</p>
                  </div>

                  {a.urlRecurso && (
                    <a
                      href={a.urlRecurso}
                      target="_blank"
                      rel="noopener noreferrer"
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
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Upload, AudioLines, Film, X, ChevronDown, Loader, Link2, ExternalLink, Save, AlertCircle } from 'lucide-react';
import { UserProfile, VoiceDemo, DemoCategory, VisualGenre, MediaType, FileFormat, VISUAL_GENRES, DEMO_CATEGORIES } from '../../types';
import { DemoItem } from '../../components/ui/DemoItem';
import { AudioDropZone } from '../../components/ui/AudioDropZone';
import { demoService, DemoDTO } from '../../services/demoService';
import { postulacionService, Postulacion } from '../../services/postulacionService';
import { fetchAPI } from '../../services/backendService';

const MAX_DEMOS = 3;

function detectFormat(file: File): { mediaType: MediaType; fileFormat: FileFormat } | null {
  const name = file.name.toLowerCase();
  const mime = file.type.toLowerCase();
  if (name.endsWith('.mp3') || mime.includes('mpeg')) return { mediaType: 'AUDIO', fileFormat: 'MP3' };
  if (name.endsWith('.wav') || mime.includes('wav'))  return { mediaType: 'AUDIO', fileFormat: 'WAV' };
  return null;
}

// ─── Form state type ─────────────────────────────────────────────────
interface DemoForm {
  title: string;
  category: DemoCategory;
  visualGenre: VisualGenre | '';
  description: string;
  file: File | null;
  mediaType: MediaType | null;
  fileFormat: FileFormat | null;
}

const DEFAULT_FORM: DemoForm = {
  title: '',
  category: 'Doblaje',
  visualGenre: '',
  description: '',
  file: null,
  mediaType: null,
  fileFormat: null,
};

export function UserDemosView({ user }: { user: UserProfile }) {
  const [demos, setDemos] = useState<VoiceDemo[]>([]);
  const [userPostulaciones, setUserPostulaciones] = useState<Postulacion[]>([]);
  const [confirmDeleteDemo, setConfirmDeleteDemo] = useState<{ id: string; count: number } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoadingDemos, setIsLoadingDemos] = useState(true);
  const [form, setForm] = useState<DemoForm>(DEFAULT_FORM);
  const [fileError, setFileError] = useState<string | null>(null);

  // Edit states
  const [editingDemo, setEditingDemo] = useState<VoiceDemo | null>(null);
  const [editForm, setEditForm] = useState<{
    title: string;
    category: DemoCategory;
    visualGenre: VisualGenre | '';
    description: string;
  }>({
    title: '',
    category: 'Doblaje',
    visualGenre: '',
    description: '',
  });

  // ── Link externo ────────────────────────────────────────────────────
  const [externalLink, setExternalLink] = useState('');
  const [externalLinkSaved, setExternalLinkSaved] = useState('');
  const [savingLink, setSavingLink] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);

  // ── Cargar demos desde backend ──────────────────────────────────────
  useEffect(() => {
    const loadDemos = async () => {
      try {
        setIsLoadingDemos(true);
        const token = localStorage.getItem('sud_jwt_token');

        if (!token) {
          console.warn('No hay token para cargar demos');
          setIsLoadingDemos(false);
          return;
        }

        const [demoData, postData] = await Promise.all([
          demoService.getUserDemos(token),
          postulacionService.getPostulacionesByUser(user.uid)
        ]);
        
        // Cargar link externo desde perfil del usuario autenticado
        try {
          const profile = await fetchAPI<any>(`/profile`);
          if (profile?.profileAudioUrl) {
            setExternalLink(profile.profileAudioUrl);
            setExternalLinkSaved(profile.profileAudioUrl);
          }
        } catch { /* no forzar error por esto */ }
        
        // Convertir DemoDTO a VoiceDemo para compatibilidad con DemoItem
        const mappedDemos = demoData.map((demo: DemoDTO) => {
          // Normalizar mediaType: el backend puede devolver 'audio/mpeg', 'video/mp4', etc.
          const rawType = (demo.mediaType || '').toLowerCase();
          const normalizedType: MediaType = rawType.includes('video') ? 'VIDEO' : 'AUDIO';

          return {
            id: demo.id,
            userId: user.uid,
            title: demo.title,
            category: (demo.demoCategory || demo.category) as DemoCategory || 'Doblaje',
            fileUrl: demo.fileUrl,
            duration: demo.durationSeconds
              ? `${Math.floor(demo.durationSeconds / 60)}:${String(demo.durationSeconds % 60).padStart(2, '0')}`
              : '—',
            createdAt: demo.createdAt,
            mediaType: normalizedType,
            fileFormat: demo.fileFormat as FileFormat | undefined,
            visualGenre: demo.visualGenre as VisualGenre | undefined,
            description: demo.description || undefined,
          };
        });

        setDemos(mappedDemos);
        setUserPostulaciones(postData || []);
        console.log('✅ Demos cargadas:', mappedDemos.length);
        console.log('✅ Postulaciones cargadas:', (postData || []).length);
      } catch (error) {
        console.error('❌ Error cargando demos:', error);
      } finally {
        setIsLoadingDemos(false);
      }
    };

    loadDemos();
  }, [user.uid]);

  // ── File picker handler ─────────────────────────────────────────────
  // ── File selected via AudioDropZone ────────────────────────────────
  const handleFileSelected = (file: File) => {
    setFileError(null);
    const detected = detectFormat(file);
    if (!detected) {
      setFileError('Formato no permitido. Sube un archivo MP3 o WAV.');
      setForm(f => ({ ...f, file: null, mediaType: null, fileFormat: null }));
      return;
    }
    if (file.size / (1024 * 1024) > 10) {
      setFileError('El archivo supera el límite de 10 MB. Sube un audio más liviano o usa un enlace externo.');
      setForm(f => ({ ...f, file: null, mediaType: null, fileFormat: null }));
      return;
    }
    setForm(f => ({ ...f, file, mediaType: detected.mediaType, fileFormat: detected.fileFormat }));
  };

  // ── Guardar link externo ────────────────────────────────────────────
  const handleSaveLink = async () => {
    setLinkError(null);
    if (externalLink && !/^https?:\/\/.+/.test(externalLink)) {
      setLinkError('Ingresa una URL válida (debe comenzar con https://)');
      return;
    }
    setSavingLink(true);
    try {
      // Usar /profile (autenticado como el usuario actual) en lugar de /users/{id} (solo admin)
      await fetchAPI(`/profile`, {
        method: 'PUT',
        body: JSON.stringify({ profileAudioUrl: externalLink.trim() }),
      });
      setExternalLinkSaved(externalLink.trim());
    } catch (err: any) {
      setLinkError(err.message || 'Error al guardar el enlace');
    } finally {
      setSavingLink(false);
    }
  };

  // ── Submit ──────────────────────────────────────────────────────────
  const handleUploadDemo = async (e: React.FormEvent) => {
    e.preventDefault();

    // Límite de 3 demos
    if (demos.length >= MAX_DEMOS) {
      setFileError('Ya alcanzaste el límite de 3 demos de audio. Elimina una demo existente o usa un enlace externo.');
      return;
    }

    if (!form.file) {
      setFileError('Selecciona un archivo de audio antes de confirmar la carga.');
      return;
    }

    if (!form.title.trim()) {
      setFileError('Ingresa un título para la demo.');
      return;
    }

    try {
      setIsUploading(true);
      setFileError(null);

      const token = localStorage.getItem('sud_jwt_token');
      if (!token) {
        throw new Error('No hay sesión activa. Inicia sesión de nuevo');
      }

      console.log('📤 Subiendo demo:', form.file.name);

      // Subir mediante backend
      const result = await demoService.uploadDemo(
        form.file,
        form.category,
        form.title,
        token,
        form.visualGenre || undefined
      );

      // Añadir a la lista
      const newDemo: VoiceDemo = {
        id: result.id,
        userId: user.uid,
        title: result.title,
        category: (result.demoCategory || form.category) as DemoCategory,
        fileUrl: result.fileUrl,
        duration: result.durationSeconds ? `${Math.floor(result.durationSeconds / 60)}:${String(result.durationSeconds % 60).padStart(2, '0')}` : '—',
        createdAt: result.createdAt,
        mediaType: result.mediaType as MediaType,
        fileFormat: result.fileFormat as FileFormat | undefined,
        visualGenre: form.visualGenre || undefined,
        description: form.description || undefined,
      };

      setDemos(prev => [newDemo, ...prev]);
      console.log('✅ Demo subida exitosamente');

      // Reset form
      setForm(DEFAULT_FORM);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido al subir demo';
      let cleanErrorMessage = errorMessage;
      const lowerErr = errorMessage.toLowerCase();
      if (
        lowerErr.includes('413') || 
        lowerErr.includes('too large') || 
        lowerErr.includes('size') || 
        lowerErr.includes('multipart') || 
        lowerErr.includes('supabase') || 
        lowerErr.includes('storage') ||
        lowerErr.includes('exceeded') ||
        lowerErr.includes('limit')
      ) {
        cleanErrorMessage = 'No se pudo subir la demo. Revisa que el archivo pese menos de 10 MB e inténtalo nuevamente.';
      }
      setFileError(cleanErrorMessage);
      console.error('❌ Error:', errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  // ── Delete demo ─────────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    const associatedPosts = userPostulaciones.filter(p => p.voiceAudioId === id && !p.deletedAt && p.estado !== 'CANCELADA' && !p.convocatoriaDeleted);
    if (associatedPosts.length > 0) {
      setConfirmDeleteDemo({ id, count: associatedPosts.length });
      return;
    }

    if (!confirm('¿Estás seguro de que deseas eliminar esta demo?')) {
      return;
    }

    await executeDelete(id);
  };

  const executeDelete = async (id: string) => {
    try {
      const token = localStorage.getItem('sud_jwt_token');
      if (!token) {
        throw new Error('No hay sesión activa');
      }

      console.log('🗑️ Eliminando demo:', id);
      await demoService.deleteDemo(id, token);

      setDemos(prev => prev.filter(d => d.id !== id));
      console.log('✅ Demo eliminada exitosamente');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error al eliminar demo';
      setFileError(errorMessage);
      console.error('❌ Error:', errorMessage);
    }
  };

  const handleStartEdit = (demo: VoiceDemo) => {
    setEditingDemo(demo);
    setEditForm({
      title: demo.title,
      category: demo.category,
      visualGenre: demo.visualGenre || '',
      description: demo.description || '',
    });
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDemo || !editForm.title) return;

    try {
      const token = localStorage.getItem('sud_jwt_token');
      if (!token) throw new Error('No hay sesión activa');

      console.log('📝 Guardando cambios en demo:', editingDemo.id, editForm);

      const result = await demoService.updateDemo(editingDemo.id, {
        title: editForm.title,
        category: editForm.category,
        visualGenre: editForm.visualGenre || undefined,
        description: editForm.description || undefined,
      }, token);

      // Actualizar estado local
      setDemos(prev => prev.map(d => d.id === editingDemo.id ? {
        ...d,
        title: result.title,
        category: (result.demoCategory || result.category) as DemoCategory,
        visualGenre: result.visualGenre as VisualGenre | undefined,
        description: result.description || undefined,
      } : d));

      setEditingDemo(null);
    } catch (error) {
      console.error('❌ Error guardando edición:', error);
      alert(error instanceof Error ? error.message : 'Error al guardar cambios');
    }
  };

  // ── Derived stats ────────────────────────────────────────────────────
  const isAudioDemo = (d: VoiceDemo) =>
    !d.mediaType ||
    d.mediaType === 'AUDIO' ||
    (d.mediaType as string).toLowerCase().includes('audio');

  const isVideoDemo = (d: VoiceDemo) =>
    d.mediaType === 'VIDEO' ||
    (d.mediaType as string).toLowerCase().includes('video');

  const audioCount = demos.filter(isAudioDemo).length;
  const videoCount = demos.filter(isVideoDemo).length;

  // ── Render ───────────────────────────────────────────────────────────
  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-8 px-4">
        <div>
          <h2 className="text-3xl font-black tracking-tighter text-white">
            Mis <span className="sud-vibrant-text-gradient uppercase tracking-widest">Demos</span>
          </h2>
          <p className="text-slate-400 mt-2 font-medium text-xs tracking-widest uppercase">
            Gestiona tus muestras de voz y video profesionales
          </p>
        </div>
        {/* Quick stats */}
        <div className="flex gap-4 shrink-0">
          <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-sud-orange/10 border border-sud-orange/20">
            <AudioLines size={14} className="text-sud-orange" />
            <span className="text-[10px] font-black uppercase tracking-widest text-sud-orange">{audioCount} Audio</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-sud-turquoise/10 border border-sud-turquoise/20">
            <Film size={14} className="text-sud-turquoise" />
            <span className="text-[10px] font-black uppercase tracking-widest text-sud-turquoise">{videoCount} Video</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* ── Upload Panel ──────────────────────────────────────────── */}
        <div className="lg:col-span-4 space-y-6">
          <section className="bg-white/[0.03] border border-white/10 rounded-[2.5rem] p-8 shadow-2xl space-y-6 sticky top-8">
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-black uppercase tracking-tight text-white flex items-center gap-2">
                <Plus className="text-sud-turquoise" size={20} />
                Añadir Nueva Demo
              </h4>
              <div className="flex flex-col items-end gap-1">
                {/* Contador */}
                <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl border ${
                  demos.length >= MAX_DEMOS
                    ? 'bg-red-500/10 border-red-500/20 text-red-400'
                    : 'bg-white/5 border-white/10 text-slate-400'
                }`}>
                  {demos.length}/{MAX_DEMOS} audio disponibles
                </span>
                <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">
                  Límite 10 MB c/u
                </span>
              </div>
            </div>

            {/* Aviso límite alcanzado */}
            {demos.length >= MAX_DEMOS && (
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3">
                <AlertCircle size={16} className="text-amber-400 shrink-0 mt-0.5" />
                <p className="text-[10px] text-amber-400 font-black uppercase tracking-widest leading-relaxed">
                  Ya alcanzaste el límite de 3 demos de audio. Elimina una demo existente o usa un enlace externo.
                </p>
              </div>
            )}

            {/* Format info banner */}
            <div className="p-4 bg-white/[0.02] border border-white/10 rounded-2xl space-y-3">
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Formatos permitidos · máximo 10 MB</p>
              <div className="flex flex-wrap gap-2">
                {['MP3', 'WAV'].map(f => (
                  <span key={f} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sud-orange/10 border border-sud-orange/20 text-[9px] font-black uppercase text-sud-orange">
                    <AudioLines size={10} /> {f}
                  </span>
                ))}
                {['MP4', 'MOV'].map(f => (
                  <span key={f} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sud-turquoise/10 border border-sud-turquoise/20 text-[9px] font-black uppercase text-sud-turquoise">
                    <Film size={10} /> {f}
                  </span>
                ))}
              </div>
            </div>

            <form onSubmit={handleUploadDemo} className="space-y-5">
              {/* File dropzone */}
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold text-slate-500 px-1 tracking-widest">
                  Archivo de Demo *
                </label>
                <AudioDropZone
                  file={form.file}
                  isUploading={isUploading}
                  disabled={demos.length >= MAX_DEMOS}
                  error={fileError}
                  onFileSelected={handleFileSelected}
                  onClear={() => setForm(f => ({ ...f, file: null, mediaType: null, fileFormat: null }))}
                  hint="MP3 o WAV · máximo 10 MB"
                />
              </div>

              {/* Title */}
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold text-slate-500 px-1 tracking-widest">
                  Título de la Demo *
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  className="sud-input w-full"
                  placeholder="Ej: Personaje Anime – Batalla"
                  required
                />
              </div>

              {/* Category */}
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold text-slate-500 px-1 tracking-widest">
                  Categoría Principal
                </label>
                <div className="relative">
                  <select
                    value={form.category}
                    onChange={e => setForm({ ...form, category: e.target.value as DemoCategory })}
                    className="sud-input w-full appearance-none pr-10"
                  >
                    {DEMO_CATEGORIES.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                </div>
              </div>

              {/* Visual Genre */}
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold text-slate-500 px-1 tracking-widest">
                  Género Visual / Tipo de Escena
                </label>
                <div className="relative">
                  <select
                    value={form.visualGenre}
                    onChange={e => setForm({ ...form, visualGenre: e.target.value as VisualGenre | '' })}
                    className="sud-input w-full appearance-none pr-10"
                  >
                    <option value="">— Sin clasificar —</option>
                    {VISUAL_GENRES.map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                </div>
              </div>

              {/* Description (optional) */}
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold text-slate-500 px-1 tracking-widest">
                  Descripción <span className="text-slate-700">(opcional)</span>
                </label>
                <textarea
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  className="sud-input w-full h-20 py-3 resize-none"
                  placeholder="Breve descripción de la demo..."
                />
              </div>

              <button
                type="submit"
                disabled={isUploading || demos.length >= MAX_DEMOS}
                className="w-full sud-btn-primary py-5 text-sm shadow-xl shadow-sud-orange/10 transition-all hover:scale-[1.02] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                {isUploading ? (
                  <div className="flex items-center justify-center gap-2">
                    <Loader size={16} className="animate-spin" />
                    <span>Subiendo...</span>
                  </div>
                ) : (
                  <>
                    <Upload size={16} />
                    Confirmar Carga
                  </>
                )}
              </button>
            </form>

            {/* ── Cajón: Enlace externo ───────────────────────── */}
            <div className="pt-6 border-t border-white/10 space-y-4">
              <div>
                <h5 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
                  <Link2 size={13} className="text-sud-turquoise" />
                  Enlace a Carpeta Externa
                </h5>
                <p className="text-[9px] text-slate-600 mt-1 uppercase tracking-widest">
                  Drive, Dropbox, YouTube, etc.
                </p>
              </div>

              {linkError && (
                <p className="text-[10px] text-red-400 font-bold flex items-center gap-1.5">
                  <AlertCircle size={12} /> {linkError}
                </p>
              )}

              <div className="flex gap-2">
                <input
                  type="url"
                  value={externalLink}
                  onChange={e => { setExternalLink(e.target.value); setLinkError(null); }}
                  placeholder="https://drive.google.com/..."
                  className="sud-input flex-1 text-sm"
                />
                <button
                  onClick={handleSaveLink}
                  disabled={savingLink || externalLink === externalLinkSaved}
                  className="px-4 py-3 rounded-2xl bg-sud-turquoise/10 border border-sud-turquoise/20 text-sud-turquoise hover:bg-sud-turquoise/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                  title="Guardar enlace"
                >
                  {savingLink ? <Loader size={16} className="animate-spin" /> : <Save size={16} />}
                </button>
              </div>

              {externalLinkSaved && (
                <a
                  href={externalLinkSaved}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-sud-turquoise hover:text-sud-turquoise/80 transition-colors"
                >
                  <ExternalLink size={12} /> Ver enlace guardado
                </a>
              )}
            </div>
          </section>
        </div>

        {/* ── Demo List ────────────────────────────────────────────── */}
        <div className="lg:col-span-8 space-y-6">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-xl font-black uppercase tracking-tighter text-white">
              Lista de Demos{' '}
              <span className="text-slate-700 ml-2 font-mono text-sm">({demos.length})</span>
            </h3>
          </div>

          {isLoadingDemos ? (
            <div className="p-16 text-center bg-white/[0.02] rounded-[3rem] border border-dashed border-white/10">
              <Loader className="w-8 h-8 animate-spin mx-auto text-sud-orange mb-4" />
              <p className="text-slate-500 text-sm font-bold uppercase tracking-widest">Cargando demos...</p>
            </div>
          ) : demos.length === 0 ? (
            <div className="p-16 text-center bg-white/[0.02] rounded-[3rem] border border-dashed border-white/10">
              <div className="flex items-center justify-center gap-4 mb-6 mx-auto">
                <AudioLines className="text-white/10" size={36} />
                <Film className="text-white/10" size={36} />
              </div>
              <p className="text-slate-500 text-sm font-bold uppercase tracking-widest">Aún no has cargado demos</p>
              <p className="text-[10px] text-slate-600 uppercase tracking-widest mt-2">
                Usa el panel lateral para subir audio (MP3, WAV) o video (MP4, MOV)
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {demos.map(demo => {
                const associatedPosts = userPostulaciones.filter(p => p.voiceAudioId === demo.id && !p.deletedAt && p.estado !== 'CANCELADA' && !p.convocatoriaDeleted);
                return (
                  <motion.div
                    key={demo.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    <DemoItem 
                      demo={demo} 
                      onDelete={handleDelete} 
                      onEdit={handleStartEdit}
                      postulacionesAsociadas={associatedPosts}
                    />
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Delete Confirmation Modal ────────────────────────────── */}
      <AnimatePresence>
        {confirmDeleteDemo && (
          <div className="fixed inset-0 z-55 flex items-center justify-center p-4 backdrop-blur-md bg-black/60" onClick={() => setConfirmDeleteDemo(null)}>
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="sud-glass-panel w-full max-w-md p-8 relative space-y-6"
              onClick={e => e.stopPropagation()}
            >
              <button onClick={() => setConfirmDeleteDemo(null)} className="absolute top-6 right-6 text-slate-500 hover:text-white"><X size={22} /></button>

              <div className="space-y-2">
                <h3 className="text-xl font-black text-white uppercase tracking-tight">Confirmar Eliminación</h3>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Atención requerida</p>
              </div>
              
              <p className="text-sm text-slate-300 leading-relaxed font-medium">
                ¿Estás seguro? Esta demo está siendo usada en <strong className="text-sud-orange">{confirmDeleteDemo.count} postulación{confirmDeleteDemo.count === 1 ? '' : 'es'}</strong>. Si la eliminas, esas postulaciones podrían quedar sin demo asociada.
              </p>

              <div className="flex flex-col sm:flex-row justify-end gap-3 pt-2">
                <button
                  onClick={() => setConfirmDeleteDemo(null)}
                  className="px-5 py-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-black uppercase tracking-widest text-slate-300 transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    executeDelete(confirmDeleteDemo.id);
                    setConfirmDeleteDemo(null);
                  }}
                  className="px-5 py-3 rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-xs font-black uppercase tracking-widest text-red-400 transition-all cursor-pointer"
                >
                  Eliminar de todas formas
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Edit Demo Modal ────────────────────────────────────────── */}
      <AnimatePresence>
        {editingDemo && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md bg-black/60" onClick={() => setEditingDemo(null)}>
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="sud-glass-panel w-full max-w-md p-8 relative space-y-6"
              onClick={e => e.stopPropagation()}
            >
              <button onClick={() => setEditingDemo(null)} className="absolute top-6 right-6 text-slate-500 hover:text-white"><X size={22} /></button>
              
              <div className="space-y-2">
                <h3 className="text-2xl font-black text-white uppercase tracking-tight">Editar Demo</h3>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Modificar metadatos de la demo</p>
              </div>
              
              <form onSubmit={handleSaveEdit} className="space-y-5">
                {/* Title */}
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-bold text-slate-500 px-1 tracking-widest">
                    Título de la Demo *
                  </label>
                  <input
                    type="text"
                    value={editForm.title}
                    onChange={e => setEditForm({ ...editForm, title: e.target.value })}
                    className="sud-input w-full"
                    placeholder="Ej: Personaje Anime – Batalla"
                    required
                  />
                </div>

                {/* Category */}
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-bold text-slate-500 px-1 tracking-widest">
                    Categoría Principal
                  </label>
                  <div className="relative">
                    <select
                      value={editForm.category}
                      onChange={e => setEditForm({ ...editForm, category: e.target.value as DemoCategory })}
                      className="sud-input w-full appearance-none pr-10"
                    >
                      {DEMO_CATEGORIES.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                  </div>
                </div>

                {/* Visual Genre */}
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-bold text-slate-500 px-1 tracking-widest">
                    Género Visual / Tipo de Escena
                  </label>
                  <div className="relative">
                    <select
                      value={editForm.visualGenre}
                      onChange={e => setEditForm({ ...editForm, visualGenre: e.target.value as VisualGenre | '' })}
                      className="sud-input w-full appearance-none pr-10"
                    >
                      <option value="">— Sin clasificar —</option>
                      {VISUAL_GENRES.map(g => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-bold text-slate-500 px-1 tracking-widest">
                    Descripción <span className="text-slate-700">(opcional)</span>
                  </label>
                  <textarea
                    value={editForm.description}
                    onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                    className="sud-input w-full h-24 py-3 resize-none"
                    placeholder="Breve descripción de la demo..."
                  />
                </div>

                <div className="flex gap-4 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingDemo(null)}
                    className="flex-1 px-5 py-3.5 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-black uppercase tracking-widest text-slate-300 transition-all cursor-pointer text-center"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-5 py-3.5 rounded-2xl sud-btn-primary text-xs font-black uppercase tracking-widest transition-all cursor-pointer text-center"
                  >
                    Guardar
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Upload, AudioLines, Film, X, ChevronDown, Loader } from 'lucide-react';
import { UserProfile, VoiceDemo, DemoCategory, VisualGenre, MediaType, FileFormat, VISUAL_GENRES, DEMO_CATEGORIES } from '../../types';
import { DemoItem } from '../../components/ui/DemoItem';
import { AudioDropZone } from '../../components/ui/AudioDropZone';
import { demoService, DemoDTO } from '../../services/demoService';

// ─── Allowed formats ────────────────────────────────────────────────
const AUDIO_FORMATS = ['MP3', 'WAV'] as const;
const ACCEPT_STRING = '.mp3,.wav,audio/mpeg,audio/wav';

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
  const [isUploading, setIsUploading] = useState(false);
  const [isLoadingDemos, setIsLoadingDemos] = useState(true);
  const [form, setForm] = useState<DemoForm>(DEFAULT_FORM);
  const [fileError, setFileError] = useState<string | null>(null);

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

        const demoData = await demoService.getUserDemos(token);
        
        // Convertir DemoDTO a VoiceDemo para compatibilidad con DemoItem
        const mappedDemos = demoData.map((demo: DemoDTO) => ({
          id: demo.id,
          userId: user.uid,
          title: demo.title,
          category: demo.category as DemoCategory || 'Doblaje',
          fileUrl: demo.fileUrl,
          duration: demo.durationSeconds ? `${Math.floor(demo.durationSeconds / 60)}:${String(demo.durationSeconds % 60).padStart(2, '0')}` : '—',
          createdAt: demo.createdAt,
          mediaType: demo.mediaType as MediaType,
          fileFormat: demo.fileFormat as FileFormat | undefined,
        }));

        setDemos(mappedDemos);
        console.log('✅ Demos cargadas:', mappedDemos.length);
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
      setFileError('Formato no permitido. Usa MP3 o WAV.');
      setForm(f => ({ ...f, file: null, mediaType: null, fileFormat: null }));
      return;
    }
    setForm(f => ({ ...f, file, mediaType: detected.mediaType, fileFormat: detected.fileFormat }));
  };

  // ── Submit ──────────────────────────────────────────────────────────
  const handleUploadDemo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.file) return;

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
        token
      );

      // Añadir a la lista
      const newDemo: VoiceDemo = {
        id: result.id,
        userId: user.uid,
        title: result.title,
        category: form.category,
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
      setFileError(errorMessage);
      console.error('❌ Error:', errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  // ── Delete demo ─────────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar esta demo?')) {
      return;
    }

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

  // ── Derived stats ────────────────────────────────────────────────────
  const audioCount = demos.filter(d => !d.mediaType || d.mediaType === 'AUDIO').length;
  const videoCount = demos.filter(d => d.mediaType === 'VIDEO').length;

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
            <h4 className="text-lg font-black uppercase tracking-tight text-white flex items-center gap-2">
              <Plus className="text-sud-turquoise" size={20} />
              Añadir Nueva Demo
            </h4>

            {/* Format info banner */}
            <div className="p-4 bg-white/[0.02] border border-white/10 rounded-2xl space-y-3">
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Formatos permitidos</p>
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
                  error={fileError}
                  onFileSelected={handleFileSelected}
                  onClear={() => setForm(f => ({ ...f, file: null, mediaType: null, fileFormat: null }))}
                  hint="MP3 o WAV · Máximo 10MB"
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
                disabled={isUploading || !form.title || !form.file}
                className="w-full sud-btn-primary py-5 text-sm shadow-xl shadow-sud-orange/10 transition-all hover:scale-[1.02]"
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
              {demos.map(demo => (
                <motion.div
                  key={demo.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <DemoItem demo={demo} onDelete={handleDelete} />
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

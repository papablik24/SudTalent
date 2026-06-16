import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Calendar, Search, ChevronDown, Clock, AlertCircle, Briefcase, ArrowRight, X, AudioLines, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfile } from '../../types';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { AudioPlayer } from '../../components/ui/AudioPlayer';
import { fetchAPI } from '../../services/backendService';
import { convocatoriaService } from '../../services/convocatoriaService';
import {
  postulacionService,
  Postulacion,
  PostulacionEstado,
  POSTULACION_ESTADOS,
} from '../../services/postulacionService';

export function UserPostulacionesView({ user }: { user: UserProfile }) {
  const navigate = useNavigate();
  const [postulaciones, setPostulaciones] = useState<Postulacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Edit state
  const [editingPost, setEditingPost] = useState<Postulacion | null>(null);
  const [editMensaje, setEditMensaje] = useState('');
  const [userDemos, setUserDemos] = useState<any[]>([]);
  const [selectedDemoId, setSelectedDemoId] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [postToCancelId, setPostToCancelId] = useState<string | null>(null);

  // Detail state
  const [selectedPost, setSelectedPost] = useState<Postulacion | null>(null);
  const [selectedConv, setSelectedConv] = useState<any | null>(null);
  const [loadingConvDetail, setLoadingConvDetail] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEstado, setFilterEstado] = useState<PostulacionEstado | 'TODAS'>('TODAS');

  // ── Load data ────────────────────────────────────────────────────────
  useEffect(() => {
    loadData();
  }, [user.uid]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [posts, audios] = await Promise.all([
        postulacionService.getPostulacionesByUser(user.uid),
        fetchAPI<any[]>(`/voice-audios/user/${user.uid}?category=demo`),
      ]);
      setPostulaciones(posts);
      setUserDemos(audios || []);
    } catch (err: any) {
      setError(err.message || 'Error al cargar historial.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = (id: string) => {
    setPostToCancelId(id);
  };

  const confirmCancel = async () => {
    if (!postToCancelId) return;
    try {
      await postulacionService.updatePostulacion(postToCancelId, { estado: 'CANCELADA' });
      setPostulaciones(prev => prev.map(p => p.id === postToCancelId ? { ...p, estado: 'CANCELADA' as any } : p));
    } catch (err: any) {
      alert(err.message || 'Error al cancelar la postulación.');
    } finally {
      setPostToCancelId(null);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingPost) return;
    setSaving(true);
    try {
      const payload: { mensaje: string; voiceAudioId?: string } = {
        mensaje: editMensaje,
      };
      
      // Permitir cambiar la demo si la postulación está PENDIENTE o EN_REVISION
      if ((editingPost.estado === 'PENDIENTE' || editingPost.estado === 'EN_REVISION') && selectedDemoId) {
        payload.voiceAudioId = selectedDemoId;
      }

      const updated = await postulacionService.updatePostulacion(editingPost.id, payload);
      setPostulaciones(prev => prev.map(p => p.id === editingPost.id ? { 
        ...p, 
        mensaje: updated.mensaje,
        voiceAudioId: updated.voiceAudioId,
        voiceAudioTitle: updated.voiceAudioTitle,
        voiceAudioUrl: updated.voiceAudioUrl,
      } : p));
      setEditingPost(null);
    } catch (err: any) {
      alert(err.message || 'Error al guardar cambios.');
    } finally {
      setSaving(false);
    }
  };

  const handleSelectPost = async (post: Postulacion) => {
    setSelectedPost(post);
    setLoadingConvDetail(true);
    try {
      const conv = await convocatoriaService.getConvocatoriaById(post.convocatoriaId);
      setSelectedConv(conv);
    } catch (err) {
      console.error('Error al cargar detalle de convocatoria:', err);
      setSelectedConv(null);
    } finally {
      setLoadingConvDetail(false);
    }
  };

  // ── Filtered & sorted ────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let result = [...postulaciones];
    if (filterEstado !== 'TODAS') result = result.filter(p => p.estado === filterEstado);
    if (searchTerm) {
      const low = searchTerm.toLowerCase();
      result = result.filter(p =>
        (p.convocatoriaTitulo || '').toLowerCase().includes(low) ||
        (p.convocatoriaCategoria || '').toLowerCase().includes(low)
      );
    }
    // Sort by newest first
    result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return result;
  }, [postulaciones, filterEstado, searchTerm]);

  // ── Stats ────────────────────────────────────────────────────────────
  const stats = useMemo(() => ({
    total: postulaciones.length,
    pendientes: postulaciones.filter(p => p.estado === 'PENDIENTE').length,
    enRevision: postulaciones.filter(p => p.estado === 'EN_REVISION').length,
    aceptadas: postulaciones.filter(p => p.estado === 'ACEPTADA').length,
    rechazadas: postulaciones.filter(p => p.estado === 'RECHAZADA').length,
  }), [postulaciones]);

  // ── Loading ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-10 h-10 border-4 border-sud-orange/20 border-t-sud-orange rounded-full animate-spin" />
      </div>
    );
  }

  if (error && postulaciones.length === 0) {
    return (
      <div className="p-12 text-center border border-red-500/20 rounded-[2rem] bg-red-500/5">
        <AlertCircle size={32} className="mx-auto text-red-400 mb-4" />
        <p className="text-red-400 font-bold text-sm">{error}</p>
        <button onClick={loadData} className="mt-4 text-[10px] text-red-400 underline uppercase tracking-widest font-bold">Reintentar</button>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* Header */}
      <header>
        <h2 className="text-3xl font-black tracking-tighter text-white">Mis <span className="sud-vibrant-text-gradient uppercase tracking-widest">Postulaciones</span></h2>
        <p className="text-slate-500 mt-1 font-bold text-[10px] tracking-[0.3em] uppercase">Historial y seguimiento de tus postulaciones</p>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {[
          { label: 'Total', value: stats.total, color: 'text-white light:text-slate-800', bg: 'bg-white/5 light:bg-slate-200', border: 'border-white/10 light:border-slate-400' },
          { label: 'Pendientes', value: stats.pendientes, color: 'text-amber-400 light:text-amber-700', bg: 'bg-amber-500/5 light:bg-amber-100', border: 'border-amber-500/20 light:border-amber-300' },
          { label: 'En Revisión', value: stats.enRevision, color: 'text-sky-400 light:text-sky-700', bg: 'bg-sky-500/5 light:bg-sky-100', border: 'border-sky-500/20 light:border-sky-300' },
          { label: 'Aceptadas', value: stats.aceptadas, color: 'text-emerald-400 light:text-emerald-700', bg: 'bg-emerald-500/5 light:bg-emerald-100', border: 'border-emerald-500/20 light:border-emerald-300' },
          { label: 'Rechazadas', value: stats.rechazadas, color: 'text-red-400 light:text-red-700', bg: 'bg-red-500/5 light:bg-red-100', border: 'border-red-500/20 light:border-red-300' },
        ].map(stat => (
          <div key={stat.label} className={`p-5 rounded-2xl border ${stat.bg} ${stat.border} text-center`}>
            <p className={`text-3xl font-black ${stat.color}`}>{stat.value}</p>
            <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Buscar por convocatoria..."
            className="sud-input w-full pl-11"
          />
        </div>
        <div className="relative w-full sm:w-auto">
          <select
            value={filterEstado}
            onChange={e => setFilterEstado(e.target.value as any)}
            className="sud-input appearance-none pr-10 w-full sm:min-w-[200px]"
          >
            <option value="TODAS">Todos los estados</option>
            {POSTULACION_ESTADOS.map(e => <option key={e} value={e}>{e.replace('_', ' ')}</option>)}
          </select>
          <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
        </div>
      </div>

      {/* List */}
      <div className="space-y-4">
        {filtered.map((post, i) => (
          <motion.div
            key={post.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            onClick={() => handleSelectPost(post)}
            className="sud-glass-panel p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 group hover:border-white/20 transition-all cursor-pointer"
          >
            <div className="flex items-start gap-5 flex-1">
              <div className="w-12 h-12 rounded-2xl bg-sud-gradient p-[1px] shrink-0">
                <div className="w-full h-full rounded-[0.9rem] bg-black flex items-center justify-center">
                  <Briefcase size={20} className="text-sud-turquoise" />
                </div>
              </div>

              <div className="space-y-2 flex-1 min-w-0">
                <h4 className="text-lg font-black text-white uppercase tracking-tight truncate group-hover:text-sud-turquoise transition-colors">
                  {post.convocatoriaTitulo || 'Convocatoria'}
                </h4>
                <div className="flex items-center gap-4 flex-wrap">
                  {post.convocatoriaCategoria && (
                    <span className="text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-md bg-sud-orange/10 text-sud-orange border border-sud-orange/20">
                      {post.convocatoriaCategoria}
                    </span>
                  )}
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-600 font-bold uppercase tracking-widest">
                    <Calendar size={12} />
                    {new Date(post.createdAt).toLocaleDateString()}
                  </div>
                  {post.voiceAudioTitle && (
                    <div className="flex items-center gap-1.5 text-[10px] text-sud-turquoise font-bold uppercase tracking-widest min-w-0 max-w-full">
                      <AudioLines size={12} className="shrink-0" />
                      <span className="truncate max-w-[150px] sm:max-w-[250px]" title={post.voiceAudioTitle}>Demo: {post.voiceAudioTitle}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between md:justify-end gap-4 w-full md:w-auto shrink-0 border-t border-white/5 md:border-t-0 pt-4 md:pt-0">
              <div className="flex items-center gap-3">
                <StatusBadge status={post.estado} size="md" />
              </div>
              
              <div className="flex flex-wrap items-center gap-2">
                {(post.estado === 'PENDIENTE' || post.estado === 'EN_REVISION') && (
                  <>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingPost(post);
                        setEditMensaje(post.mensaje || '');
                        setSelectedDemoId(post.voiceAudioId || '');
                      }}
                      className="px-4 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-[10px] font-black uppercase tracking-widest text-slate-300 transition-all cursor-pointer"
                    >
                      Editar
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCancel(post.id);
                      }}
                      className="px-4 py-2 rounded-xl border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 text-[10px] font-black uppercase tracking-widest text-red-400 transition-all cursor-pointer"
                    >
                      Cancelar
                    </button>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        ))}

        {filtered.length === 0 && (
          <div className="py-24 text-center border-2 border-dashed border-white/5 rounded-[3rem] bg-white/[0.01]">
            <FileText size={48} className="mx-auto text-white/5 mb-6" />
            <p className="text-slate-500 font-black uppercase tracking-[0.3em] text-[10px]">
              {postulaciones.length === 0 ? 'No tienes postulaciones registradas' : 'No se encontraron postulaciones con los filtros aplicados'}
            </p>
            {postulaciones.length === 0 && (
              <p className="text-slate-600 text-[10px] uppercase tracking-widest mt-3">
                Visita la sección de Oportunidades para postular a convocatorias
              </p>
            )}
          </div>
        )}
      </div>

      {/* ── Edit Modal ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {editingPost && (
          <div className="fixed inset-y-0 right-0 left-0 md:left-72 z-50 flex items-center justify-center p-4 md:p-6 backdrop-blur-md bg-black/60" onClick={() => setEditingPost(null)}>
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="sud-glass-panel w-full max-w-lg p-6 md:p-10 relative overflow-y-auto max-h-[90vh] space-y-6"
              onClick={e => e.stopPropagation()}
            >
              <button onClick={() => setEditingPost(null)} className="absolute top-6 right-6 text-slate-500 hover:text-white"><X size={22} /></button>
              
              <div className="space-y-2">
                <h3 className="text-2xl font-black text-white uppercase tracking-tight">Editar Postulación</h3>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                  {editingPost.convocatoriaTitulo}
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold text-slate-500 px-1 tracking-widest">Mensaje / Presentación</label>
                <textarea 
                  value={editMensaje}
                  onChange={e => setEditMensaje(e.target.value)}
                  className="sud-input w-full h-32 py-4 resize-none"
                  placeholder="Escribe un mensaje presentándote o indicando tus detalles..."
                />
              </div>

              {(editingPost.estado === 'PENDIENTE' || editingPost.estado === 'EN_REVISION') && (
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-bold text-slate-500 px-1 tracking-widest">Cambiar Demo de Voz</label>
                  {userDemos.length > 0 ? (
                    <div className="relative">
                      <select
                        value={selectedDemoId}
                        onChange={e => setSelectedDemoId(e.target.value)}
                        className="sud-input w-full appearance-none pr-10"
                      >
                        {userDemos.map(demo => (
                          <option key={demo.id} value={demo.id}>{demo.title} ({demo.category || 'Demo'})</option>
                        ))}
                      </select>
                      <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                    </div>
                  ) : (
                    <div className="p-4 bg-red-500/5 border border-red-500/20 rounded-2xl flex items-center gap-2 text-red-400 text-xs font-bold uppercase tracking-widest">
                      <AlertCircle size={16} />
                      <span>Debes subir una demo antes de postular.</span>
                    </div>
                  )}
                </div>
              )}

              <button 
                onClick={handleSaveEdit}
                disabled={saving || ((editingPost.estado === 'PENDIENTE' || editingPost.estado === 'EN_REVISION') && userDemos.length === 0)}
                className="w-full h-14 rounded-2xl flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest sud-btn-primary hover:scale-[1.02] transition-all disabled:opacity-50 disabled:pointer-events-none"
              >
                {saving ? (
                  <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                ) : (
                  <>Guardar Cambios</>
                )}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Detail Modal ────────────────────────────────────────────── */}
      <AnimatePresence>
        {selectedPost && (
          <div className="fixed inset-y-0 right-0 left-0 md:left-72 z-50 flex items-center justify-center p-4 md:p-6 backdrop-blur-md bg-black/60" onClick={() => setSelectedPost(null)}>
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="sud-glass-panel w-full max-w-2xl p-6 md:p-10 relative overflow-y-auto max-h-[90vh] md:max-h-[85vh] space-y-6"
              onClick={e => e.stopPropagation()}
            >
              <button onClick={() => setSelectedPost(null)} className="absolute top-6 right-6 text-slate-500 hover:text-white"><X size={22} /></button>
              
              <div className="space-y-4">
                <div className="flex items-center gap-3 flex-wrap">
                  <StatusBadge status={selectedPost.estado} size="md" />
                  {selectedPost.convocatoriaCategoria && (
                    <span className="text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg bg-sud-orange/10 text-sud-orange border border-sud-orange/20">
                      {selectedPost.convocatoriaCategoria}
                    </span>
                  )}
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                    <Calendar size={12} />
                    Postulado el: {new Date(selectedPost.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <h3 className="text-3xl font-black text-white uppercase tracking-tight">{selectedPost.convocatoriaTitulo || 'Convocatoria'}</h3>
              </div>

              {/* Descripción de la Convocatoria */}
              <div className="space-y-2 border-t border-white/5 pt-4">
                <h4 className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">Descripción del Casting</h4>
                {loadingConvDetail ? (
                  <div className="flex items-center gap-2 text-xs text-slate-400 py-2">
                    <div className="w-4 h-4 border-2 border-sud-orange/20 border-t-sud-orange rounded-full animate-spin" />
                    <span>Cargando detalles...</span>
                  </div>
                ) : (
                  <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">{selectedConv?.descripcion || 'Descripción no disponible.'}</p>
                )}
              </div>

              {/* Mensaje enviado */}
              {selectedPost.mensaje && (
                <div className="space-y-2 border-t border-white/5 pt-4">
                  <h4 className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">Tu Mensaje de Presentación</h4>
                  <p className="text-sm text-slate-300 leading-relaxed italic bg-white/[0.01] p-4 border border-white/5 rounded-2xl">
                    "{selectedPost.mensaje}"
                  </p>
                </div>
              )}

              {/* Demo Asociada */}
              <div className="space-y-3 border-t border-white/5 pt-4">
                <h4 className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">Demo de Voz Enviada</h4>
                {selectedPost.voiceAudioId ? (
                  <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl space-y-3">
                    {selectedPost.voiceAudioUrl && (
                      <AudioPlayer
                        src={selectedPost.voiceAudioUrl}
                        title={selectedPost.voiceAudioTitle || 'Demo de voz'}
                        showVolume
                      />
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 italic">No se asoció ninguna demo de voz a esta postulación.</p>
                )}
              </div>

              {/* Botones de acción dentro del modal de detalle */}
              {(selectedPost.estado === 'PENDIENTE' || selectedPost.estado === 'EN_REVISION') && (
                <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-white/10">
                  {/* Cancelar */}
                  <button 
                    onClick={() => {
                      handleCancel(selectedPost.id);
                      setSelectedPost(null);
                    }}
                    className="flex-1 px-6 py-4 rounded-2xl border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 text-xs font-black uppercase tracking-widest text-red-400 transition-all cursor-pointer text-center"
                  >
                    Cancelar Postulación
                  </button>

                  {/* Editar */}
                  <button 
                    onClick={() => {
                      setEditingPost(selectedPost);
                      setEditMensaje(selectedPost.mensaje || '');
                      setSelectedDemoId(selectedPost.voiceAudioId || '');
                      setSelectedPost(null);
                    }}
                    className="flex-1 px-6 py-4 rounded-2xl sud-btn-primary text-xs font-black uppercase tracking-widest transition-all cursor-pointer text-center flex items-center justify-center gap-2"
                  >
                    Editar Mensaje / Demo <Sparkles size={14} />
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Custom Cancel Confirmation Modal ───────────────────────── */}
      <AnimatePresence>
        {postToCancelId && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-6 backdrop-blur-md bg-black/60" onClick={() => setPostToCancelId(null)}>
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="sud-glass-panel w-full max-w-md p-10 relative overflow-hidden text-center space-y-6"
              onClick={e => e.stopPropagation()}
            >
              <button onClick={() => setPostToCancelId(null)} className="absolute top-6 right-6 text-slate-500 hover:text-white"><X size={22} /></button>
              
              <div className="w-16 h-16 mx-auto rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-500">
                <AlertCircle size={32} />
              </div>

              <div className="space-y-2">
                <h3 className="text-2xl font-black text-white uppercase tracking-tight">¿Cancelar Postulación?</h3>
                <p className="text-sm text-slate-400 leading-relaxed">¿Estás seguro de que deseas cancelar esta postulación? Esta acción no se puede deshacer.</p>
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={() => setPostToCancelId(null)}
                  className="flex-1 h-12 rounded-xl border border-white/10 hover:bg-white/5 text-xs font-black uppercase tracking-widest text-slate-400 transition-all"
                >
                  No, mantener
                </button>
                <button 
                  onClick={confirmCancel}
                  className="flex-1 h-12 rounded-xl bg-red-500 text-black hover:bg-red-600 text-xs font-black uppercase tracking-widest transition-all"
                >
                  Sí, cancelar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

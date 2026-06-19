import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Briefcase, Calendar, Sparkles, CheckCircle2, Search, ChevronDown, Clock, X, FileText, AlertCircle, Heart } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfile } from '../../types';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { fetchAPI } from '../../services/backendService';
import {
  convocatoriaService,
  Convocatoria,
  ConvocatoriaCategoria,
  GeneroVisual,
  CONVOCATORIA_CATEGORIAS,
  GENEROS_VISUALES,
} from '../../services/convocatoriaService';
import {
  postulacionService,
  Postulacion,
} from '../../services/postulacionService';


const formatFecha = (fechaStr: string) => {
  if (!fechaStr) return '';
  const parts = fechaStr.split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    return new Date(year, month, day).toLocaleDateString();
  }
  return new Date(fechaStr).toLocaleDateString();
};

const daysRemaining = (deadline: string | undefined) => {
  if (!deadline) return 0;
  const parts = deadline.split('-');
  if (parts.length !== 3) return 0;
  const target = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  return diff > 0 ? diff : 0;
};

export function ConvocatoriasUser({ user }: { user: UserProfile }) {
  const navigate = useNavigate();
  const [convocatorias, setConvocatorias] = useState<Convocatoria[]>([]);
  const [myPostulaciones, setMyPostulaciones] = useState<Record<string, Postulacion>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNoDemosModal, setShowNoDemosModal] = useState(false);
  const [applyingConv, setApplyingConv] = useState<Convocatoria | null>(null);
  const [userDemos, setUserDemos] = useState<any[]>([]);
  const [selectedDemoId, setSelectedDemoId] = useState<string>('');
  const [showDemoSelectorModal, setShowDemoSelectorModal] = useState(false);
  const [editingPostulacion, setEditingPostulacion] = useState<Postulacion | null>(null);
  const [loadingEditId, setLoadingEditId] = useState<string | null>(null);

  // Favorites state
  const [favoritasIds, setFavoritasIds] = useState<string[]>([]);
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);
  const [favoriteToast, setFavoriteToast] = useState<string | null>(null);

  const showFavoriteFeedback = (message: string) => {
    setFavoriteToast(message);
    setTimeout(() => {
      setFavoriteToast(null);
    }, 3000);
  };

  const handleToggleFavorite = async (convocatoriaId: string) => {
    const isFav = favoritasIds.includes(convocatoriaId);
    
    if (!isFav) {
      const conv = convocatorias.find(c => c.id === convocatoriaId);
      if (conv) {
        if (daysRemaining(conv.fechaLimite) <= 0) {
          setError('No puedes guardar una convocatoria con plazo vencido.');
          setTimeout(() => setError(null), 5000);
          return;
        }

        const post = myPostulaciones[convocatoriaId];
        if (post && post.estado === 'RECHAZADA') {
          setError('No puedes guardar como favorita una convocatoria con postulación rechazada.');
          setTimeout(() => setError(null), 5000);
          return;
        }
      }
    }

    try {
      if (isFav) {
        await convocatoriaService.quitarFavorita(convocatoriaId);
        setFavoritasIds(prev => prev.filter(id => id !== convocatoriaId));
        showFavoriteFeedback('Convocatoria quitada de favoritos');
      } else {
        await convocatoriaService.marcarFavorita(convocatoriaId);
        setFavoritasIds(prev => [...prev, convocatoriaId]);
        showFavoriteFeedback('Convocatoria agregada a favoritos');
      }
    } catch (err: any) {
      setError(err.message || 'Error al actualizar favorita.');
      setTimeout(() => setError(null), 5000);
    }
  };

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategoria, setFilterCategoria] = useState<ConvocatoriaCategoria | 'TODAS'>('TODAS');
  const [filterGenero, setFilterGenero] = useState<GeneroVisual | 'TODOS'>('TODOS');
  // Sorting
  const [sortBy, setSortBy] = useState<'RECENT' | 'DEADLINE_CLOSE' | 'DEADLINE_FAR' | 'TITLE_AZ'>('RECENT');

  // Detail modal
  const [selectedConv, setSelectedConv] = useState<Convocatoria | null>(null);


  // Constantes seguras para evitar errores runtime con null / undefined / TDZ
  const selectedConvEstado = selectedConv?.estado || '';
  const selectedConvCategoria = selectedConv?.categoria || '';
  const selectedConvGenero = selectedConv?.generoVisual;
  const selectedConvTitulo = selectedConv?.titulo || '';
  const selectedConvDescripcion = selectedConv?.descripcion || '';
  const selectedConvRequisitos = selectedConv?.requisitos || [];
  const selectedConvFechaLimite = selectedConv?.fechaLimite || '';
  const selectedPostulacion = selectedConv && myPostulaciones[selectedConv.id]?.estado !== 'CANCELADA' ? myPostulaciones[selectedConv.id] : undefined;

  // Applying state
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [applySuccess, setApplySuccess] = useState<string | null>(null);
  const [postToCancel, setPostToCancel] = useState<{ id: string; convocatoriaId: string } | null>(null);

  const handleCancel = (id: string, convocatoriaId: string) => {
    setPostToCancel({ id, convocatoriaId });
  };

  const handleEditPostulacion = async (post: Postulacion, conv: Convocatoria) => {
    setLoadingEditId(post.id);
    try {
      const audios = await fetchAPI<any[]>(`/voice-audios/user/${user.uid}?category=demo`);
      if (!audios || audios.length === 0) {
        setShowNoDemosModal(true);
        return;
      }
      setUserDemos(audios);
      setApplyingConv(conv);
      setEditingPostulacion(post);
      const matchedDemoId = post?.voiceAudioId || (audios.length > 0 ? audios[0].id : '');
      setSelectedDemoId(matchedDemoId);
      setShowDemoSelectorModal(true);
      setSelectedConv(null);
    } catch (err: any) {
      setError(err.message || 'Error al cargar demos.');
      setTimeout(() => setError(null), 5000);
    } finally {
      setLoadingEditId(null);
    }
  };

  // ── Load data ────────────────────────────────────────────────────────
  useEffect(() => {
    loadData();
  }, [user.uid]);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    // Guard: no hacer la llamada si el uid no es un UUID válido
    if (!user.uid || user.uid === 'undefined' || user.uid.length < 10) {
      setLoading(false);
      setError('No se pudo identificar al usuario. Por favor, cierra sesión y vuelve a ingresar.');
      return;
    }

    try {
      const [convs, posts, favIds] = await Promise.all([
        convocatoriaService.getConvocatoriasActivas(),
        postulacionService.getPostulacionesByUser(user.uid),
        convocatoriaService.getMisFavoritasIds(),
      ]);
      setConvocatorias(convs);
      const map: Record<string, Postulacion> = {};
      posts.forEach(p => { map[p.convocatoriaId] = p; });
      setMyPostulaciones(map);
      setFavoritasIds(favIds || []);
    } catch (err: any) {
      setError(err.message || 'Error al cargar convocatorias.');
    } finally {
      setLoading(false);
    }
  };

  // ── Filtered list ────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let result = [...convocatorias];
    if (showOnlyFavorites) {
      result = result.filter(c => favoritasIds.includes(c.id));
    }
    if (filterCategoria !== 'TODAS') result = result.filter(c => c.categoria === filterCategoria);
    if (filterGenero !== 'TODOS') result = result.filter(c => c.generoVisual === filterGenero);
    if (searchTerm) {
      const low = searchTerm.toLowerCase();
      result = result.filter(c => c.titulo.toLowerCase().includes(low) || c.descripcion.toLowerCase().includes(low));
    }

    // Sorting
    result.sort((a, b) => {
      if (sortBy === 'RECENT') {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      } else if (sortBy === 'DEADLINE_CLOSE') {
        const dateA = a.fechaLimite ? new Date(a.fechaLimite).getTime() : 0;
        const dateB = b.fechaLimite ? new Date(b.fechaLimite).getTime() : 0;
        return dateA - dateB;
      } else if (sortBy === 'DEADLINE_FAR') {
        const dateA = a.fechaLimite ? new Date(a.fechaLimite).getTime() : 0;
        const dateB = b.fechaLimite ? new Date(b.fechaLimite).getTime() : 0;
        return dateB - dateA;
      } else if (sortBy === 'TITLE_AZ') {
        return (a.titulo || '').localeCompare(b.titulo || '', 'es', { sensitivity: 'base' });
      }
      return 0;
    });

    return result;
  }, [convocatorias, favoritasIds, showOnlyFavorites, filterCategoria, filterGenero, searchTerm, sortBy]);


  // ── Apply handler ────────────────────────────────────────────────────
  const handleApply = async (conv: Convocatoria) => {
    if (!user.uid || user.uid === 'undefined') {
      setError('No se pudo identificar al usuario. Por favor, cierra sesión y vuelve a ingresar.');
      return;
    }
    // Verificar fecha límite en el frontend
    if (daysRemaining(conv.fechaLimite) <= 0) {
      setError('El plazo de postulación para esta convocatoria ha vencido.');
      return;
    }
    setApplyingId(conv.id);
    setApplySuccess(null);
    try {
      // Validar si el usuario tiene demos subidas
      const audios = await fetchAPI<any[]>(`/voice-audios/user/${user.uid}?category=demo`);
      const hasDemos = audios && audios.length > 0;
      
      if (!hasDemos) {
        setApplyingId(null);
        setShowNoDemosModal(true);
        return;
      }

      // Guardar demos y abrir selector modal
      setUserDemos(audios);
      setApplyingConv(conv);
      setSelectedDemoId(audios[0].id); // Seleccionar la primera por defecto
      setShowDemoSelectorModal(true);
      setSelectedConv(null); // Cerrar modal de detalles
    } catch (err: any) {
      setError(err.message);
    } finally {
      setApplyingId(null);
    }
  };

  const confirmApply = async () => {
    if (!applyingConv || !selectedDemoId) {
      console.warn('confirmApply blocked because applyingConv or selectedDemoId is missing:', applyingConv, selectedDemoId);
      return;
    }
    setApplyingId(applyingConv.id);
    try {
      if (editingPostulacion) {
        const updated = await postulacionService.updatePostulacion(editingPostulacion.id, {
          voiceAudioId: selectedDemoId,
        });
        setMyPostulaciones(prev => ({ ...prev, [applyingConv.id]: updated }));
        setApplySuccess(applyingConv.id);
        setShowDemoSelectorModal(false);
        setApplyingConv(null);
        setEditingPostulacion(null);
      } else {
        const post = await postulacionService.createPostulacion({
          convocatoriaId: applyingConv.id,
          alumnoId: user.uid,
          voiceAudioId: selectedDemoId,
        });
        setMyPostulaciones(prev => ({ ...prev, [applyingConv.id]: post }));
        setApplySuccess(applyingConv.id);
        setSelectedConv(null); // Cerrar modal de detalles
        setShowDemoSelectorModal(false);
        setApplyingConv(null);
      }
      setTimeout(() => setApplySuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Error al procesar la postulación.');
      setTimeout(() => setError(null), 5000);
    } finally {
      setApplyingId(null);
    }
  };

  // ── Loading ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-10 h-10 border-4 border-sud-orange/20 border-t-sud-orange rounded-full animate-spin" />
      </div>
    );
  }

  if (error && convocatorias.length === 0) {
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
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black tracking-tighter text-white uppercase tracking-widest">Oportunidades <span className="sud-vibrant-text-gradient tracking-tight">Laborales</span></h2>
          <p className="text-slate-500 mt-1 font-bold text-[10px] tracking-[0.3em] uppercase">Castings exclusivos para la comunidad SUD</p>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex gap-6 border-b border-white/5 pb-1">
        <button
          onClick={() => setShowOnlyFavorites(false)}
          className={`pb-4 text-[10px] font-black uppercase tracking-[0.2em] border-b-2 transition-all relative ${
            !showOnlyFavorites 
              ? 'text-white border-sud-turquoise' 
              : 'text-slate-500 border-transparent hover:text-slate-300'
          }`}
        >
          Todas las Convocatorias
          {!showOnlyFavorites && (
            <motion.div 
              layoutId="activeTabUnderline" 
              className="absolute bottom-0 left-0 right-0 h-[2px] bg-sud-turquoise"
            />
          )}
        </button>
        <button
          onClick={() => setShowOnlyFavorites(true)}
          className={`pb-4 text-[10px] font-black uppercase tracking-[0.2em] border-b-2 transition-all relative flex items-center gap-2 ${
            showOnlyFavorites 
              ? 'text-white border-sud-turquoise' 
              : 'text-slate-500 border-transparent hover:text-slate-300'
          }`}
        >
          <Heart size={12} className={showOnlyFavorites ? "text-red-500 fill-red-500" : "text-slate-500"} />
          Convocatorias Favoritas
          {favoritasIds.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[8px] bg-white/10 text-white font-bold">
              {favoritasIds.length}
            </span>
          )}
          {showOnlyFavorites && (
            <motion.div 
              layoutId="activeTabUnderline" 
              className="absolute bottom-0 left-0 right-0 h-[2px] bg-sud-turquoise"
            />
          )}
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Buscar convocatoria..."
            className="sud-input w-full pl-11"
          />
        </div>
        <div className="flex gap-3 overflow-x-auto">
          <div className="relative">
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="sud-input appearance-none pr-10 min-w-[180px]"
            >
              <option value="RECENT">Ordenar por: Más recientes</option>
              <option value="DEADLINE_CLOSE">Cierre más próximo</option>
              <option value="DEADLINE_FAR">Mayor tiempo restante</option>
              <option value="TITLE_AZ">Título A-Z</option>
            </select>
            <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
          </div>
          <div className="relative">
            <select
              value={filterCategoria}
              onChange={e => setFilterCategoria(e.target.value as any)}
              className="sud-input appearance-none pr-10 min-w-[150px]"
            >
              <option value="TODAS">Categoría</option>
              {CONVOCATORIA_CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
          </div>
          <div className="relative">
            <select
              value={filterGenero}
              onChange={e => setFilterGenero(e.target.value as any)}
              className="sud-input appearance-none pr-10 min-w-[150px]"
            >
              <option value="TODOS">Género Visual</option>
              {GENEROS_VISUALES.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
            <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Success toast */}
      <AnimatePresence>
        {applySuccess && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 right-6 z-50 p-5 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center gap-3 shadow-2xl backdrop-blur-md"
          >
            <CheckCircle2 size={20} className="text-emerald-400" />
            <span className="text-emerald-300 font-bold text-sm">¡Postulación enviada exitosamente!</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Favorite toast */}
      <AnimatePresence>
        {favoriteToast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 right-6 z-50 p-5 bg-sud-turquoise/10 border border-sud-turquoise/30 rounded-2xl flex items-center gap-3 shadow-2xl backdrop-blur-md"
          >
            <Heart size={20} className="text-red-500 fill-red-500" />
            <span className="text-sud-turquoise font-bold text-sm">{favoriteToast}</span>
          </motion.div>
        )}
      </AnimatePresence>


      {/* Error toast */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 right-6 z-[10001] p-5 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-center gap-3 shadow-2xl backdrop-blur-md"
          >
            <AlertCircle size={20} className="text-red-400" />
            <div className="flex flex-col gap-1">
              <span className="text-red-300 font-bold text-sm">{error}</span>
              <button 
                onClick={() => setError(null)} 
                className="text-[10px] text-red-400 underline uppercase tracking-widest font-bold text-left"
              >
                Cerrar
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cards */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {filtered.map(conv => {
          const hasApplied = !!myPostulaciones[conv.id] && myPostulaciones[conv.id].estado !== 'CANCELADA';
          const days = daysRemaining(conv.fechaLimite);
          const isFavorite = favoritasIds.includes(conv.id);
          return (
            <motion.div 
              layout
              key={conv.id}
              className="sud-glass-panel p-6 sm:p-10 group relative flex flex-col justify-between space-y-8 border-white/[0.05] hover:border-white/20 transition-all duration-500 overflow-hidden cursor-pointer"
              onClick={() => setSelectedConv(conv)}
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-sud-turquoise/5 blur-3xl rounded-full" />
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleFavorite(conv.id);
                }}
                className="absolute top-6 right-6 p-2.5 rounded-full bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-all z-20"
                title={isFavorite ? "Quitar de favoritas" : "Guardar como favorita"}
              >
                <Heart size={14} className={isFavorite ? "text-red-500 fill-red-500" : ""} />
              </button>

              <div className="space-y-4">
                <div className="flex items-center gap-3 flex-wrap pr-10">
                  <span className="text-[8px] font-black uppercase tracking-widest px-2.5 py-1.5 rounded-lg bg-sud-turquoise/10 text-sud-turquoise border border-sud-turquoise/20">
                    {conv.categoria}
                  </span>
                  {conv.generoVisual && (
                    <span className="text-[8px] font-black uppercase tracking-widest px-2.5 py-1.5 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
                      {conv.generoVisual}
                    </span>
                  )}
                  {hasApplied && (
                    <span className="text-[8px] font-black uppercase tracking-widest px-2.5 py-1.5 rounded-lg bg-green-500/10 text-green-400 border border-green-500/20 flex items-center gap-1">
                      <CheckCircle2 size={10} /> Postulado
                    </span>
                  )}
                </div>
                
                <h3 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight leading-tight group-hover:sud-vibrant-text-gradient transition-all break-words">{conv.titulo}</h3>
                <p className="text-xs text-slate-500 leading-relaxed font-medium line-clamp-3 break-words">{conv.descripcion}</p>
              </div>

              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-y border-white/5 py-4 gap-3">
                  <div className="flex items-center gap-2 text-[10px] text-slate-600 font-bold uppercase tracking-widest">
                    <Calendar size={14} className="text-sud-orange" />
                    <span>Cierre: {formatFecha(conv.fechaLimite)}</span>
                  </div>
                  <div className={`flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest ${days <= 3 ? 'text-red-400' : 'text-slate-600'}`}>
                    <Clock size={14} />
                    <span>{days} {days === 1 ? 'día restante' : 'días restantes'}</span>
                  </div>
                </div>

                {hasApplied ? (
                  <div className="space-y-3">
                    <div className="w-full min-h-[4rem] py-3 px-4 rounded-[1.5rem] flex flex-wrap items-center justify-center gap-3 bg-white/5 border border-white/10 text-slate-500">
                      <CheckCircle2 size={16} />
                      <span className="text-xs font-black uppercase tracking-widest text-center">Postulación Enviada</span>
                      <StatusBadge status={myPostulaciones[conv.id].estado} />
                    </div>
                    {(myPostulaciones[conv.id].estado === 'PENDIENTE' || myPostulaciones[conv.id].estado === 'EN_REVISION') && (
                      <div className="flex flex-col sm:flex-row gap-3 w-full" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleCancel(myPostulaciones[conv.id].id, conv.id); }}
                          className="w-full sm:flex-1 py-3.5 px-4 rounded-xl border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 text-[10px] font-black uppercase tracking-widest text-red-400 transition-all text-center min-w-0"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleEditPostulacion(myPostulaciones[conv.id], conv); }}
                          disabled={loadingEditId === myPostulaciones[conv.id].id}
                          className="w-full sm:flex-1 py-3.5 px-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-[10px] font-black uppercase tracking-widest text-slate-300 transition-all text-center flex items-center justify-center gap-1 disabled:opacity-50 disabled:pointer-events-none min-w-0"
                        >
                          {loadingEditId === myPostulaciones[conv.id].id ? (
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto shrink-0" />
                          ) : (
                            <span className="flex items-center gap-1 truncate"><span className="truncate">Editar Demo</span> <Sparkles size={12} className="shrink-0" /></span>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                ) : days <= 0 ? (
                  <div className="w-full min-h-[4rem] py-3 px-6 rounded-[1.5rem] flex items-center justify-center gap-3 bg-red-500/5 border border-red-500/20 text-red-400/70">
                    <Clock size={16} />
                    <span className="text-xs font-black uppercase tracking-widest text-center">Plazo Vencido</span>
                  </div>
                ) : (
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleApply(conv); }}
                    disabled={applyingId === conv.id}
                    className="w-full min-h-[4rem] py-3 px-6 rounded-[1.5rem] flex items-center justify-center gap-3 text-xs font-black uppercase tracking-widest sud-btn-primary hover:scale-[1.02] shadow-2xl shadow-sud-turquoise/10 transition-all min-w-0"
                  >
                    {applyingId === conv.id ? (
                      <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                    ) : (
                      <span className="flex items-center gap-2 truncate"><span className="truncate">Postularme Ahora</span> <Sparkles size={16} className="shrink-0" /></span>
                    )}
                  </button>
                )}
              </div>
            </motion.div>
          );
        })}

        {filtered.length === 0 && (
          <div className="col-span-full py-24 text-center border-2 border-dashed border-white/5 rounded-[3.5rem] bg-white/[0.01]">
            <Briefcase size={48} className="mx-auto text-white/5 mb-6" />
            <p className="text-slate-500 font-black uppercase tracking-[0.3em] text-[10px]">No hay convocatorias disponibles en este momento</p>
          </div>
        )}
      </div>

      {/* ── Detail Modal ────────────────────────────────────────────── */}
      {createPortal(
        <AnimatePresence>
          {selectedConv && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 backdrop-blur-md bg-black/60" onClick={() => setSelectedConv(null)}>
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                style={{ width: 'min(720px, calc(100vw - 2rem))', maxWidth: 'calc(100vw - 2rem)' }}
                className="sud-glass-panel p-6 md:p-10 relative overflow-hidden overflow-x-hidden max-h-[90vh] md:max-h-[85vh] overflow-y-auto"
                onClick={e => e.stopPropagation()}
              >
                 <button onClick={() => setSelectedConv(null)} className="absolute top-4 right-4 md:top-6 md:right-6 text-slate-500 hover:text-white z-10"><X size={22} /></button>
                
                {selectedConv && (
                  <button
                    onClick={() => handleToggleFavorite(selectedConv.id)}
                    className="absolute top-4 right-14 md:top-6 md:right-16 text-slate-400 hover:text-white z-10 transition-colors"
                    title={favoritasIds.includes(selectedConv.id) ? "Quitar de favoritas" : "Guardar como favorita"}
                  >
                    <Heart size={20} className={favoritasIds.includes(selectedConv.id) ? "text-red-500 fill-red-500" : ""} />
                  </button>
                )}

                <div className="space-y-8">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 flex-wrap">
                      {selectedConvEstado && <StatusBadge status={selectedConvEstado} size="md" />}
                      {selectedConvCategoria && (
                        <span className="text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg bg-sud-orange/10 text-sud-orange border border-sud-orange/20">
                          {selectedConvCategoria}
                        </span>
                      )}
                      {selectedConvGenero && (
                        <span className="text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
                          {selectedConvGenero}
                        </span>
                      )}
                      {selectedConv && (
                        <button
                          onClick={() => handleToggleFavorite(selectedConv.id)}
                          className={`text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border transition-all flex items-center gap-1.5 cursor-pointer ${
                            favoritasIds.includes(selectedConv.id)
                              ? 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20'
                              : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10'
                          }`}
                        >
                          <Heart size={10} className={favoritasIds.includes(selectedConv.id) ? "fill-red-400" : ""} />
                          {favoritasIds.includes(selectedConv.id) ? 'Favorita' : 'Guardar'}
                        </button>
                      )}
                    </div>
                    <h3 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tight break-words pr-10">{selectedConvTitulo}</h3>
                  </div>


                  <div className="space-y-2">
                    <h4 className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">Descripción</h4>
                    <p className="text-sm text-slate-300 leading-relaxed break-words">{selectedConvDescripcion}</p>
                  </div>

                  {selectedConvRequisitos && selectedConvRequisitos.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">Requisitos</h4>
                      <ul className="space-y-2">
                        {selectedConvRequisitos.map((r, i) => (
                          <li key={i} className="flex items-start gap-3 text-sm text-slate-300">
                            <FileText size={14} className="text-sud-turquoise mt-0.5 shrink-0" />
                            <span className="break-words min-w-0">{r}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-white/[0.02] border border-white/5 rounded-2xl">
                    <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                      <Calendar size={14} className="text-sud-orange" />
                      Cierre: {formatFecha(selectedConvFechaLimite)}
                    </div>
                    <div className={`flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest ${daysRemaining(selectedConvFechaLimite) <= 3 ? 'text-red-400' : 'text-slate-500'}`}>
                      <Clock size={14} />
                      {daysRemaining(selectedConvFechaLimite)} días restantes
                    </div>
                  </div>

                  {selectedPostulacion ? (
                    <div className="space-y-6">
                      <div className="p-5 md:p-6 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl flex flex-col sm:flex-row items-center sm:items-start gap-4">
                        <CheckCircle2 size={24} className="text-emerald-400 shrink-0" />
                        <div className="text-center sm:text-left">
                          <p className="text-emerald-300 font-bold text-sm">Ya has postulado a esta convocatoria</p>
                          <div className="mt-2 flex flex-wrap items-center justify-center sm:justify-start gap-2">
                            <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Estado:</span>
                            <StatusBadge status={selectedPostulacion.estado} size="md" />
                          </div>
                        </div>
                      </div>
                      
                      {(selectedPostulacion.estado === 'PENDIENTE' || selectedPostulacion.estado === 'EN_REVISION') && (
                        <div className="flex flex-col sm:flex-row gap-4">
                          <button
                            onClick={(e) => { e.stopPropagation(); selectedConv && handleCancel(selectedPostulacion.id, selectedConv.id); }}
                            className="flex-1 h-14 rounded-[1.5rem] flex items-center justify-center gap-2 border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 text-xs font-black uppercase tracking-widest text-red-400 transition-all cursor-pointer text-center"
                          >
                            Cancelar Postulación
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); selectedConv && handleEditPostulacion(selectedPostulacion, selectedConv); }}
                            disabled={loadingEditId === selectedPostulacion.id}
                            className="flex-1 h-14 rounded-[1.5rem] flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest sud-btn-primary hover:scale-[1.02] transition-all cursor-pointer text-center disabled:opacity-50 disabled:pointer-events-none"
                          >
                            {loadingEditId === selectedPostulacion.id ? (
                              <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin mx-auto" />
                            ) : (
                              <>Editar Demo <Sparkles size={16} /></>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  ) : daysRemaining(selectedConvFechaLimite) <= 0 ? (
                    <div className="p-5 md:p-6 bg-red-500/5 border border-red-500/20 rounded-2xl flex flex-col sm:flex-row items-center sm:items-start gap-4">
                      <Clock size={24} className="text-red-400 shrink-0" />
                      <div className="text-center sm:text-left">
                        <p className="text-red-300 font-bold text-sm">El plazo de postulación ha vencido</p>
                        <p className="text-xs text-slate-500 mt-1">Esta convocatoria cerró el {formatFecha(selectedConvFechaLimite)}</p>
                      </div>
                    </div>
                  ) : (
                    <button 
                      onClick={() => selectedConv && handleApply(selectedConv)}
                      disabled={applyingId === selectedConv?.id}
                      className="w-full sud-btn-primary py-5 text-sm font-black uppercase tracking-widest"
                    >
                      {applyingId === selectedConv?.id ? (
                        <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin mx-auto" />
                      ) : (
                        <>Postularme Ahora <Sparkles size={16}/></>
                      )}
                    </button>
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      ) /* ── Detail Modal End ── */
}

      {/* ── No Demos Modal ─────────────────────────────────────────── */}
      <AnimatePresence>
        {showNoDemosModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 backdrop-blur-md bg-black/60" onClick={() => setShowNoDemosModal(false)}>
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="sud-glass-panel w-full max-w-md p-10 relative overflow-hidden text-center space-y-6"
              onClick={e => e.stopPropagation()}
            >
              <button onClick={() => setShowNoDemosModal(false)} className="absolute top-6 right-6 text-slate-500 hover:text-white"><X size={22} /></button>
              
              <div className="w-16 h-16 mx-auto rounded-full bg-sud-orange/10 border border-sud-orange/30 flex items-center justify-center text-sud-orange">
                <AlertCircle size={32} />
              </div>

              <div className="space-y-2">
                <h3 className="text-2xl font-black text-white uppercase tracking-tight">Falta Demo de Voz</h3>
                <p className="text-sm text-slate-400 leading-relaxed">Debes subir una demo de voz antes de postular.</p>
              </div>

              <button 
                onClick={() => {
                  setShowNoDemosModal(false);
                  navigate('/demos');
                }}
                className="w-full h-14 rounded-2xl flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest sud-btn-primary hover:scale-[1.02] transition-all"
              >
                Ir a Mis Demos <Sparkles size={16} />
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Demo Selector Modal ─────────────────────────────────────── */}
      {createPortal(
        <AnimatePresence>
          {showDemoSelectorModal && (
            <div className="fixed inset-0 z-[10000] flex items-center justify-center p-6 backdrop-blur-md bg-black/60" onClick={() => { setShowDemoSelectorModal(false); setEditingPostulacion(null); }}>
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="sud-glass-panel w-full max-w-lg p-10 relative overflow-hidden space-y-6"
                onClick={e => e.stopPropagation()}
              >
                <button onClick={() => { setShowDemoSelectorModal(false); setEditingPostulacion(null); }} className="absolute top-6 right-6 text-slate-500 hover:text-white"><X size={22} /></button>
                
                <div className="space-y-2">
                  <h3 className="text-2xl font-black text-white uppercase tracking-tight">Selecciona tu Demo de Voz</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Para {editingPostulacion ? 'editar tu postulación' : 'postular'} a <span className="text-sud-orange font-bold">"{applyingConv?.titulo}"</span>, debes seleccionar cuál de tus demos de voz deseas enviar al equipo de casting.
                  </p>
                </div>

                <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-2">
                  {userDemos.map(demo => (
                    <div 
                      key={demo.id} 
                      onClick={() => setSelectedDemoId(demo.id)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                        selectedDemoId === demo.id 
                          ? 'bg-sud-turquoise/10 border-sud-turquoise text-white' 
                          : 'bg-white/[0.02] border-white/5 text-slate-400 hover:bg-white/[0.05]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-xl ${selectedDemoId === demo.id ? 'bg-sud-turquoise/20 text-sud-turquoise' : 'bg-white/5 text-slate-500'}`}>
                          <Briefcase size={16} />
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-bold truncate max-w-[200px]">{demo.title}</p>
                          <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">{demo.category || 'Demo'}</p>
                        </div>
                      </div>
                      
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        selectedDemoId === demo.id ? 'border-sud-turquoise' : 'border-slate-700'
                      }`}>
                        {selectedDemoId === demo.id && <div className="w-2.5 h-2.5 rounded-full bg-sud-turquoise" />}
                      </div>
                    </div>
                  ))}
                </div>

                <button 
                  onClick={confirmApply}
                  disabled={applyingId === applyingConv?.id || !selectedDemoId}
                  className="w-full h-14 rounded-2xl flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest sud-btn-primary hover:scale-[1.02] transition-all"
                >
                  {applyingId === applyingConv?.id ? (
                    <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin mx-auto" />
                  ) : (
                    <>{editingPostulacion ? 'Guardar Cambios' : 'Confirmar Postulación'} <Sparkles size={16} /></>
                  )}
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* ── Custom Cancel Confirmation Modal ───────────────────────── */}
      <AnimatePresence>
        {postToCancel && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-6 backdrop-blur-md bg-black/60" onClick={() => setPostToCancel(null)}>
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="sud-glass-panel w-full max-w-md p-10 relative overflow-hidden text-center space-y-6"
              onClick={e => e.stopPropagation()}
            >
              <button onClick={() => setPostToCancel(null)} className="absolute top-6 right-6 text-slate-500 hover:text-white"><X size={22} /></button>
              
              <div className="w-16 h-16 mx-auto rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-500">
                <AlertCircle size={32} />
              </div>

              <div className="space-y-2">
                <h3 className="text-2xl font-black text-white uppercase tracking-tight">¿Cancelar Postulación?</h3>
                <p className="text-sm text-slate-400 leading-relaxed">¿Estás seguro de que deseas cancelar esta postulación? Esta acción no se puede deshacer.</p>
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={() => setPostToCancel(null)}
                  className="flex-1 h-12 rounded-xl border border-white/10 hover:bg-white/5 text-xs font-black uppercase tracking-widest text-slate-400 transition-all"
                >
                  No, mantener
                </button>
                <button 
                  onClick={async () => {
                    if (!postToCancel) return;
                    try {
                      const updated = await postulacionService.updatePostulacion(postToCancel.id, { estado: 'CANCELADA' });
                      setMyPostulaciones(prev => ({ ...prev, [postToCancel.convocatoriaId]: updated }));
                    } catch (err: any) {
                      setError(err.message || 'Error al cancelar la postulación.');
                    } finally {
                      setPostToCancel(null);
                      setSelectedConv(null);
                    }
                  }}
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

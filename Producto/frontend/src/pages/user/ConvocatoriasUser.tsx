import React, { useState, useEffect, useMemo } from 'react';
import { Briefcase, Calendar, Sparkles, CheckCircle2, Search, ChevronDown, Clock, X, FileText, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfile } from '../../types';
import { StatusBadge } from '../../components/ui/StatusBadge';
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

export function ConvocatoriasUser({ user }: { user: UserProfile }) {
  const [convocatorias, setConvocatorias] = useState<Convocatoria[]>([]);
  const [myPostulaciones, setMyPostulaciones] = useState<Record<string, Postulacion>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategoria, setFilterCategoria] = useState<ConvocatoriaCategoria | 'TODAS'>('TODAS');
  const [filterGenero, setFilterGenero] = useState<GeneroVisual | 'TODOS'>('TODOS');

  // Detail modal
  const [selectedConv, setSelectedConv] = useState<Convocatoria | null>(null);

  // Applying state
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [applySuccess, setApplySuccess] = useState<string | null>(null);

  // ── Load data ────────────────────────────────────────────────────────
  useEffect(() => {
    loadData();
  }, [user.uid]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [convs, posts] = await Promise.all([
        convocatoriaService.getConvocatoriasActivas(),
        postulacionService.getPostulacionesByUser(user.uid),
      ]);
      setConvocatorias(convs);
      const map: Record<string, Postulacion> = {};
      posts.forEach(p => { map[p.convocatoriaId] = p; });
      setMyPostulaciones(map);
    } catch (err: any) {
      setError(err.message || 'Error al cargar convocatorias.');
    } finally {
      setLoading(false);
    }
  };

  // ── Filtered list ────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let result = [...convocatorias];
    if (filterCategoria !== 'TODAS') result = result.filter(c => c.categoria === filterCategoria);
    if (filterGenero !== 'TODOS') result = result.filter(c => c.generoVisual === filterGenero);
    if (searchTerm) {
      const low = searchTerm.toLowerCase();
      result = result.filter(c => c.titulo.toLowerCase().includes(low) || c.descripcion.toLowerCase().includes(low));
    }
    return result;
  }, [convocatorias, filterCategoria, filterGenero, searchTerm]);

  // ── Apply handler ────────────────────────────────────────────────────
  const handleApply = async (conv: Convocatoria) => {
    setApplyingId(conv.id);
    setApplySuccess(null);
    try {
      await new Promise(r => setTimeout(r, 500)); // small UX delay
      const post = await postulacionService.createPostulacion({
        convocatoriaId: conv.id,
        convocatoriaTitulo: conv.titulo,
        convocatoriaCategoria: conv.categoria,
        userId: user.uid,
        userName: user.name || '',
        userEmail: user.email || '',
        userPhone: user.phone || '',
      });
      setMyPostulaciones(prev => ({ ...prev, [conv.id]: post }));
      setApplySuccess(conv.id);
      setTimeout(() => setApplySuccess(null), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setApplyingId(null);
    }
  };

  // ── Days remaining ───────────────────────────────────────────────────
  const daysRemaining = (deadline: string) => {
    const diff = Math.ceil((new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
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
          <h2 className="text-3xl font-black tracking-tighter text-white uppercase italic">Oportunidades <span className="sud-vibrant-text-gradient tracking-tight">Laborales</span></h2>
          <p className="text-slate-500 mt-1 font-bold text-[10px] tracking-[0.3em] uppercase">Castings exclusivos para la comunidad SUD</p>
        </div>
      </header>

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

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {filtered.map(conv => {
          const hasApplied = !!myPostulaciones[conv.id];
          const days = daysRemaining(conv.fechaLimite);
          return (
            <motion.div 
              layout
              key={conv.id}
              className="sud-glass-panel p-10 group relative flex flex-col justify-between space-y-8 border-white/[0.05] hover:border-white/20 transition-all duration-500 overflow-hidden cursor-pointer"
              onClick={() => setSelectedConv(conv)}
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-sud-turquoise/5 blur-3xl rounded-full" />
              
              <div className="space-y-4">
                <div className="flex items-center gap-3 flex-wrap">
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
                
                <h3 className="text-3xl font-black text-white uppercase tracking-tight leading-tight group-hover:sud-vibrant-text-gradient transition-all">{conv.titulo}</h3>
                <p className="text-xs text-slate-500 leading-relaxed font-medium line-clamp-3">{conv.descripcion}</p>
              </div>

              <div className="space-y-6">
                <div className="flex items-center justify-between border-y border-white/5 py-4">
                  <div className="flex items-center gap-2 text-[10px] text-slate-600 font-bold uppercase tracking-widest">
                    <Calendar size={14} className="text-sud-orange" />
                    <span>Cierra: {new Date(conv.fechaLimite).toLocaleDateString()}</span>
                  </div>
                  <div className={`flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest ${days <= 3 ? 'text-red-400' : 'text-slate-600'}`}>
                    <Clock size={14} />
                    <span>{days} días restantes</span>
                  </div>
                </div>

                {hasApplied ? (
                  <div className="w-full h-16 rounded-[1.5rem] flex items-center justify-center gap-3 bg-white/5 border border-white/10 text-slate-500">
                    <CheckCircle2 size={16} />
                    <span className="text-xs font-black uppercase tracking-widest">Postulación Enviada</span>
                    <StatusBadge status={myPostulaciones[conv.id].estado} />
                  </div>
                ) : (
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleApply(conv); }}
                    disabled={applyingId === conv.id}
                    className="w-full h-16 rounded-[1.5rem] flex items-center justify-center gap-3 text-xs font-black uppercase tracking-widest sud-btn-primary hover:scale-[1.02] shadow-2xl shadow-sud-turquoise/10 transition-all"
                  >
                    {applyingId === conv.id ? (
                      <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                    ) : (
                      <>Postularme Ahora <Sparkles size={16}/></>
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
      <AnimatePresence>
        {selectedConv && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 backdrop-blur-md bg-black/60" onClick={() => setSelectedConv(null)}>
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="sud-glass-panel w-full max-w-2xl p-10 relative overflow-hidden max-h-[85vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              <button onClick={() => setSelectedConv(null)} className="absolute top-6 right-6 text-slate-500 hover:text-white"><X size={22} /></button>
              
              <div className="space-y-8">
                <div className="space-y-4">
                  <div className="flex items-center gap-3 flex-wrap">
                    <StatusBadge status={selectedConv.estado} size="md" />
                    <span className="text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg bg-sud-orange/10 text-sud-orange border border-sud-orange/20">{selectedConv.categoria}</span>
                    {selectedConv.generoVisual && (
                      <span className="text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">{selectedConv.generoVisual}</span>
                    )}
                  </div>
                  <h3 className="text-3xl font-black text-white uppercase tracking-tight">{selectedConv.titulo}</h3>
                </div>

                <div className="space-y-2">
                  <h4 className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">Descripción</h4>
                  <p className="text-sm text-slate-300 leading-relaxed">{selectedConv.descripcion}</p>
                </div>

                {selectedConv.requisitos.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">Requisitos</h4>
                    <ul className="space-y-2">
                      {selectedConv.requisitos.map((r, i) => (
                        <li key={i} className="flex items-start gap-3 text-sm text-slate-300">
                          <FileText size={14} className="text-sud-turquoise mt-0.5 shrink-0" />
                          {r}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="flex items-center justify-between p-5 bg-white/[0.02] border border-white/5 rounded-2xl">
                  <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                    <Calendar size={14} className="text-sud-orange" />
                    Cierre: {new Date(selectedConv.fechaLimite).toLocaleDateString()}
                  </div>
                  <div className={`flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest ${daysRemaining(selectedConv.fechaLimite) <= 3 ? 'text-red-400' : 'text-slate-500'}`}>
                    <Clock size={14} />
                    {daysRemaining(selectedConv.fechaLimite)} días restantes
                  </div>
                </div>

                {myPostulaciones[selectedConv.id] ? (
                  <div className="p-6 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl flex items-center gap-4">
                    <CheckCircle2 size={24} className="text-emerald-400" />
                    <div>
                      <p className="text-emerald-300 font-bold text-sm">Ya has postulado a esta convocatoria</p>
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Estado:</span>
                        <StatusBadge status={myPostulaciones[selectedConv.id].estado} size="md" />
                      </div>
                    </div>
                  </div>
                ) : (
                  <button 
                    onClick={() => handleApply(selectedConv)}
                    disabled={applyingId === selectedConv.id}
                    className="w-full sud-btn-primary py-5 text-sm font-black uppercase tracking-widest"
                  >
                    {applyingId === selectedConv.id ? (
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
      </AnimatePresence>
    </div>
  );
}

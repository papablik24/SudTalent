import React, { useState, useEffect, useMemo } from 'react';
import { FileText, Calendar, Search, ChevronDown, Clock, AlertCircle, Briefcase, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';
import { UserProfile } from '../../types';
import { StatusBadge } from '../../components/ui/StatusBadge';
import {
  postulacionService,
  Postulacion,
  PostulacionEstado,
  POSTULACION_ESTADOS,
} from '../../services/postulacionService';

export function UserPostulacionesView({ user }: { user: UserProfile }) {
  const [postulaciones, setPostulaciones] = useState<Postulacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      const posts = await postulacionService.getPostulacionesByUser(user.uid);
      setPostulaciones(posts);
    } catch (err: any) {
      setError(err.message || 'Error al cargar historial.');
    } finally {
      setLoading(false);
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
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Total', value: stats.total, color: 'text-white', bg: 'bg-white/5', border: 'border-white/10' },
          { label: 'Pendientes', value: stats.pendientes, color: 'text-amber-400', bg: 'bg-amber-500/5', border: 'border-amber-500/20' },
          { label: 'En Revisión', value: stats.enRevision, color: 'text-sky-400', bg: 'bg-sky-500/5', border: 'border-sky-500/20' },
          { label: 'Aceptadas', value: stats.aceptadas, color: 'text-emerald-400', bg: 'bg-emerald-500/5', border: 'border-emerald-500/20' },
          { label: 'Rechazadas', value: stats.rechazadas, color: 'text-red-400', bg: 'bg-red-500/5', border: 'border-red-500/20' },
        ].map(stat => (
          <div key={stat.label} className={`p-5 rounded-2xl border ${stat.bg} ${stat.border} text-center`}>
            <p className={`text-3xl font-black ${stat.color}`}>{stat.value}</p>
            <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
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
        <div className="relative">
          <select
            value={filterEstado}
            onChange={e => setFilterEstado(e.target.value as any)}
            className="sud-input appearance-none pr-10 min-w-[160px]"
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
            className="sud-glass-panel p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 group hover:border-white/20 transition-all"
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
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 shrink-0">
              <StatusBadge status={post.estado} size="md" />
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
    </div>
  );
}

import React, { useState, useEffect, useMemo } from 'react';
import { Users, Search, ChevronDown, AlertCircle, FileText, Mail, Phone } from 'lucide-react';
import { motion } from 'motion/react';
import { StatusBadge } from '../../components/ui/StatusBadge';
import {
  postulacionService,
  Postulacion,
  PostulacionEstado,
  POSTULACION_ESTADOS,
} from '../../services/postulacionService';
import {
  convocatoriaService,
  Convocatoria,
} from '../../services/convocatoriaService';

export function AdminPostulaciones() {
  const [postulaciones, setPostulaciones] = useState<Postulacion[]>([]);
  const [convocatorias, setConvocatorias] = useState<Convocatoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEstado, setFilterEstado] = useState<PostulacionEstado | 'TODAS'>('TODAS');
  const [filterConvocatoria, setFilterConvocatoria] = useState<string>('TODAS');

  // ── Load data ────────────────────────────────────────────────────────
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [posts, convs] = await Promise.all([
        postulacionService.getAllPostulaciones(),
        convocatoriaService.getConvocatorias(),
      ]);
      setPostulaciones(posts);
      setConvocatorias(convs);
    } catch (err: any) {
      setError(err.message || 'Error al cargar datos.');
    } finally {
      setLoading(false);
    }
  };

  // ── Filtered ─────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let result = [...postulaciones];
    if (filterEstado !== 'TODAS') result = result.filter(p => p.estado === filterEstado);
    if (filterConvocatoria !== 'TODAS') result = result.filter(p => p.convocatoriaId === filterConvocatoria);
    if (searchTerm) {
      const low = searchTerm.toLowerCase();
      result = result.filter(p =>
        p.userName.toLowerCase().includes(low) ||
        p.userEmail.toLowerCase().includes(low) ||
        (p.convocatoriaTitulo || '').toLowerCase().includes(low)
      );
    }
    result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return result;
  }, [postulaciones, filterEstado, filterConvocatoria, searchTerm]);

  // ── Status change ────────────────────────────────────────────────────
  const handleStatusChange = async (postId: string, newStatus: PostulacionEstado) => {
    await postulacionService.updatePostulacionStatus(postId, newStatus);
    await loadData();
  };

  // ── Stats ────────────────────────────────────────────────────────────
  const stats = useMemo(() => ({
    total: postulaciones.length,
    pendientes: postulaciones.filter(p => p.estado === 'PENDIENTE').length,
    enRevision: postulaciones.filter(p => p.estado === 'EN_REVISION').length,
    aceptadas: postulaciones.filter(p => p.estado === 'ACEPTADA').length,
  }), [postulaciones]);

  // ── Loading / Error ──────────────────────────────────────────────────
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
        <button onClick={loadData} className="mt-4 text-[10px] text-red-400 underline uppercase tracking-widest font-bold">Reintentar</button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <header>
        <h2 className="text-3xl font-black tracking-tighter text-white">Gestión de <span className="sud-vibrant-text-gradient uppercase tracking-widest">Postulaciones</span></h2>
        <p className="text-slate-400 mt-1 font-medium text-[10px] tracking-widest uppercase">Revisión y gestión de postulaciones recibidas</p>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total', value: stats.total, color: 'text-white', bg: 'bg-white/5', border: 'border-white/10' },
          { label: 'Pendientes', value: stats.pendientes, color: 'text-amber-400', bg: 'bg-amber-500/5', border: 'border-amber-500/20' },
          { label: 'En Revisión', value: stats.enRevision, color: 'text-sky-400', bg: 'bg-sky-500/5', border: 'border-sky-500/20' },
          { label: 'Aceptadas', value: stats.aceptadas, color: 'text-emerald-400', bg: 'bg-emerald-500/5', border: 'border-emerald-500/20' },
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
            placeholder="Buscar por nombre, email o convocatoria..."
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
        <div className="relative">
          <select
            value={filterConvocatoria}
            onChange={e => setFilterConvocatoria(e.target.value)}
            className="sud-input appearance-none pr-10 min-w-[200px]"
          >
            <option value="TODAS">Todas las convocatorias</option>
            {convocatorias.map(c => <option key={c.id} value={c.id}>{c.titulo}</option>)}
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
            transition={{ delay: i * 0.03 }}
            className="sud-glass-panel p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 group hover:border-white/20 transition-all"
          >
            <div className="flex items-start gap-5 flex-1 min-w-0">
              <div className="w-12 h-12 rounded-2xl bg-sud-gradient p-[1px] shrink-0">
                <div className="w-full h-full rounded-[0.9rem] bg-black flex items-center justify-center text-sud-turquoise font-black text-lg">
                  {post.userName?.[0] || 'U'}
                </div>
              </div>

              <div className="space-y-2 flex-1 min-w-0">
                <h4 className="text-lg font-black text-white uppercase tracking-tight truncate group-hover:text-sud-turquoise transition-colors">
                  {post.userName}
                </h4>
                <div className="flex items-center gap-4 flex-wrap text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                  <span className="flex items-center gap-1.5"><Mail size={11} /> {post.userEmail}</span>
                  <span className="flex items-center gap-1.5"><Phone size={11} /> {post.userPhone}</span>
                </div>
                <div className="flex items-center gap-3 flex-wrap mt-1">
                  <span className="text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-md bg-sud-turquoise/10 text-sud-turquoise border border-sud-turquoise/20">
                    {post.convocatoriaTitulo || 'Convocatoria'}
                  </span>
                  {post.convocatoriaCategoria && (
                    <span className="text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-md bg-sud-orange/10 text-sud-orange border border-sud-orange/20">
                      {post.convocatoriaCategoria}
                    </span>
                  )}
                  <span className="text-[9px] text-slate-600 font-bold">
                    {new Date(post.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 shrink-0">
              <StatusBadge status={post.estado} size="md" />
              <div className="relative">
                <select 
                  value={post.estado}
                  onChange={(e) => handleStatusChange(post.id, e.target.value as PostulacionEstado)}
                  className="text-[9px] font-black uppercase tracking-widest px-3 py-2 rounded-xl bg-black border border-white/10 outline-none text-slate-400 appearance-none pr-8 min-w-[130px]"
                >
                  <option value="PENDIENTE">Pendiente</option>
                  <option value="EN_REVISION">En Revisión</option>
                  <option value="ACEPTADA">Aceptada</option>
                  <option value="RECHAZADA">Rechazada</option>
                </select>
                <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none" />
              </div>
            </div>
          </motion.div>
        ))}

        {filtered.length === 0 && (
          <div className="py-20 text-center border-2 border-dashed border-white/5 rounded-[3rem]">
            <FileText size={40} className="mx-auto text-slate-800 mb-6" />
            <p className="text-slate-500 font-black uppercase tracking-widest text-[10px]">
              {postulaciones.length === 0 ? 'No hay postulaciones recibidas' : 'No se encontraron postulaciones con los filtros aplicados'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

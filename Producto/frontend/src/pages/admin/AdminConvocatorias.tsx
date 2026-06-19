import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Briefcase, Calendar, Trash2, Edit2, Users, X, Search, Archive, Lock, Eye, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { StatusBadge } from '../../components/ui/StatusBadge';
import {
  convocatoriaService,
  Convocatoria,
  CreateConvocatoriaDTO,
  ConvocatoriaCategoria,
  ConvocatoriaEstado,
  GeneroVisual,
  CONVOCATORIA_CATEGORIAS,
  CONVOCATORIA_ESTADOS,
  GENEROS_VISUALES,
} from '../../services/convocatoriaService';
import {
  postulacionService,
  Postulacion,
  PostulacionEstado,
} from '../../services/postulacionService';

type FormData = CreateConvocatoriaDTO & { requisitosText: string };

const EMPTY_FORM: FormData = {
  titulo: '',
  descripcion: '',
  categoria: 'Doblaje',
  generoVisual: undefined,
  requisitos: [],
  fechaLimite: '',
  estado: 'BORRADOR',
  requisitosText: '',
};

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

export function ConvocatoriasAdmin() {
  const [convocatorias, setConvocatorias] = useState<Convocatoria[]>([]);
  const [postulaciones, setPostulaciones] = useState<Postulacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters and Sorting
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEstado, setFilterEstado] = useState<string>('TODAS');
  const [filterCategoria, setFilterCategoria] = useState<ConvocatoriaCategoria | 'TODAS'>('TODAS');
  const [orderBy, setOrderBy] = useState<'recientes' | 'estado' | 'cierre' | 'titulo'>('recientes');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);

  // Postulantes modal
  const [viewingApplicantsId, setViewingApplicantsId] = useState<string | null>(null);
  const [applicants, setApplicants] = useState<Postulacion[]>([]);
  const [convToDeleteId, setConvToDeleteId] = useState<string | null>(null);

  // ── Load data ────────────────────────────────────────────────────────
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [convs, posts] = await Promise.all([
        convocatoriaService.getConvocatorias(),
        postulacionService.getAllPostulaciones(),
      ]);
      setConvocatorias(convs);
      setPostulaciones(posts);
    } catch (err: any) {
      setError(err.message || 'Error al cargar datos.');
    } finally {
      setLoading(false);
    }
  };

  // ── Postulaciones count per convocatoria ─────────────────────────────
  const postCountMap = useMemo(() => {
    const map: Record<string, number> = {};
    postulaciones.forEach(p => {
      map[p.convocatoriaId] = (map[p.convocatoriaId] || 0) + 1;
    });
    return map;
  }, [postulaciones]);

  // ── Filtered and sorted list ─────────────────────────────────────────
  const getVisualEstado = (conv: Convocatoria): string => {
    if (conv.estado === 'ACTIVA' && conv.fechaLimite) {
      const todayStr = new Date().toLocaleDateString('sv-SE');
      if (conv.fechaLimite < todayStr) {
        return 'VENCIDA';
      }
    }
    return conv.estado;
  };

  const filtered = useMemo(() => {
    let result = [...convocatorias];
    
    // 1. Text filter
    if (searchTerm) {
      const low = searchTerm.toLowerCase();
      result = result.filter(c => c.titulo.toLowerCase().includes(low) || c.descripcion.toLowerCase().includes(low));
    }

    // 2. Category filter
    if (filterCategoria !== 'TODAS') {
      result = result.filter(c => c.categoria === filterCategoria);
    }

    // 3. Status filter (incorporating the virtual status 'VENCIDA')
    if (filterEstado !== 'TODAS') {
      const todayStr = new Date().toLocaleDateString('sv-SE');
      if (filterEstado === 'ACTIVAS') {
        result = result.filter(c => c.estado === 'ACTIVA' && (!c.fechaLimite || c.fechaLimite >= todayStr));
      } else if (filterEstado === 'VENCIDAS') {
        result = result.filter(c => c.estado === 'ACTIVA' && c.fechaLimite && c.fechaLimite < todayStr);
      } else if (filterEstado === 'CERRADAS') {
        result = result.filter(c => c.estado === 'CERRADA');
      } else if (filterEstado === 'BORRADORES') {
        result = result.filter(c => c.estado === 'BORRADOR');
      } else if (filterEstado === 'ARCHIVADAS') {
        result = result.filter(c => c.estado === 'ARCHIVADA');
      }
    }

    // 4. Sort logic
    result.sort((a, b) => {
      if (orderBy === 'recientes') {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      }

      if (orderBy === 'estado') {
        const stateOrder: Record<string, number> = {
          ACTIVA: 1,
          VENCIDA: 2,
          CERRADA: 3,
          BORRADOR: 4,
          ARCHIVADA: 5,
        };
        const orderA = stateOrder[getVisualEstado(a)] || 99;
        const orderB = stateOrder[getVisualEstado(b)] || 99;
        if (orderA !== orderB) {
          return orderA - orderB;
        }
        // Sub-sort by newest first if state is the same
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      }

      if (orderBy === 'cierre') {
        if (!a.fechaLimite && !b.fechaLimite) return 0;
        if (!a.fechaLimite) return 1;
        if (!b.fechaLimite) return -1;
        return a.fechaLimite.localeCompare(b.fechaLimite);
      }

      if (orderBy === 'titulo') {
        return a.titulo.localeCompare(b.titulo);
      }

      return 0;
    });

    return result;
  }, [convocatorias, filterEstado, filterCategoria, searchTerm, orderBy]);

  // ── CRUD handlers ────────────────────────────────────────────────────
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.titulo.trim()) { setFormError('El título es requerido.'); return; }
    if (!formData.descripcion.trim()) { setFormError('La descripción es requerida.'); return; }
    if (!formData.fechaLimite) { setFormError('La fecha límite es requerida.'); return; }
    const todayStr = new Date().toLocaleDateString('sv-SE');
    if (formData.fechaLimite < todayStr) {
      setFormError('La fecha límite no puede ser anterior a hoy.'); return;
    }

    const dto: CreateConvocatoriaDTO = {
      titulo: formData.titulo.trim(),
      descripcion: formData.descripcion.trim(),
      categoria: formData.categoria,
      generoVisual: formData.generoVisual || undefined,
      requisitos: formData.requisitosText
        .split('\n')
        .map(r => r.trim())
        .filter(Boolean),
      fechaLimite: formData.fechaLimite,
      estado: formData.estado,
    };

    try {
      if (editingId) {
        await convocatoriaService.updateConvocatoria(editingId, dto);
      } else {
        await convocatoriaService.createConvocatoria(dto);
      }
      setIsModalOpen(false);
      setEditingId(null);
      setFormData(EMPTY_FORM);
      await loadData();
    } catch (err: any) {
      setFormError(err.message || 'Error al guardar.');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await convocatoriaService.deleteConvocatoria(id);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Error al eliminar la convocatoria.');
    }
  };

  const handleClose = async (id: string) => {
    await convocatoriaService.closeConvocatoria(id);
    await loadData();
  };

  const handleArchive = async (id: string) => {
    await convocatoriaService.archiveConvocatoria(id);
    await loadData();
  };

  const openEdit = (conv: Convocatoria) => {
    setEditingId(conv.id);
    setFormData({
      titulo: conv.titulo,
      descripcion: conv.descripcion,
      categoria: conv.categoria,
      generoVisual: conv.generoVisual,
      requisitos: conv.requisitos,
      fechaLimite: conv.fechaLimite || '',
      estado: conv.estado,
      requisitosText: conv.requisitos.join('\n'),
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const openNew = () => {
    setEditingId(null);
    setFormData(EMPTY_FORM);
    setFormError(null);
    setIsModalOpen(true);
  };

  // ── View Applicants ──────────────────────────────────────────────────
  const openApplicants = async (convId: string) => {
    const apps = await postulacionService.getPostulacionesByConvocatoria(convId);
    setApplicants(apps);
    setViewingApplicantsId(convId);
  };

  const handleStatusChange = async (postId: string, newStatus: PostulacionEstado) => {
    await postulacionService.updatePostulacionStatus(postId, newStatus);
    if (viewingApplicantsId) {
      const apps = await postulacionService.getPostulacionesByConvocatoria(viewingApplicantsId);
      setApplicants(apps);
    }
    await loadData();
  };

  // ── Render ───────────────────────────────────────────────────────────
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
        <p className="text-red-400 font-bold text-sm">{error}</p>
        <button onClick={loadData} className="mt-4 text-[10px] text-red-400 underline uppercase tracking-widest font-bold">Reintentar</button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black tracking-tighter text-white">Gestión de <span className="sud-vibrant-text-gradient uppercase tracking-widest">Convocatorias</span></h2>
          <p className="text-slate-400 mt-1 font-medium text-[10px] tracking-widest uppercase">Publicación de castings y revisión de postulantes</p>
        </div>
        <button onClick={openNew} className="sud-btn-primary px-8 py-4">
          <Plus size={18} />
          <span>Nueva Convocatoria</span>
        </button>
      </header>

      {/* Filters and Sorting */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Buscar por título..."
            className="sud-input w-full pl-11"
          />
        </div>
        <div className="relative">
          <select
            value={filterEstado}
            onChange={e => setFilterEstado(e.target.value)}
            className="sud-input appearance-none pr-10 min-w-[160px]"
          >
            <option value="TODAS">Todos los estados</option>
            <option value="ACTIVAS">Activas</option>
            <option value="VENCIDAS">Plazo Vencido</option>
            <option value="CERRADAS">Cerradas</option>
            <option value="BORRADORES">Borradores</option>
            <option value="ARCHIVADAS">Archivadas</option>
          </select>
          <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
        </div>
        <div className="relative">
          <select
            value={filterCategoria}
            onChange={e => setFilterCategoria(e.target.value as any)}
            className="sud-input appearance-none pr-10 min-w-[160px]"
          >
            <option value="TODAS">Todas las categorías</option>
            {CONVOCATORIA_CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
        </div>
        <div className="relative">
          <select
            value={orderBy}
            onChange={e => setOrderBy(e.target.value as any)}
            className="sud-input appearance-none pr-10 min-w-[180px]"
          >
            <option value="recientes">Más recientes</option>
            <option value="estado">Ordenar por Estado</option>
            <option value="cierre">Fecha de cierre próxima</option>
            <option value="titulo">Título A-Z</option>
          </select>
          <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
        </div>
      </div>

      {/* List */}
      <div className="grid grid-cols-1 gap-6">
        {filtered.map(conv => (
          <div key={conv.id} className={`sud-glass-panel p-8 group relative overflow-hidden flex flex-col md:flex-row gap-8 items-start md:items-center ${
            getVisualEstado(conv) === 'VENCIDA' ? 'border-red-500/10' : ''
          }`}>
            <div className={`absolute top-0 left-0 w-1 h-full ${
              getVisualEstado(conv) === 'VENCIDA'
                ? 'bg-rose-500'
                : conv.estado === 'ACTIVA'
                ? 'bg-emerald-400'
                : conv.estado === 'BORRADOR'
                ? 'bg-slate-600'
                : conv.estado === 'CERRADA'
                ? 'bg-red-400'
                : 'bg-slate-800'
            }`} />
            
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-3 flex-wrap">
                <StatusBadge status={getVisualEstado(conv)} />
                <span className="text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-md bg-sud-orange/10 text-sud-orange border border-sud-orange/20">
                  {conv.categoria}
                </span>
                {conv.generoVisual && (
                  <span className="text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/20">
                    {conv.generoVisual}
                  </span>
                )}
              </div>
              <h3 className="text-2xl font-black text-white uppercase tracking-tight group-hover:sud-vibrant-text-gradient transition-all">{conv.titulo}</h3>
              <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{conv.descripcion}</p>
              
              <div className="flex items-center gap-6 pt-2">
                <div className={`flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest ${
                  getVisualEstado(conv) === 'VENCIDA' ? 'text-rose-400' : 'text-slate-600'
                }`}>
                  <Calendar size={14} />
                  <span>Cierre: {formatFecha(conv.fechaLimite)} {getVisualEstado(conv) === 'VENCIDA' && '(PLAZO VENCIDO)'}</span>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-sud-turquoise font-bold uppercase tracking-widest">
                  <Users size={14} />
                  <span>{postCountMap[conv.id] || 0} Postulantes</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto flex-wrap">
              <button 
                onClick={() => openApplicants(conv.id)}
                className="flex-1 md:flex-none px-6 py-3 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all text-white flex items-center gap-2 justify-center"
              >
                <Eye size={14} /> Postulantes
              </button>
              {conv.estado === 'ACTIVA' && (
                <button 
                  onClick={() => handleClose(conv.id)}
                  className="p-3 bg-white/5 border border-white/10 rounded-2xl text-slate-400 hover:text-amber-400 transition-all" title="Cerrar"
                >
                  <Lock size={18} />
                </button>
              )}
              {(conv.estado === 'CERRADA' || conv.estado === 'BORRADOR') && (
                <button 
                  onClick={() => handleArchive(conv.id)}
                  className="p-3 bg-white/5 border border-white/10 rounded-2xl text-slate-400 hover:text-slate-300 transition-all" title="Archivar"
                >
                  <Archive size={18} />
                </button>
              )}
              <button 
                onClick={() => openEdit(conv)}
                className="p-3 bg-white/5 border border-white/10 rounded-2xl text-slate-400 hover:text-sud-turquoise transition-all" title="Editar"
              >
                <Edit2 size={18} />
              </button>
              <button 
                onClick={() => setConvToDeleteId(conv.id)}
                className="p-3 bg-white/5 border border-white/10 rounded-2xl text-slate-400 hover:text-red-400 transition-all" title="Eliminar"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="p-20 text-center border-2 border-dashed border-white/5 rounded-[3rem]">
            <Briefcase size={40} className="mx-auto text-slate-800 mb-6" />
            <p className="text-slate-500 font-black uppercase tracking-widest text-[10px]">
              {convocatorias.length === 0 ? 'No hay convocatorias creadas' : 'No se encontraron convocatorias con los filtros aplicados'}
            </p>
          </div>
        )}
      </div>

      {/* ── Modal Crear/Editar ────────────────────────────────────────── */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-950/25 dark:bg-black/60 backdrop-blur-sm dark:backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="sud-glass-panel w-full max-w-2xl p-10 relative overflow-hidden max-h-[90vh] overflow-y-auto"
            >
              <button onClick={() => setIsModalOpen(false)} className="absolute top-6 right-6 text-slate-500 hover:text-white"><X /></button>
              <h3 className="text-2xl font-black text-white mb-8 uppercase tracking-tight">{editingId ? 'Editar' : 'Nueva'} Convocatoria</h3>
              
              {formError && (
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-xs font-bold">{formError}</div>
              )}

              <form onSubmit={handleSave} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-bold text-slate-500 px-1 tracking-widest">Título del Casting *</label>
                  <input 
                    type="text" 
                    value={formData.titulo}
                    onChange={e => setFormData({...formData, titulo: e.target.value})}
                    className="sud-input w-full"
                    placeholder="Ej: Casting Doblaje Personaje Secundario"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-bold text-slate-500 px-1 tracking-widest">Categoría *</label>
                    <div className="relative">
                      <select 
                        value={formData.categoria}
                        onChange={e => setFormData({...formData, categoria: e.target.value as ConvocatoriaCategoria})}
                        className="sud-input w-full appearance-none pr-10"
                      >
                        {CONVOCATORIA_CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-bold text-slate-500 px-1 tracking-widest">Género Visual</label>
                    <div className="relative">
                      <select 
                        value={formData.generoVisual || ''}
                        onChange={e => setFormData({...formData, generoVisual: (e.target.value || undefined) as GeneroVisual | undefined})}
                        className="sud-input w-full appearance-none pr-10"
                      >
                        <option value="">— Sin clasificar —</option>
                        {GENEROS_VISUALES.map(g => <option key={g} value={g}>{g}</option>)}
                      </select>
                      <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-bold text-slate-500 px-1 tracking-widest">Estado</label>
                    <div className="relative">
                      <select 
                        value={formData.estado}
                        onChange={e => setFormData({...formData, estado: e.target.value as ConvocatoriaEstado})}
                        className="sud-input w-full appearance-none pr-10"
                      >
                        {CONVOCATORIA_ESTADOS.map(e => <option key={e} value={e}>{e}</option>)}
                      </select>
                      <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-bold text-slate-500 px-1 tracking-widest">Fecha Límite *</label>
                    <div className="relative group">
                      <Calendar size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-sud-turquoise transition-colors pointer-events-none" />
                      <input 
                        type="date" 
                        value={formData.fechaLimite}
                        onChange={e => setFormData({...formData, fechaLimite: e.target.value})}
                        onClick={(e) => (e.currentTarget as HTMLInputElement).showPicker?.()}
                        className="sud-input w-full pl-12 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-bold text-slate-500 px-1 tracking-widest">Descripción *</label>
                  <textarea 
                    value={formData.descripcion}
                    onChange={e => setFormData({...formData, descripcion: e.target.value})}
                    className="sud-input w-full h-28 py-4 resize-none"
                    placeholder="Detalles del casting, tono de voz requerido, etc..."
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-bold text-slate-500 px-1 tracking-widest">Requisitos <span className="text-slate-700">(uno por línea)</span></label>
                  <textarea 
                    value={formData.requisitosText}
                    onChange={e => setFormData({...formData, requisitosText: e.target.value})}
                    className="sud-input w-full h-24 py-4 resize-none"
                    placeholder="Experiencia en doblaje&#10;Rango vocal juvenil&#10;Disponibilidad inmediata"
                  />
                </div>

                <button type="submit" className="w-full sud-btn-primary py-5 uppercase tracking-widest font-black text-sm">
                  {editingId ? 'Guardar Cambios' : 'Publicar Convocatoria'}
                </button>
              </form>
            </motion.div>
          </div>
        )}

        {/* ── Modal Postulantes ─────────────────────────────────────── */}
        {viewingApplicantsId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-950/25 dark:bg-black/60 backdrop-blur-sm dark:backdrop-blur-md">
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              className="sud-glass-panel w-full max-w-4xl max-h-[80vh] flex flex-col p-0 overflow-hidden"
            >
              <div className="p-8 border-b border-white/10 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-black text-white uppercase tracking-tight">Revisión de Postulantes</h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                    {convocatorias.find(c => c.id === viewingApplicantsId)?.titulo}
                  </p>
                </div>
                <button onClick={() => setViewingApplicantsId(null)} className="p-2 text-slate-500 hover:text-white bg-white/5 rounded-full transition-all"><X size={20}/></button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-4">
                {applicants.map(app => (
                  <div key={app.id} className="p-6 bg-white/[0.02] border border-white/5 rounded-3xl flex items-center justify-between group hover:bg-white/[0.04] transition-all">
                    <div className="flex items-center gap-6">
                      <div className="w-12 h-12 rounded-2xl bg-sud-gradient p-[1px]">
                        <div className="w-full h-full rounded-[0.9rem] bg-black flex items-center justify-center text-sud-turquoise font-black">
                          {app.userName?.[0] || 'U'}
                        </div>
                      </div>
                      <div>
                        <p className="text-lg font-black text-white uppercase tracking-tight group-hover:text-sud-turquoise transition-colors">{app.userName}</p>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{app.userPhone} • {app.userEmail}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <StatusBadge status={app.estado} size="md" />
                      <select 
                        value={app.estado}
                        onChange={(e) => handleStatusChange(app.id, e.target.value as PostulacionEstado)}
                        className="text-[9px] font-black uppercase tracking-widest px-3 py-2 rounded-xl bg-black border border-white/10 outline-none text-slate-400"
                      >
                        <option value="PENDIENTE">Pendiente</option>
                        <option value="EN_REVISION">En Revisión</option>
                        <option value="ACEPTADA">Aceptada</option>
                        <option value="RECHAZADA">Rechazada</option>
                      </select>
                    </div>
                  </div>
                ))}
                {applicants.length === 0 && (
                  <div className="py-20 text-center opacity-40">
                    <p className="text-[10px] font-black uppercase tracking-widest">No hay postulantes aún</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Custom Delete Confirmation Modal ───────────────────────── */}
      <AnimatePresence>
        {convToDeleteId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-950/25 dark:bg-black/60 backdrop-blur-sm dark:backdrop-blur-md" onClick={() => setConvToDeleteId(null)}>
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="sud-glass-panel w-full max-w-md p-10 relative overflow-hidden text-center space-y-6"
              onClick={e => e.stopPropagation()}
            >
              <button onClick={() => setConvToDeleteId(null)} className="absolute top-6 right-6 text-slate-500 hover:text-white"><X size={22} /></button>
              
              <div className="w-16 h-16 mx-auto rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-500">
                <Trash2 size={32} />
              </div>

              <div className="space-y-2">
                <h3 className="text-2xl font-black text-white uppercase tracking-tight">Eliminar convocatoria</h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  {convToDeleteId && (postCountMap[convToDeleteId] || 0) > 0
                    ? "Esta convocatoria tiene postulantes asociados. Si la eliminas, se ocultará de la plataforma y se cancelarán las postulaciones/audiciones pendientes asociadas. ¿Deseas continuar?"
                    : "Esta acción eliminará la convocatoria seleccionada. ¿Deseas continuar?"}
                </p>
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={() => setConvToDeleteId(null)}
                  className="flex-1 h-12 rounded-xl border border-white/10 hover:bg-white/5 text-xs font-black uppercase tracking-widest text-slate-400 transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button 
                  onClick={async () => {
                    if (convToDeleteId) {
                      await handleDelete(convToDeleteId);
                      setConvToDeleteId(null);
                    }
                  }}
                  className="flex-1 h-12 rounded-xl bg-red-500 text-black hover:bg-red-600 text-xs font-black uppercase tracking-widest transition-all cursor-pointer"
                >
                  {convToDeleteId && (postCountMap[convToDeleteId] || 0) > 0 ? "Eliminar convocatoria" : "Eliminar"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

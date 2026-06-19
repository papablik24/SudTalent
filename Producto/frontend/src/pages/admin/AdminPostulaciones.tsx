import React, { useState, useEffect, useMemo } from 'react';
import { Users, Search, ChevronDown, AlertCircle, FileText, Mail, Phone, Calendar, Clock, MapPin, Link as LinkIcon, User, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
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
import {
  audicionService,
  Audicion,
  AudicionModalidad,
} from '../../services/audicionService';
import {
  profesorService,
  ProfesorDTO,
} from '../../services/profesorService';

export function AdminPostulaciones() {
  const [postulaciones, setPostulaciones] = useState<Postulacion[]>([]);
  const [convocatorias, setConvocatorias] = useState<Convocatoria[]>([]);
  const [profesores, setProfesores] = useState<ProfesorDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingIds, setUpdatingIds] = useState<Record<string, boolean>>({});

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEstado, setFilterEstado] = useState<PostulacionEstado | 'TODAS'>('TODAS');
  const [filterConvocatoria, setFilterConvocatoria] = useState<string>('TODAS');

  // Modal Programar Audición
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedPostulacion, setSelectedPostulacion] = useState<Postulacion | null>(null);
  const [scheduleProfesorId, setScheduleProfesorId] = useState('');
  const [scheduleFecha, setScheduleFecha] = useState('');
  const [scheduleHora, setScheduleHora] = useState('');
  const [scheduleModalidad, setScheduleModalidad] = useState<AudicionModalidad>('ONLINE');
  const [scheduleLugar, setScheduleLugar] = useState('');
  const [scheduleLink, setScheduleLink] = useState('');
  const [submittingSchedule, setSubmittingSchedule] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Toast Message State
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Canceling Audicion Modal State
  const [cancelingAudicionId, setCancelingAudicionId] = useState<string | null>(null);

  // Refs for Date and Time pickers
  const dateRef = React.useRef<HTMLInputElement>(null);
  const timeRef = React.useRef<HTMLInputElement>(null);

  // Auto-hide toast message
  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => {
      setToastMessage(null);
    }, 4000);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  // ── Load data ────────────────────────────────────────────────────────
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async (silent = false) => {
    if (!silent) {
      setLoading(true);
      setError(null);
    }
    try {
      const [posts, convs, profs] = await Promise.all([
        postulacionService.getAllPostulaciones(),
        convocatoriaService.getConvocatorias(),
        profesorService.getAll(),
      ]);
      setPostulaciones(posts);
      setConvocatorias(convs);
      setProfesores(profs.filter(p => p.active !== false)); // Cargar solo profesores activos
    } catch (err: any) {
      if (!silent) {
        setError(err.message || 'Error al cargar datos.');
      } else {
        console.error('Error in silent reload:', err);
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
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
        (p.userName || '').toLowerCase().includes(low) ||
        (p.userEmail || '').toLowerCase().includes(low) ||
        (p.convocatoriaTitulo || '').toLowerCase().includes(low)
      );
    }
    result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return result;
  }, [postulaciones, filterEstado, filterConvocatoria, searchTerm]);

  // ── Status change ────────────────────────────────────────────────────
  const handleStatusChange = async (postId: string, newStatus: PostulacionEstado) => {
    const postToUpdate = postulaciones.find(p => p.id === postId);
    if (!postToUpdate) return;
    const oldStatus = postToUpdate.estado;

    if (newStatus === 'EN_REVISION') {
      const hasAudition = getAudicionPrincipal(postToUpdate);
      if (!hasAudition) {
        setToastMessage('Programa una audición para enviar esta postulación al profesor.');
        handleOpenScheduleModal(postToUpdate);
        return;
      }
    }

    // Optimistic update
    setPostulaciones(prev => prev.map(p => p.id === postId ? { ...p, estado: newStatus } : p));
    setUpdatingIds(prev => ({ ...prev, [postId]: true }));

    try {
      await postulacionService.updatePostulacionStatus(postId, newStatus);
      await loadData(true); // Silent reload to keep other things in sync
    } catch (err: any) {
      // Revert on failure
      setPostulaciones(prev => prev.map(p => p.id === postId ? { ...p, estado: oldStatus } : p));
      setToastMessage(err.message || 'Error al actualizar el estado.');
    } finally {
      setUpdatingIds(prev => {
        const next = { ...prev };
        delete next[postId];
        return next;
      });
    }
  };

  // ── Stats ────────────────────────────────────────────────────────────
  const stats = useMemo(() => ({
    total: postulaciones.length,
    pendientes: postulaciones.filter(p => p.estado === 'PENDIENTE').length,
    enRevision: postulaciones.filter(p => p.estado === 'EN_REVISION').length,
    aceptadas: postulaciones.filter(p => p.estado === 'ACEPTADA').length,
  }), [postulaciones]);

  // ── Audicion Actions ─────────────────────────────────────────────────
  const handleCancelarAudicion = (audicionId: string) => {
    setCancelingAudicionId(audicionId);
  };

  const executeCancelarAudicion = async (audicionId: string) => {
    try {
      await audicionService.cancelarAudicion(audicionId);
      await loadData(true);
      setToastMessage('Audición cancelada con éxito.');
    } catch (err: any) {
      setToastMessage(err.message || 'Error al cancelar la audición.');
    }
  };

  const handleOpenScheduleModal = (post: Postulacion) => {
    setSelectedPostulacion(post);
    setScheduleProfesorId('');
    setScheduleFecha('');
    setScheduleHora('');
    setScheduleModalidad('ONLINE');
    setScheduleLugar('');
    setScheduleLink('');
    setFormError(null);
    setShowScheduleModal(true);
  };

  const handleScheduleAudicion = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!selectedPostulacion) return;
    if (!scheduleProfesorId) {
      setFormError('Debe seleccionar un profesor.');
      return;
    }
    if (!scheduleFecha || !scheduleHora) {
      setFormError('Debe ingresar la fecha y hora de la audición.');
      return;
    }
    if (!scheduleLugar.trim()) {
      setFormError('Debe especificar un lugar o dirección.');
      return;
    }

    setSubmittingSchedule(true);
    try {
      await audicionService.crearAudicion({
        postulacionId: selectedPostulacion.id,
        profesorId: scheduleProfesorId,
        fecha: scheduleFecha,
        hora: scheduleHora,
        modalidad: scheduleModalidad,
        lugar: scheduleLugar.trim(),
        link: scheduleLink.trim() || undefined,
      });

      // Pasar postulación a EN_REVISION si estaba en PENDIENTE
      if (selectedPostulacion.estado === 'PENDIENTE') {
        try {
          await postulacionService.updatePostulacionStatus(selectedPostulacion.id, 'EN_REVISION');
        } catch (err: any) {
          console.warn('No se pudo actualizar el estado de la postulación de forma automática:', err);
        }
      }

      setShowScheduleModal(false);
      await loadData(true);
      setToastMessage('Audición programada correctamente');
    } catch (err: any) {
      setFormError(err.message || 'No se pudo programar la audición. Intenta nuevamente.');
    } finally {
      setSubmittingSchedule(false);
    }
  };

  // Helper to select the main audition to display for a application card
  const getAudicionPrincipal = (post: Postulacion): Audicion | undefined => {
    if (!post.audicionId) return undefined;
    return {
      id: post.audicionId,
      postulacionId: post.id,
      alumnoId: post.alumnoId || '',
      profesorId: '',
      alumnoNombre: post.userName || '',
      alumnoEmail: post.userEmail || '',
      alumnoTelefono: post.userPhone || '',
      profesorNombre: post.audicionProfesorNombre || 'Profesor',
      profesorEspecialidad: '',
      convocatoriaTitulo: post.convocatoriaTitulo || '',
      convocatoriaCategoria: post.convocatoriaCategoria || '',
      fecha: post.audicionFecha || '',
      hora: post.audicionHora || '',
      modalidad: (post.audicionModalidad as any) || 'ONLINE',
      lugar: post.audicionLugar || '',
      link: post.audicionLink,
      estado: (post.audicionEstado as any) || 'PROGRAMADA',
      puntaje: post.audicionPuntaje,
      observaciones: post.audicionObservaciones,
      resultado: (post.audicionResultado as any) || 'PENDIENTE',
      createdAt: '',
      updatedAt: '',
    };
  };

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
        <button onClick={() => loadData()} className="mt-4 text-[10px] text-red-400 underline uppercase tracking-widest font-bold">Reintentar</button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Visual Toast Notification */}
      {toastMessage && (
        <div className="fixed top-24 right-6 md:right-12 z-[100] max-w-sm w-full bg-[#121212]/95 border border-sud-orange/30 backdrop-blur-md rounded-2xl p-4 shadow-2xl flex items-start gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
          <AlertCircle className="text-sud-orange shrink-0 mt-0.5" size={16} />
          <div className="flex-1">
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Notificación</p>
            <p className="text-xs text-white leading-relaxed mt-1">{toastMessage}</p>
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="text-slate-500 hover:text-white p-0.5 rounded transition-colors cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>
      )}

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
            className="sud-glass-panel p-6 md:p-8 flex flex-col md:flex-row items-start md:items-stretch justify-between gap-6 group hover:border-white/20 transition-all"
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
                    Convocatoria: {post.convocatoriaTitulo || 'Sin título'}
                  </span>
                  {post.convocatoriaCategoria ? (
                    <span className="text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-md bg-sky-400/10 text-sky-400 border border-sky-400/20">
                      Requerido: {post.convocatoriaCategoria}
                    </span>
                  ) : (
                    <span className="text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-md bg-slate-500/10 text-slate-500 border border-white/10">
                      Sin categoría asociada
                    </span>
                  )}
                  <span className="text-[9px] text-slate-600 font-bold">
                    {new Date(post.createdAt).toLocaleDateString()}
                  </span>
                </div>

                {/* Especialidades del postulante */}
                <div className="flex items-center gap-2 flex-wrap mt-2">
                  <span className="text-[8px] font-black uppercase tracking-widest text-slate-500">
                    Especialidades del Postulante:
                  </span>
                  {post.alumnoSpecialties ? (
                    post.alumnoSpecialties.split(',').map((spec, sIdx) => (
                      <span
                        key={sIdx}
                        className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md bg-sud-orange/10 text-sud-orange border border-sud-orange/20"
                      >
                        {spec.trim()}
                      </span>
                    ))
                  ) : (
                    <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md bg-slate-500/10 text-slate-500 border border-white/5 italic">
                      Sin especialidad definida
                    </span>
                  )}
                </div>

                {/* Sección de Audición Asociada */}
                {(() => {
                  const postAudicion = getAudicionPrincipal(post);
                  
                  // Si NO hay audición
                  if (!postAudicion) {
                    if (post.estado === 'PENDIENTE' || post.estado === 'EN_REVISION') {
                      return (
                        <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
                          <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Sin audición programada</span>
                          <button
                            onClick={() => handleOpenScheduleModal(post)}
                            className="px-4 py-2 bg-sud-orange/10 hover:bg-sud-orange/20 border border-sud-orange/30 text-sud-orange text-[9px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center gap-1.5"
                          >
                            <Calendar size={12} />
                            Programar Audición
                          </button>
                        </div>
                      );
                    }
                    if (post.estado === 'ACEPTADA' || post.estado === 'RECHAZADA') {
                      return (
                        <div className="mt-4 pt-3 border-t border-white/5 flex items-center">
                          <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1.5 rounded-xl border ${
                            post.estado === 'ACEPTADA'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : 'bg-red-500/10 text-red-400 border-red-500/20'
                          }`}>
                            {post.estado === 'ACEPTADA'
                              ? 'Postulación aceptada — audición no requerida'
                              : 'Postulación rechazada — audición no requerida'}
                          </span>
                        </div>
                      );
                    }
                    return null;
                  }

                  // Si SÍ hay audición
                  const showControls = post.estado === 'PENDIENTE' || post.estado === 'EN_REVISION';
                  
                  return (
                    <div className="mt-4 p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-3">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Audición:</span>
                          {postAudicion.estado === 'PROGRAMADA' && (
                            <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20">
                              PROGRAMADA
                            </span>
                          )}
                          {postAudicion.estado === 'EVALUADA' && (
                            <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border ${
                              postAudicion.resultado === 'APROBADA'
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                : 'bg-red-500/10 text-red-400 border-red-500/20'
                            }`}>
                              EVALUADA • {postAudicion.resultado}
                            </span>
                          )}
                          {postAudicion.estado === 'CANCELADA' && (
                            <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md bg-slate-600/10 text-slate-400 border border-white/10 line-through">
                              CANCELADA
                            </span>
                          )}
                        </div>

                        {showControls && postAudicion.estado === 'PROGRAMADA' && (
                          <button
                            onClick={() => handleCancelarAudicion(postAudicion.id)}
                            className="text-[9px] text-red-400 hover:text-red-300 font-bold uppercase tracking-widest underline decoration-dashed shrink-0"
                          >
                            Cancelar Audición
                          </button>
                        )}
                        {showControls && postAudicion.estado === 'CANCELADA' && (
                          <button
                            onClick={() => handleOpenScheduleModal(post)}
                            className="px-3 py-1.5 bg-sud-orange/10 hover:bg-sud-orange/20 border border-sud-orange/30 text-sud-orange text-[8px] font-black uppercase tracking-widest rounded-lg transition-all"
                          >
                            Programar Nueva Audición
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[10px] text-slate-400">
                        <div className="space-y-1.5">
                          <p className="flex items-center gap-1.5 font-medium"><User size={12} className="text-slate-500" /> <span className="font-bold text-slate-500 text-[9px] uppercase tracking-wider">Evaluador:</span> {postAudicion.profesorNombre}</p>
                          <p className="flex items-center gap-1.5 font-medium"><Calendar size={12} className="text-slate-500" /> <span className="font-bold text-slate-500 text-[9px] uppercase tracking-wider">Fecha/Hora:</span> {postAudicion.fecha} a las {postAudicion.hora}</p>
                        </div>
                        <div className="space-y-1.5">
                          <p className="flex items-center gap-1.5 font-medium"><MapPin size={12} className="text-slate-500" /> <span className="font-bold text-slate-500 text-[9px] uppercase tracking-wider">Lugar ({postAudicion.modalidad}):</span> {postAudicion.lugar}</p>
                          {postAudicion.link && (
                            <p className="flex items-center gap-1.5 font-medium truncate">
                              <LinkIcon size={12} className="text-slate-500 shrink-0" />
                              <span className="font-bold text-slate-500 text-[9px] uppercase tracking-wider shrink-0">Enlace:</span>
                              <a href={postAudicion.link.startsWith('http') ? postAudicion.link : `https://${postAudicion.link}`} target="_blank" rel="noopener noreferrer" className="text-sud-turquoise hover:underline truncate">
                                {postAudicion.link}
                              </a>
                            </p>
                          )}
                        </div>
                      </div>

                      {postAudicion.estado === 'EVALUADA' && (
                        <div className="mt-2.5 p-3 rounded-xl bg-black/40 border border-white/5 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] uppercase font-black tracking-widest text-slate-500">Puntaje Recibido:</span>
                            <span className="text-sm font-black text-white">{postAudicion.puntaje}/100</span>
                          </div>
                          {postAudicion.observaciones && (
                            <p className="text-[10px] leading-relaxed text-slate-400 italic font-medium">
                              "{postAudicion.observaciones}"
                            </p>
                          )}
                        </div>
                      )}

                      {!showControls && (
                        <div className="mt-1 pt-2 border-t border-white/5 flex items-center justify-between">
                          <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded border ${
                            post.estado === 'ACEPTADA'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : 'bg-red-500/10 text-red-400 border-red-500/20'
                          }`}>
                            {post.estado === 'ACEPTADA'
                              ? 'Flujo cerrado — Postulación Aceptada'
                              : 'Flujo cerrado — Postulación Rechazada'}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>

            <div className="flex md:flex-col justify-between items-center md:items-end gap-4 shrink-0">
              <StatusBadge status={post.estado} size="md" />
              <div className="relative">
                <select 
                  value={post.estado}
                  disabled={updatingIds[post.id]}
                  onChange={(e) => handleStatusChange(post.id, e.target.value as PostulacionEstado)}
                  className={`text-[9px] font-black uppercase tracking-widest px-3 py-2 rounded-xl bg-black border border-white/10 outline-none text-slate-400 appearance-none pr-8 min-w-[130px] ${
                    updatingIds[post.id] ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  <option value="PENDIENTE">Pendiente (Inicial)</option>
                  <option value="EN_REVISION">Enviar a Profesor</option>
                  <option value="ACEPTADA">Aceptar Postulación (Final)</option>
                  <option value="RECHAZADA">Rechazar Postulación (Final)</option>
                </select>
                <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none" />
              </div>
              {updatingIds[post.id] && (
                <div className="w-4 h-4 border-2 border-sud-turquoise/20 border-t-sud-turquoise rounded-full animate-spin shrink-0" />
              )}
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

      {/* ── Modal Programar Audición ─────────────────────────────────── */}
      <AnimatePresence>
        {showScheduleModal && selectedPostulacion && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 backdrop-blur-md bg-black/60">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="sud-glass-panel w-full max-w-lg p-10 relative overflow-hidden max-h-[90vh] overflow-y-auto"
            >
              <button 
                onClick={() => setShowScheduleModal(false)} 
                className="absolute top-6 right-6 text-slate-500 hover:text-white"
              >
                <X size={20} />
              </button>
              
              <h3 className="text-xl font-black text-white mb-2 uppercase tracking-tight">Programar Audición</h3>
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mb-4">
                Postulante: {selectedPostulacion.userName}
              </p>

              {/* Explicación breve de qué es una audición */}
              <div className="mb-6 p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex gap-3 text-[10px] text-slate-400 leading-relaxed">
                <AlertCircle className="text-sud-orange shrink-0 mt-0.5" size={14} />
                <p>
                  La audición es una evaluación asignada al profesor. Al programar la audición, la postulación pasará al panel del profesor asignado para su evaluación.
                </p>
              </div>

              {formError && (
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-xs font-bold">
                  {formError}
                </div>
              )}

              <form onSubmit={handleScheduleAudicion} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-slate-500 px-1 tracking-widest">Evaluador (Profesor) *</label>
                  <div className="relative">
                    <select
                      value={scheduleProfesorId}
                      onChange={e => setScheduleProfesorId(e.target.value)}
                      className="sud-input w-full appearance-none pr-10"
                    >
                      <option value="">— Seleccione Evaluador —</option>
                      {profesores.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.especialidad})
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-slate-500 px-1 tracking-widest">Fecha *</label>
                    <div className="relative cursor-pointer">
                      <Calendar size={12} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      <input
                        ref={dateRef}
                        type="date"
                        value={scheduleFecha}
                        onChange={e => setScheduleFecha(e.target.value)}
                        onClick={() => {
                          try {
                            dateRef.current?.showPicker();
                          } catch (err) {
                            console.warn("showPicker no soportado:", err);
                          }
                        }}
                        style={{ colorScheme: 'dark' }}
                        className="sud-input w-full text-xs py-2.5 pl-9 pr-3.5 bg-black/50 text-white cursor-pointer"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-slate-500 px-1 tracking-widest">Hora *</label>
                    <div className="relative cursor-pointer">
                      <Clock size={12} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      <input
                        ref={timeRef}
                        type="time"
                        value={scheduleHora}
                        onChange={e => setScheduleHora(e.target.value)}
                        onClick={() => {
                          try {
                            timeRef.current?.showPicker();
                          } catch (err) {
                            console.warn("showPicker no soportado:", err);
                          }
                        }}
                        style={{ colorScheme: 'dark' }}
                        className="sud-input w-full text-xs py-2.5 pl-9 pr-3.5 bg-black/50 text-white cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-slate-500 px-1 tracking-widest">Modalidad *</label>
                    <div className="relative">
                      <select
                        value={scheduleModalidad}
                        onChange={e => setScheduleModalidad(e.target.value as AudicionModalidad)}
                        className="sud-input w-full appearance-none pr-10"
                      >
                        <option value="ONLINE">ONLINE</option>
                        <option value="PRESENCIAL">PRESENCIAL</option>
                      </select>
                      <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-slate-500 px-1 tracking-widest">Lugar / Plataforma *</label>
                    <input
                      type="text"
                      value={scheduleLugar}
                      onChange={e => setScheduleLugar(e.target.value)}
                      className="sud-input w-full"
                      placeholder="Ej: Zoom, Sala A, etc."
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-slate-500 px-1 tracking-widest">Enlace de la Videollamada (Opcional)</label>
                  <input
                    type="text"
                    value={scheduleLink}
                    onChange={e => setScheduleLink(e.target.value)}
                    className="sud-input w-full"
                    placeholder="https://zoom.us/j/..."
                  />
                </div>

                <button
                  type="submit"
                  disabled={submittingSchedule}
                  className="w-full sud-btn-primary py-4 uppercase tracking-widest font-black text-xs mt-3 flex items-center justify-center gap-2"
                >
                  {submittingSchedule && (
                    <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                  )}
                  <span>Programar Audición</span>
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Confirmación de Cancelación */}
      <AnimatePresence>
        {cancelingAudicionId && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative max-w-sm w-full bg-[#0f0f0f] border border-white/10 rounded-3xl p-6 space-y-6 text-center shadow-2xl"
            >
              <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center mx-auto animate-pulse">
                <AlertCircle size={24} />
              </div>
              <div className="space-y-2">
                <h4 className="text-lg font-black text-white uppercase tracking-tight">¿Cancelar Audición?</h4>
                <p className="text-slate-400 text-xs leading-relaxed">Esta acción cancelará la audición programada y no se puede deshacer.</p>
              </div>
              <div className="flex gap-3 justify-center">
                <button
                  type="button"
                  onClick={() => setCancelingAudicionId(null)}
                  className="px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-white/5 border border-white/10 text-slate-400 hover:bg-white/10 transition-all cursor-pointer"
                >
                  Atrás
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const id = cancelingAudicionId;
                    setCancelingAudicionId(null);
                    await executeCancelarAudicion(id);
                  }}
                  className="px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30 transition-all cursor-pointer"
                >
                  Confirmar Cancelación
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}


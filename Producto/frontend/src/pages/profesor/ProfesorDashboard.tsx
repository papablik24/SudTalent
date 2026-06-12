import React, { useState, useEffect } from 'react';
import { 
  LogOut, 
  GraduationCap, 
  Clock, 
  Award, 
  Users, 
  BookOpen, 
  ChevronLeft, 
  Send, 
  Link as LinkIcon, 
  Trash2, 
  Calendar, 
  FileText,
  AlertCircle,
  X
} from 'lucide-react';
import { UserProfile, CursoDTO } from '../../types';
import { profesorService, ProfesorDTO } from '../../services/profesorService';
import { cursoService } from '../../services/cursoService';
import { anuncioService, AnuncioDTO } from '../../services/anuncioService';
import { convocatoriaService, Convocatoria } from '../../services/convocatoriaService';

interface ProfesorDashboardProps {
  user: UserProfile;
  onLogout: () => void;
}

interface DisplayCurso {
  id: string;
  titulo: string;
  modalidad: string;
  descripcion?: string;
}

export function ProfesorDashboard({ user, onLogout }: ProfesorDashboardProps) {
  const [profesorData, setProfesorData] = useState<ProfesorDTO | null>(null);
  const [realCursos, setRealCursos] = useState<CursoDTO[]>([]);
  const [convocatorias, setConvocatorias] = useState<Convocatoria[]>([]);
  
  // Selection and Detail View State
  const [selectedCurso, setSelectedCurso] = useState<DisplayCurso | null>(null);
  const [anuncios, setAnuncios] = useState<AnuncioDTO[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  
  // Loading & Error States
  const [loading, setLoading] = useState(true);
  const [loadingAnuncios, setLoadingAnuncios] = useState(false);
  const [loadingConvocatorias, setLoadingConvocatorias] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [anunciosError, setAnunciosError] = useState<string | null>(null);

  // Form State for new announcements
  const [anuncioTitulo, setAnuncioTitulo] = useState('');
  const [anuncioContenido, setAnuncioContenido] = useState('');
  const [anuncioUrl, setAnuncioUrl] = useState('');
  const [anuncioTipo, setAnuncioTipo] = useState<'ANUNCIO' | 'CAPSULA'>('ANUNCIO');
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);

  // Fetch Profesor profile, courses and convocatorias
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const profData = await profesorService.getById(user.uid);
        setProfesorData(profData);

        try {
          const cursosData = await cursoService.getByProfesor(user.uid);
          setRealCursos(cursosData);
        } catch (cursosErr) {
          console.warn('Error al cargar cursos relacionales, usando fallback:', cursosErr);
        }
      } catch (err: any) {
        console.error('Error al cargar datos del profesor:', err);
        setError(err.message || 'Error al cargar perfil del profesor.');
      } finally {
        setLoading(false);
      }
    };
    
    const fetchConvocatorias = async () => {
      setLoadingConvocatorias(true);
      try {
        const convData = await convocatoriaService.getConvocatoriasActivas();
        setConvocatorias(convData);
      } catch (convErr) {
        console.error('Error al cargar convocatorias activas:', convErr);
      } finally {
        setLoadingConvocatorias(false);
      }
    };

    fetchData();
    fetchConvocatorias();
  }, [user.uid]);

  // Auto-hide toast after 4 seconds
  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => {
      setToastMessage(null);
    }, 4000);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  // Load announcements when a course is selected
  useEffect(() => {
    if (!selectedCurso || selectedCurso.id.startsWith('legacy-')) {
      setAnuncios([]);
      return;
    }
    const loadAnuncios = async () => {
      setLoadingAnuncios(true);
      setAnunciosError(null);
      try {
        const data = await anuncioService.getAnuncios(selectedCurso.id);
        setAnuncios(data);
      } catch (err: any) {
        console.error('Error al cargar anuncios del curso:', err);
        setAnunciosError(err.message || 'Error al cargar los anuncios.');
      } finally {
        setLoadingAnuncios(false);
      }
    };
    loadAnuncios();
  }, [selectedCurso]);

  // Map courses to DisplayCurso list (supporting relational and legacy string split fallbacks)
  const displayCursos: DisplayCurso[] = realCursos.length > 0
    ? realCursos.map(rc => ({
        id: rc.id,
        titulo: rc.titulo,
        modalidad: rc.modalidad || 'Docencia Oficial',
        descripcion: rc.descripcion
      }))
    : (profesorData?.cursosAsignados
        ? profesorData.cursosAsignados.split(',').map(c => c.trim()).filter(Boolean).map((c, idx) => ({
            id: `legacy-${idx}`,
            titulo: c,
            modalidad: 'Docencia Oficial'
          }))
        : []);

  // Handler for publishing a new announcement
  const handlePublishAnuncio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCurso) return;
    if (selectedCurso.id.startsWith('legacy-')) {
      setPublishError('No se pueden publicar anuncios en cursos heredados no vinculados.');
      return;
    }
    if (!anuncioTitulo.trim() || !anuncioContenido.trim()) {
      setPublishError('El título y el contenido son campos obligatorios.');
      return;
    }

    setPublishing(true);
    setPublishError(null);
    try {
      const created = await anuncioService.create(selectedCurso.id, {
        tipo: anuncioTipo,
        titulo: anuncioTitulo.trim(),
        contenido: anuncioContenido.trim(),
        urlRecurso: anuncioUrl.trim() || undefined
      });
      setAnuncios(prev => [created, ...prev]);
      setAnuncioTitulo('');
      setAnuncioContenido('');
      setAnuncioUrl('');
      setAnuncioTipo('ANUNCIO');
    } catch (err: any) {
      console.error('Error al publicar anuncio:', err);
      setPublishError(err.message || 'No se pudo publicar el anuncio.');
    } finally {
      setPublishing(false);
    }
  };

  // Handler for deleting an announcement (only authorized if authored by user)
  const handleDeleteAnuncio = async (anuncioId: string) => {
    if (!selectedCurso) return;
    if (window.confirm('¿Estás seguro de que deseas eliminar este anuncio?')) {
      try {
        await anuncioService.delete(selectedCurso.id, anuncioId);
        setAnuncios(prev => prev.filter(a => a.id !== anuncioId));
      } catch (err: any) {
        alert(err.message || 'Error al eliminar anuncio');
      }
    }
  };

  // Refs
  const cursosRef = React.useRef<HTMLDivElement>(null);

  // Click Handlers for Top Info Cards
  const handleMisCursosClick = () => {
    if (displayCursos.length === 1) {
      setSelectedCurso(displayCursos[0]);
    } else {
      cursosRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleMisAlumnosClick = () => {
    setToastMessage('La gestión de alumnos por curso estará disponible próximamente.');
  };

  const handleMiAgendaClick = () => {
    setToastMessage('La agenda de clases estará disponible próximamente.');
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-slate-100 relative overflow-hidden flex flex-col justify-between">
      {/* Background gradients */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-sud-turquoise/[0.03] blur-[150px] rounded-full -mr-48 -mt-48 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-sud-orange/[0.02] blur-[150px] rounded-full -ml-48 -mb-48 pointer-events-none" />

      {/* Navigation Header */}
      <header className="border-b border-white/5 bg-black/30 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sud-gradient p-[1px]">
              <div className="w-full h-full rounded-[0.6rem] bg-black flex items-center justify-center">
                <GraduationCap className="text-sud-turquoise" size={20} />
              </div>
            </div>
            <div>
              <span className="text-sm font-black tracking-tight text-white uppercase">SudTalent</span>
              <span className="block text-[8px] text-sud-turquoise font-black uppercase tracking-widest -mt-1">Docentes</span>
            </div>
          </div>

          <button
            onClick={onLogout}
            className="px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-black uppercase tracking-widest text-slate-300 hover:text-white flex items-center gap-2 transition-all cursor-pointer"
          >
            <LogOut size={14} /> Cerrar Sesión
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl mx-auto px-6 py-12 z-10 w-full relative">
        {/* Visual Toast Notification */}
        {toastMessage && (
          <div className="fixed top-24 right-6 md:right-12 z-[100] max-w-sm w-full bg-[#121212]/95 border border-sud-orange/30 backdrop-blur-md rounded-2xl p-4 shadow-2xl flex items-start gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
            <Award className="text-sud-orange shrink-0 mt-0.5" size={16} />
            <div className="flex-1">
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Aviso de la Plataforma</p>
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
        {!selectedCurso ? (
          /* ========================================================
             WELCOME & GENERAL VIEW
             ======================================================== */
          <div className="space-y-12">
            {/* Welcome Section */}
            <div className="text-center space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-sud-turquoise/10 border border-sud-turquoise/20 text-[9px] font-black text-sud-turquoise uppercase tracking-widest mx-auto">
                <Award size={12} /> Espacio Docente Activo
              </div>
              <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-white">
                ¡Hola, Profesor <span className="sud-vibrant-text-gradient uppercase">{user.name || 'Docente'}</span>!
              </h1>
              <p className="text-slate-400 text-sm max-w-xl mx-auto leading-relaxed">
                Te damos la bienvenida al portal de profesores de SudTalent. Administra tus asignaturas y publica anuncios o material directamente.
              </p>
            </div>

            {/* Info Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 w-full max-w-3xl mx-auto">
              {[
                { 
                  icon: <Users className="text-sud-turquoise" size={24} />, 
                  label: 'Mis Alumnos', 
                  desc: 'Próximamente gestión de estudiantes',
                  onClick: handleMisAlumnosClick
                },
                { 
                  icon: <BookOpen className="text-sud-orange" size={24} />, 
                  label: 'Mis Cursos', 
                  desc: loading 
                    ? 'Cargando cursos...' 
                    : displayCursos.length > 0 
                      ? `${displayCursos.length} curso(s) asignado(s)` 
                      : 'Aún no tienes cursos asignados',
                  onClick: handleMisCursosClick
                },
                { 
                  icon: <Clock className="text-violet-400" size={24} />, 
                  label: 'Mi Agenda', 
                  desc: 'Planificación de clases y horarios',
                  onClick: handleMiAgendaClick
                },
              ].map((item, i) => (
                <button 
                  key={i} 
                  onClick={item.onClick}
                  className="sud-glass-panel p-6 border-white/5 text-center flex flex-col items-center space-y-3 hover:border-white/20 hover:bg-white/[0.01] hover:scale-[1.01] transition-all cursor-pointer w-full text-slate-300 hover:text-white"
                >
                  <div className="w-12 h-12 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-center">
                    {item.icon}
                  </div>
                  <h3 className="text-sm font-black uppercase tracking-tight">{item.label}</h3>
                  <p className="text-[10px] text-slate-500 font-medium leading-relaxed">{item.desc}</p>
                </button>
              ))}
            </div>

            {/* Cursos Asignados Section */}
            <div ref={cursosRef} className="space-y-6">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <h2 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-2">
                  <BookOpen className="text-sud-orange" size={20} /> Mis Cursos Asignados
                </h2>
                <span className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded bg-white/5 border border-white/10 text-slate-400">
                  Selecciona uno para entrar
                </span>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-10">
                  <div className="w-8 h-8 border-3 border-sud-orange/20 border-t-sud-orange rounded-full animate-spin" />
                </div>
              ) : error ? (
                <div className="p-6 text-center border border-red-500/20 rounded-2xl bg-red-500/5 text-red-400 text-xs font-bold uppercase tracking-widest">
                  {error}
                </div>
              ) : displayCursos.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {displayCursos.map((curso, idx) => (
                    <button 
                      key={idx}
                      onClick={() => setSelectedCurso(curso)}
                      className="text-left w-full sud-glass-panel p-5 border-white/5 hover:border-sud-orange/40 hover:bg-sud-orange/[0.01] hover:scale-[1.01] transition-all flex items-start gap-4 cursor-pointer group"
                    >
                      <div className="w-10 h-10 rounded-xl bg-sud-orange/10 border border-sud-orange/20 flex items-center justify-center shrink-0 group-hover:bg-sud-orange/20 transition-all">
                        <Award className="text-sud-orange" size={18} />
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-xs font-black text-white uppercase tracking-tight leading-snug group-hover:text-sud-orange transition-colors">{curso.titulo}</h3>
                        <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">{curso.modalidad}</p>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center border-2 border-dashed border-white/5 rounded-3xl bg-white/[0.005]">
                  <BookOpen size={32} className="mx-auto text-slate-700 mb-4" />
                  <p className="text-slate-500 font-black uppercase tracking-widest text-[10px]">
                    Aún no tienes cursos asignados
                  </p>
                </div>
              )}
            </div>

            {/* Convocatorias Activas Section */}
            <div className="space-y-6 pt-4">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <h2 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-2">
                  <Calendar className="text-sud-turquoise" size={20} /> Convocatorias Activas
                </h2>
                <span className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded bg-white/5 border border-white/10 text-slate-400">
                  Oportunidades de Doblaje y Locución
                </span>
              </div>

              {loadingConvocatorias ? (
                <div className="flex items-center justify-center py-10">
                  <div className="w-8 h-8 border-3 border-sud-turquoise/20 border-t-sud-turquoise rounded-full animate-spin" />
                </div>
              ) : convocatorias.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {convocatorias.map((conv) => (
                    <div 
                      key={conv.id} 
                      className="sud-glass-panel p-5 border-white/5 hover:border-white/10 transition-all flex flex-col justify-between gap-4"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-sud-turquoise/10 text-sud-turquoise border border-sud-turquoise/20">
                            {conv.categoria}
                          </span>
                          <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            {conv.estado}
                          </span>
                        </div>
                        <h3 className="text-xs font-black text-white uppercase tracking-tight leading-snug">{conv.titulo}</h3>
                        <p className="text-[10px] text-slate-400 line-clamp-3 leading-relaxed">{conv.descripcion}</p>
                      </div>
                      <div className="flex items-center justify-between border-t border-white/5 pt-3 text-[9px] text-slate-500 font-bold uppercase tracking-widest">
                        <span className="flex items-center gap-1">
                          <Calendar size={11} /> Límite: {conv.fechaLimite ? new Date(conv.fechaLimite).toLocaleDateString() : 'Sin definir'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center border-2 border-dashed border-white/5 rounded-3xl bg-white/[0.005]">
                  <Calendar size={32} className="mx-auto text-slate-700 mb-4" />
                  <p className="text-slate-500 font-black uppercase tracking-widest text-[10px]">
                    No hay convocatorias activas en este momento
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* ========================================================
             COURSE DETAIL VIEW
             ======================================================== */
          <div className="space-y-8">
            {/* Back header button */}
            <button
              onClick={() => setSelectedCurso(null)}
              className="inline-flex items-center gap-2 text-[10px] text-slate-400 hover:text-white font-black uppercase tracking-widest border border-white/10 hover:border-white/20 bg-white/5 px-4 py-2 rounded-xl transition-all cursor-pointer"
            >
              <ChevronLeft size={14} /> Volver a Cursos
            </button>

            {/* Course Header */}
            <div className="p-6 md:p-8 rounded-[2rem] border border-white/5 bg-gradient-to-r from-sud-orange/[0.03] to-violet-500/[0.01] relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-sud-orange/[0.03] blur-[80px] rounded-full pointer-events-none" />
              <div className="space-y-3 relative z-10">
                <span className="text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded bg-sud-orange/15 text-sud-orange border border-sud-orange/20">
                  {selectedCurso.modalidad}
                </span>
                <h2 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tight leading-tight">
                  {selectedCurso.titulo}
                </h2>
                {selectedCurso.descripcion && (
                  <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">{selectedCurso.descripcion}</p>
                )}
              </div>
            </div>

            {/* Content section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Tablon de Anuncios */}
              <div className="lg:col-span-2 space-y-6">
                <h3 className="text-md font-black text-white uppercase tracking-tight border-b border-white/5 pb-2 flex items-center gap-2">
                  <FileText className="text-sud-turquoise" size={18} /> Tablón de Anuncios y Materiales
                </h3>

                {loadingAnuncios ? (
                  <div className="flex justify-center items-center py-12">
                    <div className="w-8 h-8 border-3 border-sud-turquoise/20 border-t-sud-turquoise rounded-full animate-spin" />
                  </div>
                ) : anunciosError ? (
                  <div className="p-4 border border-red-500/20 rounded-xl bg-red-500/5 text-red-400 text-xs font-bold text-center">
                    {anunciosError}
                  </div>
                ) : anuncios.length > 0 ? (
                  <div className="space-y-4">
                    {anuncios.map((anuncio) => (
                      <div key={anuncio.id} className="sud-glass-panel p-5 border-white/5 hover:border-white/10 transition-all space-y-3 relative group">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 text-xs font-bold">
                              {anuncio.autorNombre ? anuncio.autorNombre.substring(0, 2).toUpperCase() : 'SV'}
                            </div>
                            <div>
                              <p className="text-[10px] font-black text-white uppercase tracking-tight">{anuncio.autorNombre}</p>
                              <p className="text-[8px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">
                                {new Date(anuncio.createdAt).toLocaleString()}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className={`text-[7px] font-black uppercase tracking-widest px-2 py-0.5 rounded border ${
                              anuncio.tipo === 'CAPSULA' 
                                ? 'bg-violet-500/10 text-violet-400 border-violet-500/20' 
                                : 'bg-sud-orange/10 text-sud-orange border-sud-orange/20'
                            }`}>
                              {anuncio.tipo === 'CAPSULA' ? 'Material / Cápsula' : 'Anuncio'}
                            </span>
                            
                            {anuncio.autorId === user.uid && (
                              <button
                                onClick={() => handleDeleteAnuncio(anuncio.id)}
                                className="p-1 rounded bg-red-500/5 border border-red-500/10 text-red-400 hover:bg-red-500/20 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                title="Eliminar anuncio"
                              >
                                <Trash2 size={12} />
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="space-y-1.5 pl-1">
                          <h4 className="text-xs font-black text-white uppercase tracking-tight">{anuncio.titulo}</h4>
                          <p className="text-[10px] text-slate-400 whitespace-pre-wrap leading-relaxed">{anuncio.contenido}</p>
                        </div>

                        {anuncio.urlRecurso && (
                          <div className="pt-2 pl-1">
                            <a
                              href={anuncio.urlRecurso.startsWith('http') ? anuncio.urlRecurso : `https://${anuncio.urlRecurso}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-[9px] font-black text-sud-turquoise uppercase tracking-widest transition-all"
                            >
                              <LinkIcon size={12} /> Ir al Recurso Adjunto
                            </a>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-12 text-center border border-dashed border-white/5 rounded-2xl bg-white/[0.005]">
                    <FileText size={24} className="mx-auto text-slate-700 mb-3" />
                    <p className="text-slate-500 font-black uppercase tracking-widest text-[9px]">
                      Aún no hay anuncios publicados en este curso
                    </p>
                  </div>
                )}
              </div>

              {/* Formulario de Publicacion */}
              <div className="space-y-6">
                <h3 className="text-md font-black text-white uppercase tracking-tight border-b border-white/5 pb-2 flex items-center gap-2">
                  <Send className="text-sud-orange" size={18} /> Publicar Nuevo
                </h3>

                <form onSubmit={handlePublishAnuncio} className="sud-glass-panel p-5 border-white/5 space-y-4">
                  {publishError && (
                    <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-bold flex items-center gap-2">
                      <AlertCircle size={14} className="shrink-0" />
                      {publishError}
                    </div>
                  )}

                  {/* Tipo */}
                  <div>
                    <label className="block text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1.5">
                      Tipo de Publicación
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { val: 'ANUNCIO', label: 'Anuncio' },
                        { val: 'CAPSULA', label: 'Material/Cápsula' }
                      ].map((t) => (
                        <button
                          key={t.val}
                          type="button"
                          onClick={() => setAnuncioTipo(t.val as any)}
                          className={`py-2 text-[9px] font-black uppercase tracking-widest rounded-lg border transition-all cursor-pointer ${
                            anuncioTipo === t.val
                              ? 'bg-sud-orange/10 border-sud-orange/40 text-white'
                              : 'bg-white/5 border-white/5 text-slate-400 hover:text-white'
                          }`}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Titulo */}
                  <div>
                    <label className="block text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1.5">
                      Título *
                    </label>
                    <input
                      type="text"
                      value={anuncioTitulo}
                      onChange={e => setAnuncioTitulo(e.target.value)}
                      placeholder="Ej: Instrucciones Tarea 2"
                      className="sud-input w-full text-xs py-2.5 px-3.5"
                    />
                  </div>

                  {/* Contenido */}
                  <div>
                    <label className="block text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1.5">
                      Mensaje / Contenido *
                    </label>
                    <textarea
                      value={anuncioContenido}
                      onChange={e => setAnuncioContenido(e.target.value)}
                      placeholder="Escribe el mensaje o la descripción del material aquí..."
                      rows={5}
                      className="sud-input w-full text-xs py-2.5 px-3.5 resize-none"
                    />
                  </div>

                  {/* Link opcional */}
                  <div>
                    <label className="block text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1.5">
                      Enlace / Recurso Opcional
                    </label>
                    <div className="relative">
                      <LinkIcon size={12} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600" />
                      <input
                        type="text"
                        value={anuncioUrl}
                        onChange={e => setAnuncioUrl(e.target.value)}
                        placeholder="https://drive.google.com/..."
                        className="sud-input w-full text-xs py-2.5 pl-9 pr-3.5"
                      />
                    </div>
                  </div>

                  {/* Boton enviar */}
                  <button
                    type="submit"
                    disabled={publishing}
                    className="w-full sud-btn-primary py-3 flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest disabled:opacity-50 cursor-pointer"
                  >
                    {publishing ? 'Publicando...' : (
                      <>
                        <Send size={12} /> Publicar
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-6 bg-black/10 mt-12">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[8px] text-slate-600 font-bold uppercase tracking-widest">
            Uso Restringido © Sudamerican Voices 2026
          </p>
          <img src="/logos/LIBERA TU VOZ.png" alt="Libera tu voz" className="h-4 opacity-20" />
        </div>
      </footer>
    </div>
  );
}

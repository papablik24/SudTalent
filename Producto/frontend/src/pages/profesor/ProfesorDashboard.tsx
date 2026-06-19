import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AsistenteIA } from '../AsistenteIA';
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
  Pencil,
  Calendar, 
  FileText,
  AlertCircle,
  X,
  Search,
  MapPin,
  Mail,
  Phone,
  Mic2,
  ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfile, CursoDTO } from '../../types';
import { profesorService, ProfesorDTO, ProfesorAlumnoDTO } from '../../services/profesorService';
import { cursoService } from '../../services/cursoService';
import { AudioPlayer } from '../../components/ui/AudioPlayer';
import { anuncioService, AnuncioDTO } from '../../services/anuncioService';
import { convocatoriaService, Convocatoria } from '../../services/convocatoriaService';
import { agendaService, AgendaEventoDTO } from '../../services/agendaService';
import { audicionService, Audicion } from '../../services/audicionService';

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

export function formatAgendaDateTime(fechaStr: string, horaStr?: string): string {
  if (!fechaStr) return '';
  const parts = fechaStr.split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const meses = [
      'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
      'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
    ];
    const monthName = meses[month] || '';
    const formattedDate = `${day} de ${monthName} de ${year}`;
    if (horaStr) {
      return `${formattedDate} · ${horaStr} hrs`;
    }
    return formattedDate;
  }
  return `${fechaStr}${horaStr ? ` · ${horaStr} hrs` : ''}`;
}

export function getRelativeTimeSpan(fechaStr: string, horaStr?: string): string {
  if (!fechaStr) return '';
  const dateParts = fechaStr.split('-');
  if (dateParts.length !== 3) return '';
  const year = parseInt(dateParts[0], 10);
  const month = parseInt(dateParts[1], 10) - 1;
  const day = parseInt(dateParts[2], 10);
  
  let hours = 0;
  let minutes = 0;
  if (horaStr) {
    const timeParts = horaStr.split(':');
    if (timeParts.length >= 2) {
      hours = parseInt(timeParts[0], 10);
      minutes = parseInt(timeParts[1], 10);
    }
  }
  
  const eventDate = new Date(year, month, day, hours, minutes);
  const now = new Date();
  
  const diffMs = eventDate.getTime() - now.getTime();
  if (diffMs < 0) {
    return 'Actividad pasada';
  }
  
  const isToday = eventDate.getDate() === now.getDate() &&
                  eventDate.getMonth() === now.getMonth() &&
                  eventDate.getFullYear() === now.getFullYear();
                  
  const tomorrow = new Date();
  tomorrow.setDate(now.getDate() + 1);
  const isTomorrow = eventDate.getDate() === tomorrow.getDate() &&
                     eventDate.getMonth() === tomorrow.getMonth() &&
                     eventDate.getFullYear() === tomorrow.getFullYear();
                     
  const formatTime = (h: number, m: number) => {
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

  if (isToday) {
    if (diffHours >= 1) {
      return `Hoy a las ${formatTime(hours, minutes)} (Faltan ${diffHours} hora${diffHours > 1 ? 's' : ''})`;
    } else if (diffMinutes >= 1) {
      return `Hoy a las ${formatTime(hours, minutes)} (Faltan ${diffMinutes} min)`;
    }
    return `Hoy a las ${formatTime(hours, minutes)}`;
  }
  
  if (isTomorrow) {
    return `Mañana a las ${formatTime(hours, minutes)}`;
  }
  
  // Calculate exact day difference
  const eventDateStart = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());
  const nowDateStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dayDiff = Math.round((eventDateStart.getTime() - nowDateStart.getTime()) / (1000 * 60 * 60 * 24));
  
  if (dayDiff === 1) {
    return `Mañana a las ${formatTime(hours, minutes)}`;
  }
  if (dayDiff > 1) {
    return `Faltan ${dayDiff} días`;
  }
  
  return `Faltan ${diffHours} horas`;
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
  
  // Active View State ('dashboard' | 'alumnos' | 'agenda' | 'ia' | 'audiciones')
  const [searchParams, setSearchParams] = useSearchParams();
  const viewParam = searchParams.get('view');
  const [activeView, setActiveView] = useState<'dashboard' | 'alumnos' | 'agenda' | 'ia' | 'audiciones'>('dashboard');

  // Sync activeView with viewParam query parameter
  useEffect(() => {
    if (viewParam === 'alumnos') {
      setActiveView('alumnos');
      setSelectedCurso(null);
    } else if (viewParam === 'agenda') {
      setActiveView('agenda');
      setSelectedCurso(null);
    } else if (viewParam === 'ia') {
      setActiveView('ia');
      setSelectedCurso(null);
    } else if (viewParam === 'audiciones') {
      setActiveView('audiciones');
      setSelectedCurso(null);
    } else {
      setActiveView('dashboard');
      if (viewParam === 'dashboard') {
        setSelectedCurso(null);
      }
    }
  }, [viewParam]);
  
  // Alumnos State
  const [alumnos, setAlumnos] = useState<ProfesorAlumnoDTO[]>([]);
  const [loadingAlumnos, setLoadingAlumnos] = useState(false);
  const [alumnosError, setAlumnosError] = useState<string | null>(null);
  const [selectedCursoFilter, setSelectedCursoFilter] = useState<string>('todos');
  const [searchAlumnoQuery, setSearchAlumnoQuery] = useState('');

  // Form State for new announcements
  const [anuncioTitulo, setAnuncioTitulo] = useState('');
  const [anuncioContenido, setAnuncioContenido] = useState('');
  const [anuncioUrl, setAnuncioUrl] = useState('');
  const [anuncioTipo, setAnuncioTipo] = useState<'ANUNCIO' | 'CAPSULA'>('ANUNCIO');
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [editingAnuncio, setEditingAnuncio] = useState<AnuncioDTO | null>(null);
  const [deleteConfirmAnuncio, setDeleteConfirmAnuncio] = useState<AnuncioDTO | null>(null);

  // Agenda State
  const [agenda, setAgenda] = useState<AgendaEventoDTO[]>([]);
  const [loadingAgenda, setLoadingAgenda] = useState(false);
  const [agendaError, setAgendaError] = useState<string | null>(null);
  const [editingEvento, setEditingEvento] = useState<AgendaEventoDTO | null>(null);
  const [deleteConfirmEvento, setDeleteConfirmEvento] = useState<AgendaEventoDTO | null>(null);

  // Agenda Form State
  const [eventoCursoId, setEventoCursoId] = useState('');
  const [eventoTitulo, setEventoTitulo] = useState('');
  const [eventoDescripcion, setEventoDescripcion] = useState('');
  const [eventoFecha, setEventoFecha] = useState('');
  const [eventoHora, setEventoHora] = useState('');
  const [eventoLink, setEventoLink] = useState('');
  const [savingEvento, setSavingEvento] = useState(false);
  const [eventoError, setEventoError] = useState<string | null>(null);

  const dateRef = React.useRef<HTMLInputElement>(null);
  const timeRef = React.useRef<HTMLInputElement>(null);

  // Audiciones State
  const [audiciones, setAudiciones] = useState<Audicion[]>([]);
  const [loadingAudiciones, setLoadingAudiciones] = useState(false);
  const [audicionesError, setAudicionesError] = useState<string | null>(null);

  // Form State for Audicion Evaluation
  const [evaluatingAudicion, setEvaluatingAudicion] = useState<Audicion | null>(null);
  const [evalPuntaje, setEvalPuntaje] = useState<number>(80);
  const [evalObservaciones, setEvalObservaciones] = useState('');
  const [evalResultado, setEvalResultado] = useState<'APROBADA' | 'RECHAZADA'>('APROBADA');
  const [savingEvaluacion, setSavingEvaluacion] = useState(false);

  const fetchAudiciones = async () => {
    setLoadingAudiciones(true);
    setAudicionesError(null);
    try {
      const data = await audicionService.getMisAudicionesProfesor();
      const sorted = [...data].sort((a, b) => {
        const aProg = a.estado === 'PROGRAMADA';
        const bProg = b.estado === 'PROGRAMADA';
        if (aProg && !bProg) return -1;
        if (!aProg && bProg) return 1;

        const dateStrA = `${a.fecha}T${a.hora || '00:00'}`;
        const dateStrB = `${b.fecha}T${b.hora || '00:00'}`;
        const timeA = new Date(dateStrA).getTime() || 0;
        const timeB = new Date(dateStrB).getTime() || 0;
        if (timeA !== timeB) {
          return timeB - timeA;
        }

        const createdA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const createdB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return createdB - createdA;
      });
      setAudiciones(sorted);
    } catch (err: any) {
      console.error('Error al cargar audiciones del profesor:', err);
      setAudicionesError(err.message || 'Error al cargar tus audiciones asignadas.');
    } finally {
      setLoadingAudiciones(false);
    }
  };

  const handleDownloadAudio = async (url: string, title: string) => {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Error al descargar');
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      const extension = url.split('.').pop()?.split('?')[0] || 'mp3';
      link.download = `${title}.${extension}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      console.error('Error al descargar el audio:', err);
      alert('No se pudo descargar el archivo de audio.');
    }
  };

  const handleSaveEvaluacion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!evaluatingAudicion) return;

    if (evalPuntaje < 1 || evalPuntaje > 100) {
      alert('El puntaje debe estar entre 1 y 100.');
      return;
    }

    setSavingEvaluacion(true);
    try {
      await audicionService.evaluarAudicion(evaluatingAudicion.id, {
        puntaje: evalPuntaje,
        observaciones: evalObservaciones,
        resultado: evalResultado,
      });
      setToastMessage('Audición evaluada y registrada con éxito.');
      setEvaluatingAudicion(null);
      await fetchAudiciones();
    } catch (err: any) {
      alert(err.message || 'Error al evaluar la audición.');
    } finally {
      setSavingEvaluacion(false);
    }
  };

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

  // Auto-select the first course when realCursos loads and no course is selected
  useEffect(() => {
    if (realCursos.length > 0 && !eventoCursoId) {
      setEventoCursoId(realCursos[0].id);
    }
  }, [realCursos, eventoCursoId]);

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

  // Handlers for edit flow
  const handleStartEdit = (a: AnuncioDTO) => {
    setEditingAnuncio(a);
    setAnuncioTitulo(a.titulo);
    setAnuncioContenido(a.contenido);
    setAnuncioUrl(a.urlRecurso || '');
    setAnuncioTipo(a.tipo);
    setPublishError(null);
  };

  const handleCancelEdit = () => {
    setEditingAnuncio(null);
    setAnuncioTitulo('');
    setAnuncioContenido('');
    setAnuncioUrl('');
    setAnuncioTipo('ANUNCIO');
    setPublishError(null);
  };

  // Handler for publishing or updating an announcement
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
      if (editingAnuncio) {
        const updated = await anuncioService.update(selectedCurso.id, editingAnuncio.id, {
          tipo: anuncioTipo,
          titulo: anuncioTitulo.trim(),
          contenido: anuncioContenido.trim(),
          urlRecurso: anuncioUrl.trim() || undefined
        });
        setAnuncios(prev => prev.map(a => a.id === updated.id ? updated : a));
        handleCancelEdit();
      } else {
        const created = await anuncioService.create(selectedCurso.id, {
          tipo: anuncioTipo,
          titulo: anuncioTitulo.trim(),
          contenido: anuncioContenido.trim(),
          urlRecurso: anuncioUrl.trim() || undefined
        });
        setAnuncios(prev => [created, ...prev]);
        handleCancelEdit();
      }
    } catch (err: any) {
      console.error('Error al guardar anuncio:', err);
      if (err.status === 403 || err.message?.toLowerCase().includes('forbidden') || err.message?.toLowerCase().includes('403')) {
        setPublishError('No puedes editar una publicación que no te pertenece.');
      } else {
        setPublishError(err.message || 'No se pudo guardar el anuncio.');
      }
    } finally {
      setPublishing(false);
    }
  };

  // Handler for deleting an announcement (only authorized if authored by user)
  const handleDeleteAnuncio = async (anuncioId: string) => {
    if (!selectedCurso) return;
    try {
      await anuncioService.delete(selectedCurso.id, anuncioId);
      setAnuncios(prev => prev.filter(a => a.id !== anuncioId));
    } catch (err: any) {
      console.error('Error al eliminar anuncio:', err);
      if (err.status === 403 || err.message?.toLowerCase().includes('forbidden') || err.message?.toLowerCase().includes('403')) {
        alert('No puedes eliminar una publicación que no te pertenece.');
      } else {
        alert(err.message || 'Error al eliminar anuncio');
      }
    }
  };

  // Refs
  const cursosRef = React.useRef<HTMLDivElement>(null);

  // Click Handlers for Top Info Cards
  const handleMisCursosClick = () => {
    setSearchParams({ view: 'dashboard' });
    if (displayCursos.length === 1) {
      setSelectedCurso(displayCursos[0]);
    } else {
      setTimeout(() => {
        cursosRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 50);
    }
  };

  const fetchAlumnos = async () => {
    setLoadingAlumnos(true);
    setAlumnosError(null);
    try {
      const data = await profesorService.getMyAlumnos();
      setAlumnos(data);
    } catch (err: any) {
      console.error('Error al cargar alumnos:', err);
      if (err.status === 403 || err.message?.toLowerCase().includes('forbidden') || err.message?.toLowerCase().includes('403')) {
        setAlumnosError('No tienes permisos de profesor para ver estos alumnos.');
      } else {
        setAlumnosError(err.message || 'Error al cargar alumnos.');
      }
    } finally {
      setLoadingAlumnos(false);
    }
  };

  const handleMisAlumnosClick = () => {
    setSearchParams({ view: 'alumnos' });
  };

  // Fetch Agenda Events
  const fetchAgenda = async () => {
    setLoadingAgenda(true);
    setAgendaError(null);
    try {
      const data = await agendaService.getAgenda();
      setAgenda(data);
    } catch (err: any) {
      console.error('Error al cargar la agenda:', err);
      setAgendaError(err.message || 'Error al cargar los eventos de la agenda.');
    } finally {
      setLoadingAgenda(false);
    }
  };

  // Trigger data fetching on activeView changes
  useEffect(() => {
    if (activeView === 'alumnos') {
      setSearchAlumnoQuery('');
      setSelectedCursoFilter('todos');
      fetchAlumnos();
    } else if (activeView === 'agenda') {
      setEditingEvento(null);
      setEventoCursoId(realCursos.length > 0 ? realCursos[0].id : '');
      setEventoTitulo('');
      setEventoDescripcion('');
      setEventoFecha('');
      setEventoHora('');
      setEventoLink('');
      setEventoError(null);
      fetchAgenda();
    } else if (activeView === 'audiciones') {
      setEvaluatingAudicion(null);
      setEvalPuntaje(80);
      setEvalObservaciones('');
      setEvalResultado('APROBADA');
      fetchAudiciones();
    }
  }, [activeView, realCursos.length]);

  const handleStartEditEvento = (evt: AgendaEventoDTO) => {
    setEditingEvento(evt);
    setEventoCursoId(evt.cursoId);
    setEventoTitulo(evt.titulo);
    setEventoDescripcion(evt.descripcion || '');
    setEventoFecha(evt.fecha);
    setEventoHora(evt.hora);
    setEventoLink(evt.link || '');
    setEventoError(null);
  };

  const handleCancelEditEvento = () => {
    setEditingEvento(null);
    setEventoCursoId(realCursos.length > 0 ? realCursos[0].id : '');
    setEventoTitulo('');
    setEventoDescripcion('');
    setEventoFecha('');
    setEventoHora('');
    setEventoLink('');
    setEventoError(null);
  };

  const handleSaveEvento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventoCursoId) {
      setEventoError('Debes seleccionar un curso.');
      return;
    }
    if (!eventoTitulo.trim()) {
      setEventoError('El título es obligatorio.');
      return;
    }
    if (!eventoFecha) {
      setEventoError('La fecha es obligatoria.');
      return;
    }
    if (!eventoHora) {
      setEventoError('La hora es obligatoria.');
      return;
    }

    setSavingEvento(true);
    setEventoError(null);
    try {
      const payload = {
        cursoId: eventoCursoId,
        titulo: eventoTitulo.trim(),
        descripcion: eventoDescripcion.trim() || undefined,
        fecha: eventoFecha,
        hora: eventoHora,
        link: eventoLink.trim() || undefined
      };

      if (editingEvento) {
        const updated = await agendaService.update(editingEvento.id, payload);
        setAgenda(prev => prev.map(evt => evt.id === updated.id ? updated : evt));
        setToastMessage('Actividad de la agenda actualizada con éxito.');
        handleCancelEditEvento();
      } else {
        const created = await agendaService.create(payload);
        setAgenda(prev => {
          const updatedList = [created, ...prev];
          return updatedList.sort((a, b) => {
            const dateComp = a.fecha.localeCompare(b.fecha);
            if (dateComp !== 0) return dateComp;
            return a.hora.localeCompare(b.hora);
          });
        });
        setToastMessage('Actividad agregada a la agenda con éxito.');
        handleCancelEditEvento();
      }
    } catch (err: any) {
      console.error('Error al guardar evento de la agenda:', err);
      setEventoError(err.message || 'No se pudo guardar la actividad de la agenda.');
    } finally {
      setSavingEvento(false);
    }
  };

  const handleDeleteEvento = async (eventoId: string) => {
    try {
      await agendaService.delete(eventoId);
      setAgenda(prev => prev.filter(evt => evt.id !== eventoId));
      setToastMessage('Actividad eliminada de la agenda.');
    } catch (err: any) {
      console.error('Error al eliminar evento de la agenda:', err);
      alert(err.message || 'Error al eliminar actividad de la agenda.');
    }
  };

  const handleMiAgendaClick = () => {
    setSearchParams({ view: 'agenda' });
  };

  const handleAudicionesClick = () => {
    setSearchParams({ view: 'audiciones' });
  };

  return (
    <div className="w-full relative">
      {/* Main Content Area */}
      <div className={`${activeView === 'audiciones' ? 'max-w-[1450px]' : 'max-w-5xl'} mx-auto px-6 py-6 z-10 w-full relative`}>
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
        {activeView === 'alumnos' ? (
          /* ========================================================
             MIS ALUMNOS VIEW
             ======================================================== */
          <div className="space-y-8 animate-in fade-in duration-300">
            {/* Back button */}
            <button
              onClick={() => setActiveView('dashboard')}
              className="inline-flex items-center gap-2 text-[10px] text-slate-400 hover:text-white font-black uppercase tracking-widest border border-white/10 hover:border-white/20 bg-white/5 px-4 py-2 rounded-xl transition-all cursor-pointer"
            >
              <ChevronLeft size={14} /> Volver al Panel
            </button>

            {/* View Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-4">
              <div className="space-y-1">
                <h2 className="text-2xl font-black text-white uppercase tracking-tight flex items-center gap-2">
                  <Users className="text-sud-turquoise" size={24} /> Mis Alumnos
                </h2>
                <p className="text-slate-400 text-xs">
                  Listado de estudiantes inscritos en tus cursos asignados.
                </p>
              </div>
            </div>

            {/* Alumnos List/Grid */}
            {loadingAlumnos ? (
              <div className="flex flex-col items-center justify-center py-20 space-y-4">
                <div className="w-10 h-10 border-3 border-sud-turquoise/20 border-t-sud-turquoise rounded-full animate-spin" />
                <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Cargando listado de alumnos...</p>
              </div>
            ) : alumnosError ? (
              <div className="p-6 text-center border border-red-500/20 rounded-2xl bg-red-500/5 text-red-400 text-xs font-bold uppercase tracking-widest">
                {alumnosError}
              </div>
            ) : alumnos.length === 0 ? (
              <div className="py-16 text-center border-2 border-dashed border-white/5 rounded-3xl bg-white/[0.005]">
                <Users size={32} className="mx-auto text-slate-700 mb-4" />
                <p className="text-slate-500 font-black uppercase tracking-widest text-xs">
                  Aún no hay alumnos inscritos en tus cursos.
                </p>
              </div>
            ) : (
              (() => {
                // Course Filter
                let tempAlumnos = selectedCursoFilter === 'todos'
                  ? alumnos
                  : alumnos.filter(alumno => alumno.cursos.some(c => c.id === selectedCursoFilter));

                // Search Filter (case-insensitive name, email, phone)
                if (searchAlumnoQuery.trim()) {
                  const query = searchAlumnoQuery.toLowerCase().trim();
                  tempAlumnos = tempAlumnos.filter(alumno => {
                    const nameMatch = alumno.name ? alumno.name.toLowerCase().includes(query) : false;
                    const emailMatch = alumno.email ? alumno.email.toLowerCase().includes(query) : false;
                    const phoneMatch = alumno.phone ? alumno.phone.toLowerCase().includes(query) : false;
                    return nameMatch || emailMatch || phoneMatch;
                  });
                }

                const filteredAlumnos = tempAlumnos;

                return (
                  <div className="space-y-6">
                    {/* Toolbar: Búsqueda y Filtros */}
                    <div className="flex flex-col md:flex-row gap-4 bg-white/[0.02] border border-white/5 p-4 rounded-2xl">
                      {/* Búsqueda */}
                      <div className="relative flex-1">
                        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input
                          type="text"
                          value={searchAlumnoQuery}
                          onChange={(e) => setSearchAlumnoQuery(e.target.value)}
                          placeholder="Buscar alumno..."
                          className="sud-input w-full text-xs py-2.5 pl-9 pr-10"
                        />
                        {searchAlumnoQuery && (
                          <button
                            onClick={() => setSearchAlumnoQuery('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white p-0.5 transition-colors cursor-pointer"
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>

                      {/* Filtro por Curso */}
                      {realCursos.length > 0 && (
                        <div className="flex items-center gap-2 shrink-0">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest shrink-0">Filtrar por Curso:</label>
                          <select
                            value={selectedCursoFilter}
                            onChange={(e) => setSelectedCursoFilter(e.target.value)}
                            className="bg-black/50 border border-white/10 text-xs font-bold text-white px-3 py-2 rounded-xl focus:outline-none focus:border-sud-turquoise/50 cursor-pointer"
                          >
                            <option value="todos">Todos los cursos</option>
                            {realCursos.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.titulo}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>

                    {/* Contador */}
                    <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center justify-between border-b border-white/5 pb-2">
                      <span>Estudiantes</span>
                      <span className="text-sud-turquoise">
                        Mostrando {filteredAlumnos.length} de {alumnos.length} alumnos
                      </span>
                    </div>

                    {/* Alumnos List/Grid */}
                    {filteredAlumnos.length === 0 ? (
                      <div className="py-16 text-center border-2 border-dashed border-white/5 rounded-3xl bg-white/[0.005] space-y-2">
                        <Users size={32} className="mx-auto text-slate-750" />
                        <p className="text-slate-400 font-black uppercase tracking-widest text-xs">
                          No se encontraron alumnos con estos filtros.
                        </p>
                        <p className="text-slate-500 text-[10px] font-medium leading-relaxed">
                          Prueba cambiar la búsqueda o seleccionar otro curso.
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
                        {filteredAlumnos.map((student) => (
                          <div key={student.id} className="sud-glass-panel p-5 border-white/5 hover:border-white/10 transition-all flex flex-col justify-between gap-4">
                            <div className="space-y-4">
                              {/* Student Header */}
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
                                  {student.profileImageUrl ? (
                                    <img src={student.profileImageUrl} alt="" className="w-full h-full object-cover" />
                                  ) : student.childName ? (
                                    <span className="text-xs font-black text-slate-400 uppercase">
                                      {student.childName.substring(0, 2).toUpperCase()}
                                    </span>
                                  ) : (
                                    <span className="text-xs font-black text-slate-400 uppercase">
                                      {student.name ? student.name.substring(0, 2).toUpperCase() : 'AL'}
                                    </span>
                                  )}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <h3 className="text-xs font-black text-white uppercase tracking-tight leading-snug truncate" title={student.name}>
                                    {student.name}
                                  </h3>
                                  <p className="text-[8px] text-slate-500 mt-0.5 uppercase tracking-widest">ID: {student.id.substring(0, 8)}</p>
                                </div>
                              </div>

                              {/* Badges */}
                              <div className="flex flex-wrap gap-1.5">
                                {/* Profile Type Badge */}
                                <span className={`text-[7px] font-black uppercase tracking-widest px-2 py-0.5 rounded border ${
                                  student.profileType === 'PARENT'
                                    ? 'bg-sud-orange/10 text-sud-orange border-sud-orange/20'
                                    : student.profileType === 'PERSONAL' && student.age !== undefined && student.age < 18
                                      ? 'bg-violet-500/10 text-violet-400 border-violet-500/20'
                                      : 'bg-sud-turquoise/10 text-sud-turquoise border-sud-turquoise/20'
                                }`}>
                                  {student.profileType === 'PARENT' 
                                    ? `Apoderado${student.childName ? ` (Menor: ${student.childName})` : ''}` 
                                    : student.profileType === 'PERSONAL' && student.age !== undefined && student.age < 18
                                      ? 'Menor'
                                      : 'Adulto'}
                                </span>

                                {/* Profile Status Badge */}
                                {student.status && (
                                  <span className={`text-[7px] font-black uppercase tracking-widest px-2 py-0.5 rounded border ${
                                    student.status === 'APPROVED' || student.status === 'ACTIVO'
                                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                      : student.status === 'PENDING' || student.status === 'PENDIENTE' || student.status === 'EN_REVISION'
                                        ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                                        : 'bg-red-500/10 text-red-400 border-red-500/20'
                                  }`}>
                                    {student.status === 'APPROVED' || student.status === 'ACTIVO'
                                      ? 'Aprobado' 
                                      : student.status === 'PENDING' || student.status === 'PENDIENTE' || student.status === 'EN_REVISION'
                                        ? 'En Revisión' 
                                        : student.status === 'INACTIVE' || student.status === 'INACTIVO'
                                          ? 'Inactivo' 
                                          : student.status}
                                  </span>
                                )}
                              </div>

                              {/* Contact details */}
                              <div className="space-y-1.5 pt-2.5 border-t border-white/5 text-[9px] text-slate-400">
                                <div className="flex items-center gap-2">
                                  <span className="font-black uppercase tracking-widest text-[8px] text-slate-500 w-12 shrink-0">Email:</span>
                                  <span className="truncate" title={student.email}>{student.email || 'No disponible'}</span>
                                </div>
                                {student.phone && (
                                  <div className="flex items-center gap-2">
                                    <span className="font-black uppercase tracking-widest text-[8px] text-slate-500 w-12 shrink-0">Teléfono:</span>
                                    <span>{student.phone}</span>
                                  </div>
                                )}
                              </div>

                              {/* Enrolled Courses under this teacher */}
                              <div className="space-y-1.5 pt-2.5 border-t border-white/5">
                                <span className="block text-[8px] font-black text-slate-500 uppercase tracking-widest">Cursos Inscritos:</span>
                                <div className="flex flex-wrap gap-1">
                                  {student.cursos.map((c) => (
                                    <span key={c.id} className="text-[7px] font-bold bg-white/5 text-slate-300 border border-white/10 px-1.5 py-0.5 rounded">
                                      {c.titulo}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()
            )}
          </div>
        ) : activeView === 'audiciones' ? (
          /* ========================================================
             AUDICIONES VIEW
             ======================================================== */
          <div className="space-y-8 animate-in fade-in duration-300">
            {/* Back button */}
            <button
              onClick={() => {
                setActiveView('dashboard');
                setSearchParams({ view: 'dashboard' });
              }}
              className="inline-flex items-center gap-2 text-[10px] text-slate-400 hover:text-white font-black uppercase tracking-widest border border-white/10 hover:border-white/20 bg-white/5 px-4 py-2 rounded-xl transition-all cursor-pointer"
            >
              <ChevronLeft size={14} /> Volver al Panel
            </button>

            {/* View Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-4">
              <div className="space-y-1">
                <h2 className="text-2xl font-black text-white uppercase tracking-tight flex items-center gap-2">
                  <Mic2 className="text-sud-orange" size={24} /> Evaluaciones de Audiciones
                </h2>
                <p className="text-slate-400 text-xs">
                  Listado de audiciones asignadas para evaluar el desempeño de postulantes de casting.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Audiciones List */}
              <div className="lg:col-span-2 space-y-6">
                <h3 className="text-md font-black text-white uppercase tracking-tight border-b border-white/5 pb-2 flex items-center gap-2">
                  <Calendar className="text-sud-turquoise" size={18} /> Audiciones Asignadas
                </h3>

                {loadingAudiciones ? (
                  <div className="flex justify-center items-center py-12">
                    <div className="w-8 h-8 border-3 border-sud-turquoise/20 border-t-sud-turquoise rounded-full animate-spin" />
                  </div>
                ) : audicionesError ? (
                  <div className="p-4 border border-red-500/20 rounded-xl bg-red-500/5 text-red-400 text-xs font-bold text-center">
                    {audicionesError}
                  </div>
                ) : audiciones.length > 0 ? (
                  <div className="space-y-4">
                    {audiciones.map((aud) => (
                      <div
                        key={aud.id}
                        className={`sud-glass-panel p-5 border-white/5 transition-all space-y-3 relative group ${
                          evaluatingAudicion?.id === aud.id ? 'border-sud-orange/40 bg-sud-orange/[0.01]' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-2">
                            <span className="inline-flex items-center text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded bg-sud-orange/15 text-sud-orange border border-sud-orange/20">
                              {aud.convocatoriaTitulo || 'Casting Convocatoria'}
                            </span>
                            <h4 className="text-base font-black text-white uppercase tracking-tight leading-snug">
                              Postulante: {aud.alumnoNombre}
                            </h4>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {aud.estado === 'PROGRAMADA' && (
                              <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                PROGRAMADA
                              </span>
                            )}
                            {aud.estado === 'EVALUADA' && (
                              <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded border ${
                                aud.resultado === 'APROBADA'
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                  : 'bg-red-500/10 text-red-400 border-red-500/20'
                              }`}>
                                EVALUADA • {aud.resultado}
                              </span>
                            )}
                            {aud.estado === 'CANCELADA' && (
                              <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-slate-600/10 text-slate-400 border border-white/10 line-through">
                                CANCELADA
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[10px] text-slate-400 pt-2 border-t border-white/5">
                          <div className="space-y-1.5">
                            <p className="flex items-center gap-1.5"><Mail size={12} className="text-slate-500" /> <span className="font-bold text-slate-500">Email:</span> {aud.alumnoEmail}</p>
                            <p className="flex items-center gap-1.5"><Phone size={12} className="text-slate-500" /> <span className="font-bold text-slate-500">Teléfono:</span> {aud.alumnoTelefono}</p>
                          </div>
                          <div className="space-y-1.5">
                            <p className="flex items-center gap-1.5"><Calendar size={12} className="text-slate-500" /> <span className="font-bold text-slate-500">Fecha/Hora:</span> {aud.fecha} a las {aud.hora}</p>
                            <p className="flex items-center gap-1.5"><MapPin size={12} className="text-slate-500" /> <span className="font-bold text-slate-500">Lugar ({aud.modalidad}):</span> {aud.lugar}</p>
                          </div>
                        </div>

                        {aud.link && (
                          <div className="text-[10px] pt-1 flex items-center gap-1.5">
                            <LinkIcon size={12} className="text-slate-500" />
                            <span className="font-bold text-slate-500">Enlace:</span>
                            <a href={aud.link.startsWith('http') ? aud.link : `https://${aud.link}`} target="_blank" rel="noopener noreferrer" className="text-sud-turquoise hover:underline truncate max-w-xs">
                              {aud.link}
                            </a>
                          </div>
                        )}

                        {aud.estado === 'EVALUADA' && (
                          <div className="mt-3 p-3.5 rounded-xl bg-black/40 border border-white/5 space-y-2">
                            <div className="flex items-center justify-between text-[10px]">
                              <span className="font-black text-slate-500 uppercase tracking-widest">Puntaje Otorgado:</span>
                              <span className="font-black text-white text-xs">{aud.puntaje}/100</span>
                            </div>
                            {aud.observaciones && (
                              <p className="text-[10px] text-slate-400 italic font-medium">
                                "{aud.observaciones}"
                              </p>
                            )}
                          </div>
                        )}

                        {/* Audio Player in the Card */}
                        <div className="pt-2.5 border-t border-white/5 space-y-1.5 animate-in fade-in duration-200">
                          <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">
                            Demo enviada por el postulante
                          </p>
                          {aud.voiceAudioUrl ? (
                            <div className="bg-white/[0.01] border border-white/5 rounded-xl p-2">
                              <AudioPlayer
                                src={aud.voiceAudioUrl}
                                title={aud.voiceAudioTitle || 'Demo de voz'}
                                showVolume
                                onDownload={() => handleDownloadAudio(aud.voiceAudioUrl!, aud.voiceAudioTitle || 'demo')}
                              />
                            </div>
                          ) : (
                            <p className="text-[9px] text-amber-500 italic font-medium pl-1">
                              Esta postulación no tiene demo asociada.
                            </p>
                          )}
                        </div>

                        {aud.estado === 'PROGRAMADA' && (
                          <div className="pt-3 border-t border-white/5 flex justify-end">
                            <button
                              type="button"
                              onClick={() => {
                                setEvaluatingAudicion(aud);
                                setEvalPuntaje(80);
                                setEvalObservaciones('');
                                setEvalResultado('APROBADA');
                              }}
                              className="px-4 py-2 bg-sud-turquoise/15 hover:bg-sud-turquoise/25 border border-sud-turquoise/30 text-sud-turquoise text-[10px] font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer"
                            >
                              Evaluar Audición
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-16 text-center border border-dashed border-white/5 rounded-2xl bg-white/[0.005] space-y-2">
                    <Award size={32} className="mx-auto text-slate-755" />
                    <p className="text-slate-400 font-black uppercase tracking-widest text-xs">
                      No tienes audiciones programadas
                    </p>
                    <p className="text-slate-500 text-[10px] font-medium leading-relaxed max-w-sm mx-auto">
                      Las postulaciones aparecen aquí cuando el administrador las asigna.
                    </p>
                  </div>
                )}
              </div>

              {/* Evaluation Form */}
              <div className="space-y-6 lg:sticky lg:top-24 self-start">
                <h3 className="text-md font-black text-white uppercase tracking-tight border-b border-white/5 pb-2 flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2">
                    <Award className="text-sud-orange" size={18} />
                    Evaluar Candidato
                  </span>
                </h3>

                {!evaluatingAudicion ? (
                  <div className="sud-glass-panel p-5 border-white/5 text-slate-500 text-xs font-bold uppercase tracking-widest text-center leading-relaxed">
                    Selecciona una audición de la lista para evaluarla.
                  </div>
                ) : (
                  <form
                    onSubmit={handleSaveEvaluacion}
                    className="sud-glass-panel p-5 space-y-4 border-sud-orange/30 bg-sud-orange/[0.01]"
                  >
                    <div className="p-3 rounded-xl bg-black/40 border border-white/5 text-[10px] text-slate-400 space-y-1">
                      <p className="font-bold text-white uppercase">Evaluando a:</p>
                      <p>{evaluatingAudicion.alumnoNombre}</p>
                      <p className="text-[8px] uppercase tracking-wider text-slate-500">{evaluatingAudicion.convocatoriaTitulo}</p>
                    </div>

                    {/* Demo del alumno */}
                    <div className="space-y-2 pt-2 border-t border-white/5 animate-in fade-in duration-200">
                      <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">
                        Demo de Voz del Alumno
                      </p>
                      {evaluatingAudicion.voiceAudioUrl ? (
                        <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl space-y-2">
                          <p className="text-[10px] text-sud-turquoise font-black uppercase tracking-widest truncate">
                            {evaluatingAudicion.voiceAudioTitle || 'Demo sin título'}
                          </p>
                          <AudioPlayer
                            src={evaluatingAudicion.voiceAudioUrl}
                            title={evaluatingAudicion.voiceAudioTitle || 'Demo de voz'}
                            showVolume
                            compact={true}
                            onDownload={() => handleDownloadAudio(evaluatingAudicion.voiceAudioUrl!, evaluatingAudicion.voiceAudioTitle || 'demo')}
                          />
                        </div>
                      ) : (
                        <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl flex items-start gap-2 text-amber-400">
                          <AlertCircle size={14} className="shrink-0 mt-0.5" />
                          <div className="space-y-0.5">
                            <p className="text-[10px] font-black uppercase tracking-widest">Advertencia de Evaluación</p>
                            <p className="text-[9px] leading-relaxed font-medium">Esta postulación no tiene demo asociada. Se recomienda precaución al evaluar.</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Puntaje */}
                    <div>
                      <label className="block text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1.5">
                        Puntaje (1 - 100) *
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={evalPuntaje}
                        onChange={e => setEvalPuntaje(parseInt(e.target.value) || 0)}
                        className="sud-input w-full text-xs py-2.5 px-3.5"
                        required
                      />
                    </div>

                    {/* Resultado */}
                    <div>
                      <label className="block text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1.5">
                        Resultado *
                      </label>
                      <div className="relative">
                        <select
                          value={evalResultado}
                          onChange={e => setEvalResultado(e.target.value as any)}
                          className="sud-input w-full appearance-none pr-10"
                          required
                        >
                          <option value="APROBADA">APROBADA</option>
                          <option value="RECHAZADA">RECHAZADA</option>
                        </select>
                        <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                      </div>
                    </div>

                    {/* Observaciones */}
                    <div>
                      <label className="block text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1.5">
                        Observaciones *
                      </label>
                      <textarea
                        value={evalObservaciones}
                        onChange={e => setEvalObservaciones(e.target.value)}
                        placeholder="Escribe comentarios sobre el tono de voz, respiración, dicción, etc..."
                        rows={4}
                        className="sud-input w-full text-xs py-2.5 px-3.5 resize-none"
                        required
                      />
                    </div>

                    {/* Botones */}
                    <div className="flex gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setEvaluatingAudicion(null)}
                        className="w-1/3 py-3 border border-white/10 hover:border-white/20 bg-white/5 rounded-xl text-xs font-black uppercase tracking-widest text-slate-400 hover:text-white transition-all cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        disabled={savingEvaluacion}
                        className="w-2/3 sud-btn-primary py-3 flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest disabled:opacity-50 cursor-pointer"
                      >
                        {savingEvaluacion ? 'Guardando...' : 'Registrar'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        ) : activeView === 'agenda' ? (
          /* ========================================================
             MI AGENDA VIEW
             ======================================================== */
          <div className="space-y-8 animate-in fade-in duration-300">
            {/* Back button */}
            <button
              onClick={() => setActiveView('dashboard')}
              className="inline-flex items-center gap-2 text-[10px] text-slate-400 hover:text-white font-black uppercase tracking-widest border border-white/10 hover:border-white/20 bg-white/5 px-4 py-2 rounded-xl transition-all cursor-pointer"
            >
              <ChevronLeft size={14} /> Volver al Panel
            </button>

            {/* View Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-4">
              <div className="space-y-1">
                <h2 className="text-2xl font-black text-white uppercase tracking-tight flex items-center gap-2">
                  <Clock className="text-violet-400" size={24} /> Mi Agenda
                </h2>
                <p className="text-slate-400 text-xs">
                  Organiza clases, tutorías, ensayos o recordatorios con fecha y hora.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Event List */}
              <div className="lg:col-span-2 space-y-6">
                <h3 className="text-md font-black text-white uppercase tracking-tight border-b border-white/5 pb-2 flex items-center gap-2">
                  <Calendar className="text-sud-turquoise" size={18} /> Actividades Programadas
                </h3>

                {loadingAgenda ? (
                  <div className="flex justify-center items-center py-12">
                    <div className="w-8 h-8 border-3 border-sud-turquoise/20 border-t-sud-turquoise rounded-full animate-spin" />
                  </div>
                ) : agendaError ? (
                  <div className="p-4 border border-red-500/20 rounded-xl bg-red-500/5 text-red-400 text-xs font-bold text-center">
                    {agendaError}
                  </div>
                ) : agenda.length > 0 ? (
                  <div className="space-y-4">
                    {agenda.map((evt) => (
                      <div
                        key={evt.id}
                        className="sud-glass-panel p-5 border-white/5 hover:border-white/10 transition-all space-y-3 relative group"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-2">
                            <span className="inline-flex items-center text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded bg-sud-orange/15 text-sud-orange border border-sud-orange/20">
                              {evt.cursoTitulo}
                            </span>
                            <h4 className="text-base font-black text-white uppercase tracking-tight leading-snug">{evt.titulo}</h4>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
                            <button
                              type="button"
                              onClick={() => handleStartEditEvento(evt)}
                              className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-sud-turquoise hover:bg-sud-turquoise/5 transition-all cursor-pointer"
                              title="Editar actividad"
                            >
                              <Pencil size={12} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmEvento(evt)}
                              className="p-1.5 rounded-lg bg-red-500/5 border border-red-500/10 text-red-400/70 hover:text-red-400 hover:bg-red-500/20 transition-all cursor-pointer"
                              title="Eliminar actividad"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>

                        {evt.descripcion && (
                          <p className="text-xs text-slate-400 whitespace-pre-wrap leading-relaxed pl-1">{evt.descripcion}</p>
                        )}

                        <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-white/5 text-[10px] text-slate-500 font-bold uppercase tracking-widest pl-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="flex items-center gap-1.5 text-slate-300">
                              <Calendar size={13} className="text-violet-400" />
                              {formatAgendaDateTime(evt.fecha, evt.hora)}
                            </span>
                            <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded border ${
                              getRelativeTimeSpan(evt.fecha, evt.hora) === 'Actividad pasada'
                                ? 'bg-red-500/10 text-red-400 border-red-500/20'
                                : getRelativeTimeSpan(evt.fecha, evt.hora).includes('Hoy')
                                  ? 'bg-sud-turquoise/10 text-sud-turquoise border-sud-turquoise/20'
                                  : getRelativeTimeSpan(evt.fecha, evt.hora).includes('Mañana')
                                    ? 'bg-sud-orange/10 text-sud-orange border-sud-orange/20'
                                    : 'bg-white/5 text-slate-400 border-white/10'
                            }`}>
                              {getRelativeTimeSpan(evt.fecha, evt.hora)}
                            </span>
                          </div>
                          
                          {evt.link && (
                            <a
                              href={evt.link.startsWith('http') ? evt.link : `https://${evt.link}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sud-turquoise/5 border border-sud-turquoise/20 text-sud-turquoise hover:bg-sud-turquoise/15 transition-all text-[9px]"
                            >
                              <LinkIcon size={12} /> Enlace de reunión o recurso
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-16 text-center border border-dashed border-white/5 rounded-2xl bg-white/[0.005] space-y-2">
                    <Calendar size={32} className="mx-auto text-slate-755" />
                    <p className="text-slate-400 font-black uppercase tracking-widest text-xs">
                      Aún no tienes actividades agendadas.
                    </p>
                    <p className="text-slate-500 text-[10px] font-medium leading-relaxed max-w-xs mx-auto">
                      Crea una clase, tutoría o recordatorio asociado a uno de tus cursos.
                    </p>
                  </div>
                )}
              </div>

              {/* Formulario de Evento */}
              <div className="space-y-6">
                <h3 className="text-md font-black text-white uppercase tracking-tight border-b border-white/5 pb-2 flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2">
                    <Clock className={editingEvento ? "text-sud-turquoise animate-pulse" : "text-sud-orange"} size={18} />
                    {editingEvento ? 'Editar actividad' : 'Nueva actividad'}
                  </span>
                  {editingEvento && (
                    <button
                      type="button"
                      onClick={handleCancelEditEvento}
                      className="px-3 py-1 text-[9px] font-black uppercase tracking-widest border border-sud-turquoise/30 bg-sud-turquoise/10 text-sud-turquoise hover:bg-sud-turquoise/20 rounded-lg transition-all cursor-pointer"
                    >
                      Nueva actividad
                    </button>
                  )}
                </h3>

                {realCursos.length === 0 ? (
                  <div className="sud-glass-panel p-5 border-red-500/10 bg-red-500/5 text-red-400 text-xs font-bold uppercase tracking-widest text-center leading-relaxed">
                    No tienes cursos asignados.<br />Debes tener al menos un curso para agendar actividades.
                  </div>
                ) : (
                  <form 
                    onSubmit={handleSaveEvento} 
                    className={`sud-glass-panel p-5 space-y-4 transition-all duration-300 ${
                      editingEvento 
                        ? 'border-sud-turquoise/30 bg-sud-turquoise/[0.01]' 
                        : 'border-white/5'
                    }`}
                  >
                    {eventoError && (
                      <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-bold flex items-center gap-2">
                        <AlertCircle size={14} className="shrink-0" />
                        {eventoError}
                      </div>
                    )}

                    {editingEvento && (
                      <div className="p-3.5 rounded-xl bg-sud-turquoise/10 border border-sud-turquoise/20 text-sud-turquoise text-[10px] font-bold flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Pencil size={14} className="shrink-0 animate-pulse" />
                          <span>Editando actividad</span>
                        </div>
                        <button
                          type="button"
                          onClick={handleCancelEditEvento}
                          className="text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-white underline cursor-pointer"
                        >
                          Crear nueva
                        </button>
                      </div>
                    )}

                    {/* Curso */}
                    <div>
                      <label className="block text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1.5">
                        Curso Asociado *
                      </label>
                      <select
                        value={eventoCursoId}
                        onChange={e => setEventoCursoId(e.target.value)}
                        className="sud-input w-full text-xs py-2.5 px-3.5 bg-black/50 border border-white/10 text-white rounded-xl focus:outline-none focus:border-sud-turquoise/50 cursor-pointer"
                      >
                        {realCursos.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.titulo}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Titulo */}
                    <div>
                      <label className="block text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1.5">
                        Título de la actividad *
                      </label>
                      <input
                        type="text"
                        value={eventoTitulo}
                        onChange={e => setEventoTitulo(e.target.value)}
                        placeholder="Ej: Clase En Vivo: Técnicas de Doblaje"
                        className="sud-input w-full text-xs py-2.5 px-3.5"
                      />
                    </div>

                    {/* Fecha y Hora */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1.5">
                          Fecha *
                        </label>
                        <div className="relative cursor-pointer">
                          <Calendar size={12} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                          <input
                            ref={dateRef}
                            type="date"
                            value={eventoFecha}
                            onChange={e => setEventoFecha(e.target.value)}
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
                      <div>
                        <label className="block text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1.5">
                          Hora *
                        </label>
                        <div className="relative cursor-pointer">
                          <Clock size={12} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                          <input
                            ref={timeRef}
                            type="time"
                            value={eventoHora}
                            onChange={e => setEventoHora(e.target.value)}
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

                    {/* Descripcion */}
                    <div>
                      <label className="block text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1.5">
                        Descripción Opcional
                      </label>
                      <textarea
                        value={eventoDescripcion}
                        onChange={e => setEventoDescripcion(e.target.value)}
                        placeholder="Escribe detalles adicionales de la clase o recordatorios..."
                        rows={3}
                        className="sud-input w-full text-xs py-2.5 px-3.5 resize-none"
                      />
                    </div>

                    {/* Link */}
                    <div>
                      <label className="block text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1.5">
                        Enlace de reunión o recurso opcional
                      </label>
                      <div className="relative">
                        <LinkIcon size={12} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600" />
                        <input
                          type="text"
                          value={eventoLink}
                          onChange={e => setEventoLink(e.target.value)}
                          placeholder="https://meet.google.com/..."
                          className="sud-input w-full text-xs py-2.5 pl-9 pr-3.5"
                        />
                      </div>
                    </div>

                    {/* Botones */}
                    <div className="flex gap-2 pt-2">
                      {editingEvento && (
                        <button
                          type="button"
                          onClick={handleCancelEditEvento}
                          className="w-1/3 py-3 border border-white/10 hover:border-white/20 bg-white/5 rounded-xl text-xs font-black uppercase tracking-widest text-slate-400 hover:text-white transition-all cursor-pointer"
                        >
                          Cancelar
                        </button>
                      )}
                      <button
                        type="submit"
                        disabled={savingEvento}
                        className={`${editingEvento ? 'w-2/3' : 'w-full'} sud-btn-primary py-3 flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest disabled:opacity-50 cursor-pointer`}
                      >
                        {savingEvento ? (
                          editingEvento ? 'Guardando...' : 'Agendando...'
                        ) : (
                          <>
                            <Send size={12} /> {editingEvento ? 'Guardar cambios' : 'Agendar'}
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        ) : activeView === 'ia' ? (
          <div className="space-y-8 animate-in fade-in duration-300">
            <AsistenteIA />
          </div>
        ) : !selectedCurso ? (
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
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 w-full max-w-4xl mx-auto">
              {[
                { 
                  icon: <Users className="text-sud-turquoise" size={24} />, 
                  label: 'Mis Alumnos', 
                  desc: 'Ver alumnos inscritos en tus cursos',
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
                { 
                  icon: <Mic2 className="text-sud-orange" size={24} />, 
                  label: 'Audiciones', 
                  desc: 'Evaluaciones asignadas',
                  onClick: handleAudicionesClick
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
                    {anuncios.map((anuncio) => {
                      const isOwn = anuncio.autorId === user.uid;
                      return (
                      <div
                        key={anuncio.id}
                        className={`sud-glass-panel p-5 border-white/5 transition-all space-y-3 relative group ${
                          isOwn
                            ? 'cursor-pointer hover:border-sud-turquoise/30 hover:bg-white/[0.01]'
                            : 'hover:border-white/10'
                        }`}
                        onClick={() => { if (isOwn) handleStartEdit(anuncio); }}
                      >
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
                            
                            {isOwn && (
                              <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); handleStartEdit(anuncio); }}
                                  className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-sud-turquoise hover:bg-sud-turquoise/5 transition-all cursor-pointer"
                                  title="Editar publicación"
                                >
                                  <Pencil size={12} />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); setDeleteConfirmAnuncio(anuncio); }}
                                  className="p-1.5 rounded-lg bg-red-500/5 border border-red-500/10 text-red-400/70 hover:text-red-400 hover:bg-red-500/20 transition-all cursor-pointer"
                                  title="Eliminar publicación"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
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
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-[9px] font-black text-sud-turquoise uppercase tracking-widest transition-all"
                            >
                              <LinkIcon size={12} /> Ir al Recurso Adjunto
                            </a>
                          </div>
                        )}
                      </div>
                      );
                    })}
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
                <h3 className="text-md font-black text-white uppercase tracking-tight border-b border-white/5 pb-2 flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2">
                    <Send className={editingAnuncio ? "text-sud-turquoise animate-pulse" : "text-sud-orange"} size={18} />
                    {editingAnuncio ? 'Editar publicación' : 'Publicar nuevo'}
                  </span>
                  {editingAnuncio && (
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      className="px-3 py-1.5 rounded-lg border border-sud-turquoise/30 bg-sud-turquoise/10 text-sud-turquoise hover:bg-sud-turquoise/20 text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer"
                    >
                      Nueva publicación
                    </button>
                  )}
                </h3>

                <form 
                  onSubmit={handlePublishAnuncio} 
                  className={`sud-glass-panel p-5 space-y-4 transition-all duration-300 ${
                    editingAnuncio 
                      ? 'border-sud-turquoise/30 bg-sud-turquoise/[0.01]' 
                      : 'border-white/5'
                  }`}
                >
                  {editingAnuncio && (
                    <div className="p-3.5 rounded-xl bg-sud-turquoise/10 border border-sud-turquoise/20 text-sud-turquoise text-[10px] font-bold flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Pencil size={14} className="shrink-0 animate-pulse" />
                        <span>Editando: <strong className="text-white">{editingAnuncio.titulo}</strong></span>
                      </div>
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        className="text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-white underline cursor-pointer"
                      >
                        Crear nueva
                      </button>
                    </div>
                  )}

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
                    <div className="flex flex-wrap gap-2">
                      {[
                        { val: 'ANUNCIO', label: 'Anuncio' },
                        { val: 'CAPSULA', label: 'Material/Cápsula' }
                      ].map((t) => (
                        <button
                          key={t.val}
                          type="button"
                          onClick={() => setAnuncioTipo(t.val as any)}
                          className={`flex-1 min-w-[125px] py-2.5 px-3 text-[10px] font-black uppercase tracking-wider rounded-xl border text-center flex items-center justify-center transition-all cursor-pointer ${
                            anuncioTipo === t.val
                              ? 'bg-sud-orange/10 light:bg-sud-orange/5 border-sud-orange/40 light:border-sud-orange/30 text-white light:text-sud-orange font-black shadow-[0_0_12px_rgba(249,115,22,0.1)]'
                              : 'bg-white/5 light:bg-slate-100 border-white/5 light:border-slate-200 text-slate-400 light:text-slate-600 hover:text-white light:hover:text-slate-900'
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

                  {/* Boton enviar / guardar */}
                  <div className="flex gap-2">
                    {editingAnuncio && (
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        className="w-1/3 py-3 border border-white/10 hover:border-white/20 bg-white/5 rounded-xl text-xs font-black uppercase tracking-widest text-slate-400 hover:text-white transition-all cursor-pointer"
                      >
                        Cancelar
                      </button>
                    )}
                    <button
                      type="submit"
                      disabled={publishing}
                      className={`${editingAnuncio ? 'w-2/3' : 'w-full'} sud-btn-primary py-3 flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest disabled:opacity-50 cursor-pointer`}
                    >
                      {publishing ? (
                        editingAnuncio ? 'Guardando...' : 'Publicando...'
                      ) : (
                        <>
                          <Send size={12} /> {editingAnuncio ? 'Guardar cambios' : 'Publicar'}
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
      {/* ── Modal de Confirmación de Eliminación ─────────────────── */}
      <AnimatePresence>
        {deleteConfirmAnuncio && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative max-w-sm w-full bg-[#0f0f0f] border border-white/10 rounded-3xl p-6 space-y-6 text-center shadow-2xl"
            >
              <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center mx-auto animate-pulse">
                <Trash2 size={24} />
              </div>
              <div className="space-y-2">
                <h4 className="text-lg font-black text-white uppercase tracking-tight">¿Eliminar esta publicación?</h4>
                <p className="text-slate-400 text-xs leading-relaxed">Esta acción no se puede deshacer.</p>
              </div>
              <div className="flex gap-3 justify-center">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmAnuncio(null)}
                  className="px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-white/5 border border-white/10 text-slate-400 hover:bg-white/10 transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const toDelete = deleteConfirmAnuncio;
                    setDeleteConfirmAnuncio(null);
                    await handleDeleteAnuncio(toDelete.id);
                  }}
                  className="px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30 transition-all cursor-pointer"
                >
                  Eliminar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* ── Modal de Confirmación de Eliminación de Evento ─────────── */}
      <AnimatePresence>
        {deleteConfirmEvento && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative max-w-sm w-full bg-[#0f0f0f] border border-white/10 rounded-3xl p-6 space-y-6 text-center shadow-2xl"
            >
              <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center mx-auto animate-pulse">
                <Trash2 size={24} />
              </div>
              <div className="space-y-2">
                <h4 className="text-lg font-black text-white uppercase tracking-tight">¿Eliminar esta actividad?</h4>
                <p className="text-slate-400 text-xs leading-relaxed">Esta acción quitará el evento de tu agenda y no se puede deshacer.</p>
              </div>
              <div className="flex gap-3 justify-center">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmEvento(null)}
                  className="px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-white/5 border border-white/10 text-slate-400 hover:bg-white/10 transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const toDelete = deleteConfirmEvento;
                    setDeleteConfirmEvento(null);
                    await handleDeleteEvento(toDelete.id);
                  }}
                  className="px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30 transition-all cursor-pointer"
                >
                  Eliminar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  GraduationCap,
  BookOpen,
  Briefcase,
  ClipboardList,
  AudioLines,
  ArrowUpRight,
  TrendingUp,
  BarChart3,
  Loader,
  AlertCircle
} from 'lucide-react';
import { backendService, fetchAPI } from '../../services/backendService';
import { profesorService } from '../../services/profesorService';
import { cursoService } from '../../services/cursoService';
import { convocatoriaService } from '../../services/convocatoriaService';
import { postulacionService } from '../../services/postulacionService';

interface ReportMetrics {
  totalAlumnos: number;
  totalProfesores: number;
  totalCursos: number;
  totalConvocatorias: number;
  totalPostulaciones: number;
  totalDemos: number | string;
  alumnosAprobados: number;
  alumnosPendientes: number;
  alumnosInactivos: number;
  postulacionesPendientes: number;
  postulacionesEnRevision: number;
  postulacionesAceptadas: number;
  postulacionesRechazadas: number;
  topCursos: Array<{ titulo: string; totalAlumnos: number; modalidad: string }>;
  cursosOnline: number;
  cursosPresencial: number;
  cursosMixto: number;
  promedioAlumnos: number;
  convocatoriasActivas: number;
  convocatoriasCerradas: number;
  convocatoriasBorrador: number;
  convocatoriasArchivadas: number;
  topConvocatorias: Array<{ titulo: string; totalPostulaciones: number; categoria: string; estado: string }>;
}

export function AdminReports() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Estado para las demos en segundo plano (para no bloquear)
  const [demosCount, setDemosCount] = useState<number | string>('Cargando...');

  const [metrics, setMetrics] = useState<ReportMetrics>({
    totalAlumnos: 0,
    totalProfesores: 0,
    totalCursos: 0,
    totalConvocatorias: 0,
    totalPostulaciones: 0,
    totalDemos: 0,
    alumnosAprobados: 0,
    alumnosPendientes: 0,
    alumnosInactivos: 0,
    postulacionesPendientes: 0,
    postulacionesEnRevision: 0,
    postulacionesAceptadas: 0,
    postulacionesRechazadas: 0,
    topCursos: [],
    cursosOnline: 0,
    cursosPresencial: 0,
    cursosMixto: 0,
    promedioAlumnos: 0,
    convocatoriasActivas: 0,
    convocatoriasCerradas: 0,
    convocatoriasBorrador: 0,
    convocatoriasArchivadas: 0,
    topConvocatorias: [],
  });

  useEffect(() => {
    async function loadMetrics() {
      setLoading(true);
      setError(null);

      // Ejecutamos todas las peticiones en paralelo con Promise.allSettled para optimizar el tiempo de carga
      const results = await Promise.allSettled([
        backendService.getAllUsers(),
        profesorService.getAll(),
        cursoService.getAll(),
        convocatoriaService.getConvocatorias(),
        postulacionService.getAllPostulaciones()
      ]);

      const usersData = results[0].status === 'fulfilled' ? (results[0].value as any[]) : [];
      const profesoresData = results[1].status === 'fulfilled' ? (results[1].value as any[]) : [];
      const cursosData = results[2].status === 'fulfilled' ? (results[2].value as any[]) : [];
      const convocatoriasData = results[3].status === 'fulfilled' ? (results[3].value as any[]) : [];
      const postulacionesData = results[4].status === 'fulfilled' ? (results[4].value as any[]) : [];

      // Registrar en consola errores individuales de peticiones fallidas sin bloquear la página
      results.forEach((res, idx) => {
        if (res.status === 'rejected') {
          const names = ['alumnos', 'profesores', 'cursos', 'convocatorias', 'postulaciones'];
          console.error(`Error al cargar ${names[idx]} en el dashboard ejecutivo:`, res.reason);
        }
      });

      // 1. Cálculos de Alumnos
      const alumnos = usersData.filter(u => u.role === 'USER' || u.role === 'ALUMNO' || !u.role);
      const totalAlumnos = alumnos.length;
      const alumnosAprobados = alumnos.filter(u => u.status === 'APPROVED').length;
      const alumnosPendientes = alumnos.filter(u => u.status === 'PENDING').length;
      const alumnosInactivos = alumnos.filter(u => u.status === 'INACTIVE').length;

      // 2. Cálculos de Profesores
      const totalProfesores = profesoresData.length;

      // 3. Cálculos de Cursos
      const totalCursos = cursosData.length;
      const cursosOnline = cursosData.filter(c => c.modalidad === 'ONLINE').length;
      const cursosPresencial = cursosData.filter(c => c.modalidad === 'PRESENCIAL').length;
      const cursosMixto = cursosData.filter(c => c.modalidad === 'MIXTO' || c.modalidad === 'HIBRIDO').length;
      
      const totalAlumnosInscritos = cursosData.reduce((sum, c) => sum + (c.totalAlumnos || 0), 0);
      const promedioAlumnos = totalCursos > 0 ? parseFloat((totalAlumnosInscritos / totalCursos).toFixed(1)) : 0;

      // Top 5 cursos
      const topCursos = [...cursosData]
        .sort((a, b) => (b.totalAlumnos || 0) - (a.totalAlumnos || 0))
        .slice(0, 5)
        .map(c => ({
          titulo: c.titulo,
          totalAlumnos: c.totalAlumnos || 0,
          modalidad: c.modalidad
        }));

      // 4. Cálculos de Convocatorias
      const totalConvocatorias = convocatoriasData.length;
      const convocatoriasActivas = convocatoriasData.filter(c => c.estado === 'ACTIVA').length;
      const convocatoriasCerradas = convocatoriasData.filter(c => c.estado === 'CERRADA').length;
      const convocatoriasBorrador = convocatoriasData.filter(c => c.estado === 'BORRADOR').length;
      const convocatoriasArchivadas = convocatoriasData.filter(c => c.estado === 'ARCHIVADA').length;

      // 5. Cálculos de Postulaciones
      const totalPostulaciones = postulacionesData.length;
      const postulacionesPendientes = postulacionesData.filter(p => p.estado === 'PENDIENTE').length;
      const postulacionesEnRevision = postulacionesData.filter(p => p.estado === 'EN_REVISION').length;
      const postulacionesAceptadas = postulacionesData.filter(p => p.estado === 'ACEPTADA').length;
      const postulacionesRechazadas = postulacionesData.filter(p => p.estado === 'RECHAZADA').length;

      // Agrupar postulaciones por convocatoria para el top de convocatorias más populares
      const convocatoriasPostulantesMap: Record<string, number> = {};
      postulacionesData.forEach(p => {
        if (p.convocatoriaId) {
          convocatoriasPostulantesMap[p.convocatoriaId] = (convocatoriasPostulantesMap[p.convocatoriaId] || 0) + 1;
        }
      });

      const topConvocatorias = convocatoriasData
        .map(c => ({
          titulo: c.titulo,
          totalPostulaciones: convocatoriasPostulantesMap[c.id] || 0,
          categoria: c.categoria,
          estado: c.estado
        }))
        .sort((a, b) => b.totalPostulaciones - a.totalPostulaciones)
        .slice(0, 5);

      setMetrics({
        totalAlumnos,
        totalProfesores,
        totalCursos,
        totalConvocatorias,
        totalPostulaciones,
        totalDemos: 0, // se actualizará en la carga asíncrona de demos
        alumnosAprobados,
        alumnosPendientes,
        alumnosInactivos,
        postulacionesPendientes,
        postulacionesEnRevision,
        postulacionesAceptadas,
        postulacionesRechazadas,
        topCursos,
        cursosOnline,
        cursosPresencial,
        cursosMixto,
        promedioAlumnos,
        convocatoriasActivas,
        convocatoriasCerradas,
        convocatoriasBorrador,
        convocatoriasArchivadas,
        topConvocatorias,
      });

      setLoading(false);

      // Cargar conteo de demos de forma asíncrona no bloqueante
      loadDemosConcurrently(alumnos);
    }

    // Función asíncrona para contar demos sin ralentizar el hilo principal
    async function loadDemosConcurrently(alumnosList: any[]) {
      try {
        // Intentamos primero el endpoint general si existe
        try {
          const demos = await fetchAPI<any[]>('/voice-audios/all-demos');
          if (Array.isArray(demos)) {
            setDemosCount(demos.length);
            return;
          }
        } catch (e) {
          // Si el endpoint general da error, procedemos al plan B de consultas agrupadas
          console.warn('Endpoint general de demos no disponible, consultando por lotes...');
        }

        // Consultamos en lotes de alumnos en segundo plano para evitar saturar la red
        if (alumnosList.length === 0) {
          setDemosCount(0);
          return;
        }

        let totalDemosCalculadas = 0;
        const batchSize = 10;
        
        for (let i = 0; i < alumnosList.length; i += batchSize) {
          const batch = alumnosList.slice(i, i + batchSize);
          const results = await Promise.all(
            batch.map(async (u) => {
              try {
                const userDemos = await fetchAPI<any[]>(`/voice-audios/user/${u.id || u.uid}?category=demo`);
                return Array.isArray(userDemos) ? userDemos.length : 0;
              } catch {
                return 0;
              }
            })
          );
          totalDemosCalculadas += results.reduce((sum, count) => sum + count, 0);
        }
        
        setDemosCount(totalDemosCalculadas);
      } catch (err) {
        console.error('Error al contar demos:', err);
        setDemosCount('No disponible');
      }
    }

    loadMetrics();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] space-y-4">
        <Loader size={36} className="text-sud-turquoise animate-spin" />
        <p className="text-xs uppercase tracking-widest text-slate-500 font-black">Cargando métricas de la plataforma...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-12 text-center border border-red-500/20 rounded-[2.5rem] bg-red-500/5 max-w-xl mx-auto my-12">
        <AlertCircle size={40} className="mx-auto text-red-400 mb-4" />
        <p className="text-red-400 font-bold text-base">Error al cargar el dashboard ejecutivo</p>
        <p className="text-slate-500 text-xs mt-2">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-6 px-6 py-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-[10px] text-red-400 uppercase tracking-widest font-black rounded-2xl transition-all"
        >
          Reintentar Carga
        </button>
      </div>
    );
  }

  // Helper para porcentajes seguros
  const getPercentage = (value: number, total: number) => {
    if (total === 0) return 0;
    return parseFloat(((value / total) * 100).toFixed(1));
  };

  return (
    <div className="space-y-10 pb-12">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black tracking-tighter text-white">
            Resumen <span className="sud-vibrant-text-gradient uppercase tracking-widest">Ejecutivo</span>
          </h2>
          <p className="text-slate-400 mt-1 font-medium text-[10px] tracking-widest uppercase">
            Métricas generales e indicadores clave de SudTalent
          </p>
        </div>
        
        {/* Accesos rápidos */}
        <div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={() => navigate('/admin/students')} 
            className="px-5 py-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 text-[10px] font-black uppercase tracking-widest text-slate-300 hover:text-white transition-all flex items-center gap-2"
          >
            <span>Ver Alumnos</span>
            <ArrowUpRight size={14} className="text-slate-500" />
          </button>
          <button 
            onClick={() => navigate('/admin/postulaciones')} 
            className="px-5 py-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 text-[10px] font-black uppercase tracking-widest text-slate-300 hover:text-white transition-all flex items-center gap-2"
          >
            <span>Postulaciones</span>
            <ArrowUpRight size={14} className="text-slate-500" />
          </button>
          <button 
            onClick={() => navigate('/admin/convocatorias')} 
            className="px-5 py-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 text-[10px] font-black uppercase tracking-widest text-slate-300 hover:text-white transition-all flex items-center gap-2"
          >
            <span>Convocatorias</span>
            <ArrowUpRight size={14} className="text-slate-500" />
          </button>
          <button 
            onClick={() => navigate('/admin/cursos')} 
            className="px-5 py-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 text-[10px] font-black uppercase tracking-widest text-slate-300 hover:text-white transition-all flex items-center gap-2"
          >
            <span>Cursos</span>
            <ArrowUpRight size={14} className="text-slate-500" />
          </button>
        </div>
      </header>

      {/* KPI Cards */}
      <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-5">
        {[
          { label: 'Total Alumnos', value: metrics.totalAlumnos, icon: <Users size={20} />, color: 'from-sud-turquoise/20 to-sud-turquoise/5 border-sud-turquoise/20 text-sud-turquoise' },
          { label: 'Profesores', value: metrics.totalProfesores, icon: <GraduationCap size={20} />, color: 'from-pink-500/20 to-pink-500/5 border-pink-500/20 text-pink-400' },
          { label: 'Cursos Activos', value: metrics.totalCursos, icon: <BookOpen size={20} />, color: 'from-violet-500/20 to-violet-500/5 border-violet-500/20 text-violet-400' },
          { label: 'Convocatorias', value: metrics.totalConvocatorias, icon: <Briefcase size={20} />, color: 'from-sud-yellow/20 to-sud-yellow/5 border-sud-yellow/20 text-sud-yellow' },
          { label: 'Postulaciones', value: metrics.totalPostulaciones, icon: <ClipboardList size={20} />, color: 'from-sud-orange/20 to-sud-orange/5 border-sud-orange/20 text-sud-orange' },
          { label: 'Demos Subidas', value: demosCount, icon: <AudioLines size={20} />, color: 'from-sky-500/20 to-sky-500/5 border-sky-500/20 text-sky-400' },
        ].map((kpi, idx) => (
          <div key={idx} className={`relative overflow-hidden p-6 rounded-[2rem] border bg-gradient-to-br ${kpi.color}`}>
            <div className="flex items-center justify-between mb-4">
              <span className="opacity-80">{kpi.icon}</span>
              <span className="text-[8px] font-black uppercase tracking-[0.2em] opacity-40">Métrica</span>
            </div>
            <p className="text-3xl font-black text-white tracking-tight">{kpi.value}</p>
            <p className="text-[9px] text-slate-400 light:text-slate-600 font-black uppercase tracking-widest mt-2">{kpi.label}</p>
          </div>
        ))}
      </section>

      {/* Distribución de Estados: Alumnos y Postulaciones */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Estado de Alumnos */}
        <div className="sud-glass-panel p-8 md:p-10 flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-black uppercase tracking-tighter text-white flex items-center gap-3">
              <TrendingUp className="text-sud-turquoise" size={20} />
              Estado de Alumnos
            </h3>
            <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mt-1">Distribución de perfiles registrados</p>
          </div>

          <div className="space-y-6 mt-8">
            {[
              { label: 'Aprobados', count: metrics.alumnosAprobados, color: 'bg-sud-turquoise', border: 'border-sud-turquoise/20' },
              { label: 'En Revisión', count: metrics.alumnosPendientes, color: 'bg-sud-yellow', border: 'border-sud-yellow/20' },
              { label: 'Inactivos', count: metrics.alumnosInactivos, color: 'bg-red-500', border: 'border-red-500/20' },
            ].map(item => {
              const pct = getPercentage(item.count, metrics.totalAlumnos);
              return (
                <div key={item.label} className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-black uppercase tracking-widest">
                    <span className="text-slate-300 light:text-slate-700">{item.label}</span>
                    <span className="text-white light:text-slate-900">{item.count} <span className="text-slate-500 font-mono font-medium">({pct}%)</span></span>
                  </div>
                  <div className="h-3.5 w-full bg-white/5 light:bg-slate-200 rounded-full overflow-hidden p-0.5 border border-white/10 light:border-slate-300/60">
                    <div 
                      className={`h-full rounded-full transition-all duration-1000 ${item.color}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Estado de Postulaciones */}
        <div className="sud-glass-panel p-8 md:p-10 flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-black uppercase tracking-tighter text-white flex items-center gap-3">
              <BarChart3 className="text-sud-orange" size={20} />
              Postulaciones por Estado
            </h3>
            <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mt-1">Progreso de audiciones y castings</p>
          </div>

          <div className="space-y-5 mt-8">
            {[
              { label: 'Aceptadas', count: metrics.postulacionesAceptadas, color: 'bg-emerald-400' },
              { label: 'En Revisión', count: metrics.postulacionesEnRevision, color: 'bg-sud-yellow' },
              { label: 'Pendientes', count: metrics.postulacionesPendientes, color: 'bg-sky-400' },
              { label: 'Rechazadas', count: metrics.postulacionesRechazadas, color: 'bg-red-400' },
            ].map(item => {
              const pct = getPercentage(item.count, metrics.totalPostulaciones);
              return (
                <div key={item.label} className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-black uppercase tracking-widest">
                    <span className="text-slate-300 light:text-slate-700">{item.label}</span>
                    <span className="text-white light:text-slate-900">{item.count} <span className="text-slate-500 font-mono font-medium">({pct}%)</span></span>
                  </div>
                  <div className="h-3 w-full bg-white/5 light:bg-slate-200 rounded-full overflow-hidden p-0.5 border border-white/10 light:border-slate-300/60">
                    <div 
                      className={`h-full rounded-full transition-all duration-1000 ${item.color}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </section>

      {/* Rankings: Cursos y Convocatorias */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Top Cursos */}
        <div className="sud-glass-panel p-8 md:p-10">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-lg font-black uppercase tracking-tighter text-white">Top 5 Cursos</h3>
              <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mt-1">Con mayor volumen de alumnos inscritos</p>
            </div>
            <div className="text-right">
              <span className="text-xs font-black text-sud-turquoise font-mono">{metrics.promedioAlumnos}</span>
              <p className="text-[7px] text-slate-500 font-black uppercase tracking-widest mt-0.5">Alumnos / Curso Promedio</p>
            </div>
          </div>

          <div className="space-y-4">
            {metrics.topCursos.map((curso, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 rounded-2xl hover:bg-white/[0.04] transition-all">
                <div className="flex items-center gap-4 min-w-0">
                  <span className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center font-mono font-black text-xs text-slate-400 shrink-0">
                    #{idx + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-black text-white uppercase tracking-tight truncate">{curso.titulo}</p>
                    <span className="inline-block text-[7px] font-black uppercase tracking-widest mt-0.5 px-2 py-0.5 rounded-md bg-white/5 text-slate-400 border border-white/10">
                      {curso.modalidad}
                    </span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-sm font-black text-white font-mono">{curso.totalAlumnos}</span>
                  <p className="text-[8px] text-slate-500 font-black uppercase tracking-widest">Inscritos</p>
                </div>
              </div>
            ))}

            {metrics.topCursos.length === 0 && (
              <div className="py-12 text-center border-2 border-dashed border-white/5 rounded-2xl">
                <p className="text-slate-500 font-black uppercase tracking-widest text-[9px]">No hay cursos registrados</p>
              </div>
            )}
          </div>
        </div>

        {/* Top Convocatorias */}
        <div className="sud-glass-panel p-8 md:p-10">
          <div>
            <h3 className="text-lg font-black uppercase tracking-tighter text-white">Top Convocatorias</h3>
            <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mt-1">Con mayor participación de audiciones</p>
          </div>

          <div className="space-y-4 mt-8">
            {metrics.topConvocatorias.map((conv, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 rounded-2xl hover:bg-white/[0.04] transition-all">
                <div className="flex items-center gap-4 min-w-0">
                  <span className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center font-mono font-black text-xs text-slate-400 shrink-0">
                    #{idx + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-black text-white uppercase tracking-tight truncate">{conv.titulo}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded bg-sud-orange/10 text-sud-orange border border-sud-orange/20">
                        {conv.categoria}
                      </span>
                      <span className={`text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded ${
                        conv.estado === 'ACTIVA' 
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                          : 'bg-slate-500/10 text-slate-400 border border-white/10'
                      }`}>
                        {conv.estado}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-sm font-black text-white font-mono">{conv.totalPostulaciones}</span>
                  <p className="text-[8px] text-slate-500 font-black uppercase tracking-widest">Postulaciones</p>
                </div>
              </div>
            ))}

            {metrics.topConvocatorias.length === 0 && (
              <div className="py-12 text-center border-2 border-dashed border-white/5 rounded-2xl">
                <p className="text-slate-500 font-black uppercase tracking-widest text-[9px]">No hay convocatorias registradas</p>
              </div>
            )}
          </div>
        </div>

      </section>

      {/* Distribución Académica Adicional */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Cursos Online', value: metrics.cursosOnline, pct: getPercentage(metrics.cursosOnline, metrics.totalCursos), color: 'border-sky-400/20 bg-sky-400/5 text-sky-400' },
          { label: 'Cursos Presenciales', value: metrics.cursosPresencial, pct: getPercentage(metrics.cursosPresencial, metrics.totalCursos), color: 'border-emerald-500/20 bg-emerald-500/5 text-emerald-400' },
          { label: 'Cursos Mixtos / Híbridos', value: metrics.cursosMixto, pct: getPercentage(metrics.cursosMixto, metrics.totalCursos), color: 'border-violet-500/20 bg-violet-500/5 text-violet-400' },
        ].map((item, idx) => (
          <div key={idx} className={`p-6 rounded-[2rem] border ${item.color} flex items-center justify-between`}>
            <div>
              <p className="text-2xl font-black text-white font-mono">{item.value}</p>
              <p className="text-[9px] text-slate-400 light:text-slate-600 font-black uppercase tracking-widest mt-1">{item.label}</p>
            </div>
            <div className="text-right">
              <span className="text-xs font-black font-mono">{item.pct}%</span>
              <p className="text-[7px] text-slate-500 font-black uppercase tracking-widest">del total</p>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}

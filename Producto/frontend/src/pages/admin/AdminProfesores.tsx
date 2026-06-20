import React, { useState, useEffect, useMemo } from 'react';
import {
  GraduationCap,
  Search,
  Plus,
  Pencil,
  Trash2,
  X,
  AlertCircle,
  Mail,
  Phone,
  Loader,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { profesorService, ProfesorDTO, CreateProfesorRequest, UpdateProfesorRequest } from '../../services/profesorService';
import { cursoService } from '../../services/cursoService';
import { CursoDTO } from '../../types';

// ── Especialidades disponibles ──────────────────────────────────────
const ESPECIALIDADES = [
  'Doblaje',
  'Locución Comercial',
  'Locución Narrativa',
  'Podcasting',
  'Acting de Voz',
  'Dirección de Voz',
  'Producción de Audio',
  'Canto',
  'General',
] as const;

// ── Form State ──────────────────────────────────────────────────────
interface ProfesorForm {
  name: string;
  email: string;
  phone: string;
  especialidad: string;
  password?: string;
  confirmPassword?: string;
  cursosAsignados: string[];
}

const EMPTY_FORM: ProfesorForm = {
  name: '',
  email: '',
  phone: '',
  especialidad: 'General',
  password: '',
  confirmPassword: '',
  cursosAsignados: [],
};

export function AdminProfesores() {
  const [profesores, setProfesores] = useState<ProfesorDTO[]>([]);
  const [realCursos, setRealCursos] = useState<CursoDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ProfesorForm>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Delete confirmation
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // ── Helpers ────────────────────────────────────────────────────────
  const formatPhone = (phone?: string) => {
    if (!phone) return '';
    const digits = phone.replace(/\D/g, '');
    const local = digits.startsWith('56') ? digits.slice(2) : digits;
    const n = local.startsWith('9') ? local.slice(1) : local;
    if (n.length < 8) return phone;
    return `+56 9 ${n.slice(0, 4)} ${n.slice(4, 8)}`;
  };

  const extractEightDigits = (phone?: string) => {
    if (!phone) return '';
    const digits = phone.replace(/\D/g, '');
    if (digits.startsWith('569') && digits.length === 11) {
      return digits.slice(3);
    }
    if (digits.startsWith('9') && digits.length === 9) {
      return digits.slice(1);
    }
    if (digits.length === 8) {
      return digits;
    }
    if (digits.length > 8) {
      return digits.slice(-8);
    }
    return digits;
  };

  const handlePhoneChange = (val: string) => {
    const digits = val.replace(/\D/g, '');
    if (digits.length > 8) return;

    setForm(f => ({ ...f, phone: digits }));
  };

  // ── Load profesores ───────────────────────────────────────────────
  useEffect(() => {
    loadProfesores();
  }, []);

  const loadProfesores = async () => {
    setLoading(true);
    setError(null);
    try {
      const [profData, cursosData] = await Promise.all([
        profesorService.getAll(),
        cursoService.getAll()
      ]);
      setProfesores(profData);
      setRealCursos(cursosData);
    } catch (err: any) {
      setError(err.message || 'Error al cargar profesores o cursos');
    } finally {
      setLoading(false);
    }
  };

  // ── Filtered ──────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    if (!searchTerm) return profesores;
    const low = searchTerm.toLowerCase();
    return profesores.filter(
      p =>
        p.name.toLowerCase().includes(low) ||
        p.email.toLowerCase().includes(low) ||
        p.especialidad.toLowerCase().includes(low) ||
        (p.phone || '').toLowerCase().includes(low),
    );
  }, [profesores, searchTerm]);

  // ── Stats ─────────────────────────────────────────────────────────
  const stats = useMemo(
    () => ({
      total: profesores.length,
      activos: profesores.filter(p => p.active).length,
      inactivos: profesores.filter(p => !p.active).length,
    }),
    [profesores],
  );

  // ── Open modal (create / edit) ────────────────────────────────────
  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setShowModal(true);
  };

  const openEdit = (p: ProfesorDTO) => {
    setEditingId(p.id);
    const cursosDelProfesor = realCursos
      .filter(c => c.profesorId === p.id)
      .map(c => c.id);

    setForm({
      name: p.name,
      email: p.email,
      phone: extractEightDigits(p.phone),
      especialidad: p.especialidad || 'General',
      password: '',
      confirmPassword: '',
      cursosAsignados: cursosDelProfesor,
    });
    setFormError(null);
    setShowModal(true);
  };

  // ── Save ──────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!form.name.trim()) {
      setFormError('El nombre es obligatorio');
      return;
    }
    if (!form.email.trim()) {
      setFormError('El email es obligatorio');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email.trim())) {
      setFormError('Ingresa un email válido (ej: usuario@dominio.com)');
      return;
    }
    if (!form.especialidad || !form.especialidad.trim()) {
      setFormError('La especialidad es obligatoria');
      return;
    }

    if (form.phone.trim()) {
      const digitsOnly = form.phone.replace(/\D/g, '');
      if (digitsOnly.length !== 8) {
        setFormError('El teléfono debe tener 8 dígitos después de +56 9');
        return;
      }
    }

    // Validaciones de contraseña al crear
    if (!editingId) {
      if (!form.password) {
        setFormError('La contraseña temporal es obligatoria');
        return;
      }
      if (form.password.length < 6) {
        setFormError('La contraseña temporal debe tener al menos 6 caracteres');
        return;
      }
      if (form.password !== form.confirmPassword) {
        setFormError('Las contraseñas no coinciden');
        return;
      }
    }

    setSaving(true);
    setFormError(null);

    try {
      const selectedCursoTitles = realCursos
        .filter(c => form.cursosAsignados.includes(c.id))
        .map(c => c.titulo);
      const cursosString = selectedCursoTitles.join(',');

      let profesorId: string;

      const finalPhone = form.phone.trim() ? `569${form.phone.trim()}` : undefined;

      if (editingId) {
        // Update
        const updated = await profesorService.update(editingId, {
          name: form.name.trim(),
          email: form.email.trim(),
          phone: finalPhone,
          especialidad: form.especialidad,
          cursosAsignados: cursosString,
        });
        profesorId = editingId;
        setProfesores(prev => prev.map(p => (p.id === editingId ? updated : p)));
      } else {
        // Create
        const created = await profesorService.create({
          name: form.name.trim(),
          email: form.email.trim(),
          phone: finalPhone,
          especialidad: form.especialidad,
          password: form.password,
          cursosAsignados: cursosString,
        });
        profesorId = created.id;
        setProfesores(prev => [...prev, created]);
      }

      await cursoService.asignarCursos(profesorId, form.cursosAsignados);

      setRealCursos(prev => prev.map(c => {
        if (form.cursosAsignados.includes(c.id)) {
          return { ...c, profesorId: profesorId };
        } else if (c.profesorId === profesorId) {
          return { ...c, profesorId: undefined };
        }
        return c;
      }));

      setShowModal(false);
    } catch (err: any) {
      setFormError(err.message || 'Error al guardar profesor');
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!confirmDeleteId) return;
    setDeleting(true);
    try {
      await profesorService.remove(confirmDeleteId);
      setProfesores(prev => prev.filter(p => p.id !== confirmDeleteId));
      setConfirmDeleteId(null);
    } catch (err: any) {
      setFormError(err.message || 'Error al eliminar');
    } finally {
      setDeleting(false);
    }
  };

  // ── Toggle active ─────────────────────────────────────────────────
  const toggleActive = async (p: ProfesorDTO) => {
    try {
      const updated = await profesorService.update(p.id, { active: !p.active });
      setProfesores(prev => prev.map(x => (x.id === p.id ? updated : x)));
    } catch (err: any) {
      console.error('Error toggling active:', err);
    }
  };

  // ── Loading / Error ───────────────────────────────────────────────
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
        <button onClick={loadProfesores} className="mt-4 text-[10px] text-red-400 underline uppercase tracking-widest font-bold">
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* ── Header ───────────────────────────────────────────────── */}
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tighter text-white">
            Gestión de{' '}
            <span className="sud-vibrant-text-gradient uppercase tracking-widest">Profesores</span>
          </h2>
          <p className="text-slate-400 mt-1 font-medium text-[10px] tracking-widest uppercase">
            Administra el equipo de profesores de voz
          </p>
        </div>
        <button
          onClick={openCreate}
          className="sud-btn-primary px-6 py-3 flex items-center gap-2 text-sm font-black uppercase tracking-widest shrink-0"
        >
          <Plus size={18} /> Nuevo Profesor
        </button>
      </header>

      {/* ── Stats ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total', value: stats.total, color: 'text-white', bg: 'bg-white/5', border: 'border-white/10' },
          { label: 'Activos', value: stats.activos, color: 'text-emerald-400', bg: 'bg-emerald-500/5', border: 'border-emerald-500/20' },
          { label: 'Inactivos', value: stats.inactivos, color: 'text-red-400', bg: 'bg-red-500/5', border: 'border-red-500/20' },
        ].map(stat => (
          <div key={stat.label} className={`p-5 rounded-2xl border ${stat.bg} ${stat.border} text-center`}>
            <p className={`text-3xl font-black ${stat.color}`}>{stat.value}</p>
            <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* ── Search ───────────────────────────────────────────────── */}
      <div className="relative">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" />
        <input
          type="text"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          placeholder="Buscar por nombre, email, especialidad..."
          className="sud-input w-full pl-11"
        />
      </div>

      {/* ── List ─────────────────────────────────────────────────── */}
      <div className="space-y-4">
        <AnimatePresence mode="popLayout">
          {filtered.map((prof, i) => (
            <motion.div
              key={prof.id || `prof-${i}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ delay: i * 0.03 }}
              className="sud-glass-panel p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 group hover:border-white/20 transition-all"
            >
              {/* Left: avatar + info */}
              <div className="flex items-start gap-5 flex-1 min-w-0">
                <div className="w-14 h-14 rounded-2xl bg-sud-gradient p-[1px] shrink-0">
                  <div className="w-full h-full rounded-[0.9rem] bg-black flex items-center justify-center">
                    <GraduationCap className="text-sud-turquoise" size={26} />
                  </div>
                </div>

                <div className="space-y-2 flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <h4 className="text-lg font-black text-white uppercase tracking-tight truncate group-hover:text-sud-turquoise transition-colors">
                      {prof.name || 'Sin nombre'}
                    </h4>
                    {prof.active ? (
                      <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        Activo
                      </span>
                    ) : (
                      <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md bg-red-500/10 text-red-400 border border-red-500/20">
                        Inactivo
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-4 flex-wrap text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                    <span className="flex items-center gap-1.5">
                      <Mail size={11} /> {prof.email}
                    </span>
                    {prof.phone && (
                      <span className="flex items-center gap-1.5">
                        <Phone size={11} /> {formatPhone(prof.phone)}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-md bg-violet-500/10 text-violet-400 border border-violet-500/20">
                      {prof.especialidad || 'General'}
                    </span>
                    <span className="text-[9px] text-slate-600 font-bold">
                      {prof.createdAt ? new Date(prof.createdAt).toLocaleDateString() : ''}
                    </span>
                  </div>
                </div>
              </div>

              {/* Right: actions */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => toggleActive(prof)}
                  title={prof.active ? 'Desactivar' : 'Activar'}
                  className={`p-2.5 rounded-xl border transition-all ${
                    prof.active
                      ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-400 hover:bg-emerald-500/20'
                      : 'border-red-500/20 bg-red-500/5 text-red-400 hover:bg-red-500/20'
                  }`}
                >
                  {prof.active ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                </button>
                <button
                  onClick={() => openEdit(prof)}
                  className="p-2.5 rounded-xl border border-white/10 bg-white/5 text-slate-400 hover:text-sud-turquoise hover:border-sud-turquoise/30 hover:bg-sud-turquoise/5 transition-all"
                >
                  <Pencil size={16} />
                </button>
                <button
                  onClick={() => setConfirmDeleteId(prof.id)}
                  className="p-2.5 rounded-xl border border-red-500/10 bg-red-500/5 text-red-400/60 hover:text-red-400 hover:border-red-500/30 hover:bg-red-500/10 transition-all"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {filtered.length === 0 && (
          <div className="py-20 text-center border-2 border-dashed border-white/5 rounded-[3rem]">
            <GraduationCap size={40} className="mx-auto text-slate-800 mb-6" />
            <p className="text-slate-500 font-black uppercase tracking-widest text-[10px]">
              {profesores.length === 0
                ? 'No hay profesores registrados'
                : 'No se encontraron profesores con esa búsqueda'}
            </p>
            {profesores.length === 0 && (
              <button onClick={openCreate} className="mt-6 sud-btn-primary px-6 py-3 text-xs font-black uppercase tracking-widest">
                <Plus size={16} className="inline mr-2" />
                Agregar Primer Profesor
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Modal: Crear / Editar ────────────────────────────────── */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-y-0 right-0 left-0 md:left-72 z-[9999] flex items-center justify-center p-4 md:p-6"
          >
            {/* Backdrop */}
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowModal(false)} />

            {/* Panel */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-lg bg-[#0f0f0f] border border-white/10 rounded-3xl p-6 md:p-8 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-black text-white uppercase tracking-tight">
                  {editingId ? 'Editar Profesor' : 'Nuevo Profesor'}
                </h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 rounded-xl hover:bg-white/5 text-slate-500 hover:text-white transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              {formError && (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold flex items-center gap-3">
                  <AlertCircle size={16} className="shrink-0" />
                  {formError}
                </div>
              )}

              <div className="space-y-4">
                {/* Name */}
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
                    Nombre completo *
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="Ej: María García"
                    className="sud-input w-full"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
                    Email *
                  </label>
                  <div className="relative group">
                    <input
                      type="email"
                      value={form.email}
                      onChange={e => setForm(f => ({ ...f, email: e.target.value.slice(0, 35) }))}
                      maxLength={35}
                      placeholder="maria@ejemplo.com"
                      className="sud-input w-full pr-16"
                    />
                    <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-black tabular-nums pointer-events-none select-none transition-colors ${(form.email?.length ?? 0) >= 35 ? 'text-red-400' : (form.email?.length ?? 0) >= 28 ? 'text-sud-yellow' : 'text-slate-600'}`}>{form.email?.length ?? 0}/35</span>
                  </div>
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
                    Teléfono
                  </label>
                  <div className="sud-input p-0 flex items-center overflow-hidden focus-within:border-sud-turquoise/60 focus-within:ring-1 focus-within:ring-sud-turquoise/25">
                    <span className="px-4 py-3.5 bg-white/5 border-r border-white/10 text-slate-500 font-mono text-sm select-none shrink-0">
                      +56 9
                    </span>
                    <input
                      type="text"
                      value={form.phone}
                      onChange={e => handlePhoneChange(e.target.value)}
                      placeholder="1234 5678"
                      className="bg-transparent border-0 w-full px-4 py-3.5 text-white placeholder-white/40 light:placeholder-slate-500 focus:outline-none focus:ring-0 text-sm font-medium"
                    />
                  </div>
                </div>

                {/* Especialidad */}
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
                    Especialidad
                  </label>
                  <select
                    value={form.especialidad}
                    onChange={e => setForm(f => ({ ...f, especialidad: e.target.value }))}
                    className="sud-input w-full appearance-none"
                  >
                    {ESPECIALIDADES.map(esp => (
                      <option key={esp} value={esp}>
                        {esp}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Cursos Asignados */}
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
                    Cursos Oficiales Asignados
                  </label>
                  <div className="max-h-48 overflow-y-auto border border-white/10 rounded-2xl p-4 bg-white/[0.01] space-y-2.5">
                    {realCursos.map(curso => {
                      const isChecked = form.cursosAsignados.includes(curso.id);
                      return (
                        <label
                          key={curso.id}
                          className="flex items-start gap-3 text-xs font-bold text-slate-300 hover:text-white cursor-pointer select-none py-0.5"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              if (isChecked) {
                                setForm(f => ({
                                  ...f,
                                  cursosAsignados: f.cursosAsignados.filter(id => id !== curso.id),
                                }));
                              } else {
                                setForm(f => ({
                                  ...f,
                                  cursosAsignados: [...f.cursosAsignados, curso.id],
                                }));
                              }
                            }}
                            className="w-4 h-4 rounded border-white/10 bg-black text-sud-turquoise focus:ring-0 accent-sud-turquoise shrink-0 mt-0.5"
                          />
                          <span className="leading-snug">{curso.titulo} ({curso.modalidad})</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Contraseña temporal (sólo al crear) */}
                {!editingId && (
                  <>
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
                        Contraseña temporal *
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={form.password}
                          onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                          placeholder="Mínimo 6 caracteres"
                          className="sud-input w-full pr-12"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(v => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-sud-turquoise transition-colors p-1"
                          tabIndex={-1}
                        >
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
                        Confirmar contraseña temporal *
                      </label>
                      <div className="relative">
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          value={form.confirmPassword}
                          onChange={e => setForm(f => ({ ...f, confirmPassword: e.target.value }))}
                          placeholder="Repita la contraseña"
                          className="sud-input w-full pr-12"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(v => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-sud-turquoise transition-colors p-1"
                          tabIndex={-1}
                        >
                          {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-5 py-3 rounded-xl text-xs font-black uppercase tracking-widest text-slate-400 hover:text-white hover:bg-white/5 border border-white/10 transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="sud-btn-primary px-6 py-3 text-xs font-black uppercase tracking-widest flex items-center gap-2 disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <Loader size={14} className="animate-spin" /> Guardando...
                    </>
                  ) : editingId ? (
                    'Guardar Cambios'
                  ) : (
                    'Crear Profesor'
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Modal: Confirmar eliminación ─────────────────────────── */}
      <AnimatePresence>
        {confirmDeleteId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          >
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setConfirmDeleteId(null)} />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-sm bg-[#0f0f0f] border border-red-500/20 rounded-3xl p-8 space-y-6 shadow-2xl text-center"
            >
              <div className="w-16 h-16 mx-auto rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                <Trash2 size={28} className="text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white uppercase tracking-tight">Eliminar Profesor</h3>
                <p className="text-slate-400 text-xs mt-2">
                  ¿Estás seguro? El profesor será desactivado y no podrá acceder a la plataforma.
                </p>
              </div>
              <div className="flex justify-center gap-3">
                <button
                  onClick={() => setConfirmDeleteId(null)}
                  className="px-5 py-3 rounded-xl text-xs font-black uppercase tracking-widest text-slate-400 hover:text-white hover:bg-white/5 border border-white/10 transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {deleting ? (
                    <>
                      <Loader size={14} className="animate-spin" /> Eliminando...
                    </>
                  ) : (
                    'Eliminar'
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

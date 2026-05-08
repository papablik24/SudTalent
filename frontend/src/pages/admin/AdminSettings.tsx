import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Settings, User, Lock, Shield, Info, Save, Eye, EyeOff, CheckCircle, Plus, Pencil, Trash2, ToggleLeft, ToggleRight, X, AlertTriangle, BookOpen, Mic2, Film, GraduationCap, Layers } from 'lucide-react';
import { UserProfile, CatalogType, CatalogItem, CATALOG_TYPE_LABELS } from '../../types';
import { useCatalogData } from '../../hooks/useCatalogData';

// ── Tab type ────────────────────────────────────────────────────────
type SettingsTab = 'profile' | 'security' | 'catalogs' | 'system';

// ── Catalog Section Component ───────────────────────────────────────
function CatalogSection({ type, items, onAdd, onUpdate, onToggle, onDelete }: {
  type: CatalogType;
  items: CatalogItem[];
  onAdd: (type: CatalogType, name: string) => { success: boolean; message: string };
  onUpdate: (id: string, name: string) => { success: boolean; message: string };
  onToggle: (id: string) => { success: boolean; message: string };
  onDelete: (id: string) => { success: boolean; message: string };
}) {
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const meta = CATALOG_TYPE_LABELS[type];
  const activeCount = items.filter(i => i.active).length;

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 2500);
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const result = onAdd(type, newName);
    showToast(result.message, result.success);
    if (result.success) setNewName('');
  };

  const handleSaveEdit = () => {
    if (!editingId) return;
    const result = onUpdate(editingId, editName);
    showToast(result.message, result.success);
    if (result.success) setEditingId(null);
  };

  const handleToggle = (id: string) => {
    const result = onToggle(id);
    showToast(result.message, result.success);
  };

  const handleDelete = (id: string) => {
    const result = onDelete(id);
    showToast(result.message, result.success);
    setConfirmDeleteId(null);
  };

  return (
    <div className="bg-white/[0.03] border border-white/10 rounded-[2rem] overflow-hidden">
      {/* Header */}
      <div className="px-8 py-6 border-b border-white/5 flex items-center justify-between">
        <div>
          <h4 className="text-sm font-black uppercase tracking-tight text-white">{meta.title}</h4>
          <p className="text-[9px] text-slate-500 uppercase tracking-widest font-bold mt-1">{meta.description}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[9px] font-black uppercase tracking-widest text-slate-600">
            {activeCount}/{items.length} activas
          </span>
        </div>
      </div>

      {/* Add form */}
      <form onSubmit={handleAdd} className="px-8 py-4 flex gap-3 border-b border-white/5 bg-white/[0.01]">
        <input
          type="text"
          value={newName}
          onChange={e => setNewName(e.target.value)}
          placeholder="Nueva opción..."
          className="sud-input flex-1 py-2.5 text-xs"
        />
        <button type="submit" disabled={!newName.trim()} className="sud-btn-primary px-5 py-2.5 text-[9px] shrink-0 disabled:opacity-30">
          <Plus size={14} /> Agregar
        </button>
      </form>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className={`px-8 py-3 text-[9px] font-black uppercase tracking-widest flex items-center gap-2 ${toast.ok ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}
          >
            {toast.ok ? <CheckCircle size={12} /> : <AlertTriangle size={12} />} {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Items list */}
      <div className="divide-y divide-white/[0.03] max-h-[400px] overflow-y-auto custom-scrollbar">
        {items.map(item => (
          <div key={item.id} className={`px-8 py-4 flex items-center gap-4 group transition-all ${item.active ? '' : 'opacity-40'}`}>
            {editingId === item.id ? (
              <>
                <input
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="sud-input flex-1 py-2 text-xs"
                  autoFocus
                  onKeyDown={e => e.key === 'Enter' && handleSaveEdit()}
                />
                <button onClick={handleSaveEdit} className="p-2 rounded-xl bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-colors">
                  <CheckCircle size={14} />
                </button>
                <button onClick={() => setEditingId(null)} className="p-2 rounded-xl bg-white/5 text-slate-500 hover:bg-white/10 transition-colors">
                  <X size={14} />
                </button>
              </>
            ) : (
              <>
                <span className="flex-1 text-xs font-black uppercase tracking-widest text-white">{item.name}</span>
                {/* Active/Inactive badge */}
                <span className={`text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border ${
                  item.active
                    ? 'bg-green-500/10 text-green-400 border-green-500/20'
                    : 'bg-red-500/10 text-red-400 border-red-500/20'
                }`}>
                  {item.active ? 'Activo' : 'Inactivo'}
                </span>
                {/* Action buttons */}
                <div className="flex gap-1 md:opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleToggle(item.id)}
                    className="p-2 rounded-xl hover:bg-white/5 text-slate-600 hover:text-sud-turquoise transition-colors"
                    title={item.active ? 'Desactivar' : 'Activar'}
                  >
                    {item.active ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                  </button>
                  <button
                    onClick={() => { setEditingId(item.id); setEditName(item.name); }}
                    className="p-2 rounded-xl hover:bg-white/5 text-slate-600 hover:text-sud-orange transition-colors"
                    title="Editar"
                  >
                    <Pencil size={14} />
                  </button>
                  {confirmDeleteId === item.id ? (
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleDelete(item.id)} className="p-2 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 text-[8px] font-black">
                        <CheckCircle size={14} />
                      </button>
                      <button onClick={() => setConfirmDeleteId(null)} className="p-2 rounded-xl bg-white/5 text-slate-500">
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDeleteId(item.id)}
                      className="p-2 rounded-xl hover:bg-red-500/10 text-slate-600 hover:text-red-400 transition-colors"
                      title="Eliminar"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        ))}
        {items.length === 0 && (
          <div className="px-8 py-12 text-center">
            <p className="text-[10px] text-slate-600 font-black uppercase tracking-widest">Sin opciones configuradas</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Settings Page ──────────────────────────────────────────────
interface AdminSettingsProps {
  user: UserProfile | null;
  onUpdateUser?: (updates: Partial<UserProfile>) => void;
}

export function AdminSettings({ user, onUpdateUser }: AdminSettingsProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('catalogs');
  const { getByType, addItem, updateItem, toggleItem, deleteItem } = useCatalogData();

  // Profile form
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [profileSaved, setProfileSaved] = useState(false);

  // Password form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const updates = { name, email, phone };
    if (onUpdateUser) onUpdateUser(updates);
    if (user) localStorage.setItem('sud_current_user', JSON.stringify({ ...user, ...updates }));
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 3000);
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    if (newPassword.length < 6) { setPasswordError('La nueva contraseña debe tener al menos 6 caracteres.'); return; }
    if (newPassword !== confirmPassword) { setPasswordError('Las contraseñas no coinciden.'); return; }
    setPasswordSaved(true);
    setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
    setTimeout(() => setPasswordSaved(false), 3000);
  };

  const catalogTypes: CatalogType[] = [
    'CONVOCATORIA_CATEGORY', 'CONVOCATORIA_STATUS', 'SCENE_TYPE',
    'DEMO_CATEGORY', 'PROFILE_STATUS', 'COURSE_AREA', 'COURSE_LEVEL',
  ];

  const tabs: { key: SettingsTab; label: string; icon: any }[] = [
    { key: 'catalogs', label: 'Catálogos', icon: Layers },
    { key: 'profile', label: 'Mi Cuenta', icon: User },
    { key: 'security', label: 'Seguridad', icon: Lock },
    { key: 'system', label: 'Sistema', icon: Info },
  ];

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-8">
        <div>
          <h2 className="text-3xl font-black tracking-tighter text-white">
            <span className="sud-vibrant-text-gradient uppercase tracking-widest">Ajustes</span> del Panel
          </h2>
          <p className="text-slate-400 mt-1 font-medium text-[10px] tracking-widest uppercase">
            Configuración de catálogos, cuenta y preferencias del sistema
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Sidebar Tabs */}
        <div className="lg:col-span-3">
          <nav className="bg-white/[0.03] border border-white/10 rounded-[2.5rem] p-4 space-y-2 sticky top-8">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`w-full flex items-center gap-3 px-5 py-4 rounded-2xl transition-all text-left text-[10px] font-black uppercase tracking-widest ${
                  activeTab === tab.key ? 'bg-white/5 text-white shadow-xl' : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.02]'
                }`}
              >
                <tab.icon size={16} className={activeTab === tab.key ? 'text-sud-turquoise' : ''} />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="lg:col-span-9">
          <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>

            {/* ── Catalogs Tab ──────────────────────────────────────── */}
            {activeTab === 'catalogs' && (
              <div className="space-y-8">
                <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5">
                  <p className="text-[9px] text-slate-500 uppercase tracking-widest font-black leading-relaxed">
                    Administra los catálogos reutilizables del sistema. Estas opciones se usan en convocatorias, demos, perfiles, Smart Casting y cursos.
                    Puedes agregar, editar, activar/desactivar y eliminar opciones de cada categoría.
                  </p>
                </div>
                {catalogTypes.map(type => (
                  <CatalogSection
                    key={type}
                    type={type}
                    items={getByType(type)}
                    onAdd={addItem}
                    onUpdate={updateItem}
                    onToggle={toggleItem}
                    onDelete={deleteItem}
                  />
                ))}
              </div>
            )}

            {/* ── Profile Tab ──────────────────────────────────────── */}
            {activeTab === 'profile' && (
              <section className="bg-white/[0.03] border border-white/10 rounded-[2.5rem] p-10 shadow-2xl space-y-8">
                <div className="flex items-center gap-4 mb-2">
                  <div className="p-4 rounded-2xl bg-sud-turquoise/10"><User size={24} className="text-sud-turquoise" /></div>
                  <div>
                    <h3 className="text-xl font-black uppercase tracking-tight text-white">Datos del Administrador</h3>
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black">Información de tu cuenta</p>
                  </div>
                </div>
                <form onSubmit={handleSaveProfile} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase font-bold text-slate-500 px-1 tracking-widest">Nombre Completo</label>
                      <input type="text" value={name} onChange={e => setName(e.target.value)} className="sud-input w-full" placeholder="Nombre" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase font-bold text-slate-500 px-1 tracking-widest">Correo Electrónico</label>
                      <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="sud-input w-full" placeholder="admin@sudamericanvoices.com" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase font-bold text-slate-500 px-1 tracking-widest">Teléfono</label>
                      <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="sud-input w-full" placeholder="+56 9 XXXX XXXX" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase font-bold text-slate-500 px-1 tracking-widest">Rol</label>
                      <div className="sud-input w-full flex items-center gap-2 cursor-not-allowed opacity-60">
                        <Shield size={14} className="text-sud-turquoise" />
                        <span className="text-sm font-black uppercase">{user?.role || 'ADMIN'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <button type="submit" className="sud-btn-primary px-8 py-4 text-xs"><Save size={16} /> Guardar Cambios</button>
                    {profileSaved && <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 text-[10px] font-black text-green-400 uppercase tracking-widest"><CheckCircle size={14} /> Guardado</motion.span>}
                  </div>
                </form>
              </section>
            )}

            {/* ── Security Tab ─────────────────────────────────────── */}
            {activeTab === 'security' && (
              <section className="bg-white/[0.03] border border-white/10 rounded-[2.5rem] p-10 shadow-2xl space-y-8">
                <div className="flex items-center gap-4 mb-2">
                  <div className="p-4 rounded-2xl bg-sud-orange/10"><Lock size={24} className="text-sud-orange" /></div>
                  <div>
                    <h3 className="text-xl font-black uppercase tracking-tight text-white">Seguridad</h3>
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black">Cambiar contraseña</p>
                  </div>
                </div>
                <form onSubmit={handleChangePassword} className="space-y-6 max-w-lg">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-bold text-slate-500 px-1 tracking-widest">Contraseña Actual</label>
                    <div className="relative">
                      <input type={showPasswords ? 'text' : 'password'} value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} className="sud-input w-full pr-12" placeholder="••••••••" required />
                      <button type="button" onClick={() => setShowPasswords(!showPasswords)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 hover:text-sud-turquoise transition-colors" tabIndex={-1}>
                        {showPasswords ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-bold text-slate-500 px-1 tracking-widest">Nueva Contraseña</label>
                    <input type={showPasswords ? 'text' : 'password'} value={newPassword} onChange={e => setNewPassword(e.target.value)} className="sud-input w-full" placeholder="Mínimo 6 caracteres" required />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-bold text-slate-500 px-1 tracking-widest">Confirmar Contraseña</label>
                    <input type={showPasswords ? 'text' : 'password'} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="sud-input w-full" placeholder="Repite la contraseña" required />
                  </div>
                  {passwordError && <p className="text-[10px] font-black text-red-400 uppercase tracking-widest px-1">{passwordError}</p>}
                  <div className="flex items-center gap-4">
                    <button type="submit" className="sud-btn-primary px-8 py-4 text-xs"><Lock size={16} /> Cambiar Contraseña</button>
                    {passwordSaved && <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 text-[10px] font-black text-green-400 uppercase tracking-widest"><CheckCircle size={14} /> Actualizada</motion.span>}
                  </div>
                </form>
                <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 space-y-4 mt-4">
                  <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Información de Seguridad</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div><p className="text-[8px] uppercase font-black text-slate-600 tracking-widest mb-1">Método de Auth</p><p className="text-xs font-black text-white uppercase">JWT + BCrypt</p></div>
                    <div><p className="text-[8px] uppercase font-black text-slate-600 tracking-widest mb-1">Última sesión</p><p className="text-xs font-black text-white uppercase">{new Date().toLocaleDateString('es-CL')}</p></div>
                  </div>
                </div>
              </section>
            )}

            {/* ── System Tab ──────────────────────────────────────── */}
            {activeTab === 'system' && (
              <section className="bg-white/[0.03] border border-white/10 rounded-[2.5rem] p-10 shadow-2xl space-y-8">
                <div className="flex items-center gap-4 mb-2">
                  <div className="p-4 rounded-2xl bg-white/5"><Info size={24} className="text-slate-400" /></div>
                  <div>
                    <h3 className="text-xl font-black uppercase tracking-tight text-white">Información del Sistema</h3>
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black">Datos técnicos de la plataforma</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {[
                    { label: 'Plataforma', value: 'SudTalent' },
                    { label: 'Versión', value: 'v1.2.0' },
                    { label: 'Frontend', value: 'React 19 + Vite + Tailwind' },
                    { label: 'Backend', value: 'Spring Boot + PostgreSQL' },
                    { label: 'Autenticación', value: 'JWT + BCrypt' },
                    { label: 'Empresa', value: 'Sudamerican Voices®' },
                    { label: 'Ambiente', value: import.meta.env.MODE === 'production' ? 'Producción' : 'Desarrollo' },
                    { label: 'API Base', value: import.meta.env.VITE_API_URL || 'http://localhost:8080' },
                  ].map(item => (
                    <div key={item.label} className="p-6 rounded-2xl bg-white/[0.02] border border-white/5">
                      <p className="text-[8px] uppercase font-black text-slate-600 tracking-widest mb-2">{item.label}</p>
                      <p className="text-sm font-black text-white uppercase tracking-tight">{item.value}</p>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-4 pt-4">
                  <img src="/logos/SUD_ISO_1.png" alt="SUD" className="h-8 w-8 object-contain opacity-30" />
                  <p className="text-[9px] text-slate-600 font-black uppercase tracking-widest">© 2026 Sudamerican Voices. Todos los derechos reservados.</p>
                </div>
              </section>
            )}

          </motion.div>
        </div>
      </div>
    </div>
  );
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Mic2, 
  Users, 
  Plus, 
  Search, 
  LogOut, 
  ShieldCheck, 
  Phone, 
  ChevronRight, 
  CheckCircle2, 
  Trash2,
  User,
  Settings,
  AudioLines,
  Sparkles
} from 'lucide-react';
import { AppView, UserRole, UserProfile, WhitelistEntry } from './types';

// Mock Initial Whitelist
const INITIAL_WHITELIST: WhitelistEntry[] = [
  { phone: '12345', addedAt: new Date() }, // Test Number
  { phone: '1234567890', addedAt: new Date() },
  { phone: '9876543210', addedAt: new Date() },
];

export default function App() {
  const [view, setView] = useState<AppView>('AUTH');
  const [role, setRole] = useState<UserRole | null>(null);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [whitelist, setWhitelist] = useState<WhitelistEntry[]>(INITIAL_WHITELIST);
  const [loading, setLoading] = useState(false);

  // Authentication Logic
  const handleUserLogin = (phone: string) => {
    setLoading(true);
    // Simulate API delay
    setTimeout(() => {
      const isWhitelisted = whitelist.find(w => w.phone === phone);
      if (isWhitelisted) {
        // In a real app, this would trigger an OTP
        setRole('USER');
        const user: UserProfile = {
          id: btoa(phone),
          phone: phone,
          onboarded: false // Suppose first time for this prototype
        };
        setCurrentUser(user);
        setView('USER_ONBOARDING');
      } else {
        alert('Número no autorizado. Contacta a Sudamerican Voices.');
      }
      setLoading(false);
    }, 1500);
  };

  const handleAdminLogin = () => {
    setRole('ADMIN');
    setView('ADMIN_DASHBOARD');
  };

  const handleOnboardingComplete = (data: Partial<UserProfile>) => {
    if (currentUser) {
      const updatedUser = { ...currentUser, ...data, onboarded: true };
      setCurrentUser(updatedUser);
      setView('USER_PROFILE');
    }
  };

  const handleLogout = () => {
    setView('AUTH');
    setRole(null);
    setCurrentUser(null);
  };

  const addToWhitelist = (phone: string) => {
    if (whitelist.some(w => w.phone === phone)) return;
    setWhitelist([{ phone, addedAt: new Date() }, ...whitelist]);
  };

  const removeFromWhitelist = (phone: string) => {
    setWhitelist(whitelist.filter(w => w.phone !== phone));
  };

  return (
    <div className="min-h-screen selection:bg-sud-orange selection:text-white bg-[#0a0a0a] text-slate-100">
      <AnimatePresence mode="wait">
        {view === 'AUTH' && (
          <AuthScreen 
            onUserLogin={handleUserLogin} 
            onAdminLogin={handleAdminLogin}
            loading={loading}
          />
        )}
        
        {view === 'ADMIN_DASHBOARD' && (
          <Layout onLogout={handleLogout} role="ADMIN">
            <AdminDashboard 
              whitelist={whitelist} 
              onAdd={addToWhitelist}
              onRemove={removeFromWhitelist}
            />
          </Layout>
        )}

        {view === 'USER_ONBOARDING' && (
          <UserOnboarding 
            onComplete={handleOnboardingComplete} 
            userPhone={currentUser?.phone || ''}
          />
        )}

        {view === 'USER_PROFILE' && (
          <Layout onLogout={handleLogout} role="USER" user={currentUser}>
            <UserProfileView user={currentUser!} />
          </Layout>
        )}
      </AnimatePresence>
    </div>
  );
}

// --- SHARED COMPONENTS ---

function Layout({ children, onLogout, role, user }: { 
  children: React.ReactNode; 
  onLogout: () => void;
  role: UserRole;
  user?: UserProfile | null;
}) {
  return (
    <div className="flex flex-col md:flex-row h-screen overflow-hidden bg-[#0a0a0a]">
      {/* Sidebar */}
      <aside className="w-full md:w-64 sud-glass-sidebar flex flex-col p-6 space-y-8 backdrop-blur-md relative z-20">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 flex items-center justify-center p-1">
            <img 
              src="https://sudamericanvoices.com/wp-content/uploads/2021/04/Logo-Sudamerican-Voices-2021-white.png" 
              alt="Sudamerican Voices Logo" 
              className="w-full h-auto object-contain"
              referrerPolicy="no-referrer"
              onError={(e) => {
                // Fallback to Icon if image fails
                e.currentTarget.style.display = 'none';
                e.currentTarget.parentElement?.classList.add('sud-vibrant-gradient', 'rounded-xl');
                const mic = document.createElement('div');
                mic.className = 'text-black font-bold';
                mic.innerText = 'S'; // Simple fallback letter
                e.currentTarget.parentElement?.appendChild(mic);
              }}
            />
          </div>
          <div className="flex flex-col">
            <h1 className="text-xl font-black tracking-tighter leading-none text-white uppercase">
              SUD<span className="sud-vibrant-text-gradient">TALENT</span>
            </h1>
            <span className="text-[10px] text-slate-500 tracking-widest uppercase">
              Voices Management
            </span>
          </div>
        </div>

        <nav className="flex-1 space-y-2">
          {role === 'ADMIN' ? (
            <>
              <NavItem icon={<ShieldCheck size={20} />} label="Lista Blanca" active />
              <NavItem icon={<Users size={20} />} label="Gestión Alumnos" />
              <NavItem icon={<Settings size={20} />} label="Ajustes" />
            </>
          ) : (
            <>
              <NavItem icon={<User size={20} />} label="Mi Perfil" active />
              <NavItem icon={<AudioLines size={20} />} label="Mis Demos" />
              <NavItem icon={<Sparkles size={20} />} label="Oportunidades" />
            </>
          )}
        </nav>

        <div className="pt-6 border-t border-white/10">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden">
              {user?.avatar ? (
                <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <User className="text-slate-500" size={20} />
              )}
            </div>
            <div className="truncate">
              <p className="text-sm font-bold truncate text-slate-200">{user?.name || (role === 'ADMIN' ? 'Admin' : 'Alumno')}</p>
              <p className="text-[10px] text-slate-500 truncate uppercase tracking-widest">{role === 'ADMIN' ? 'Acceso Total' : user?.phone}</p>
            </div>
          </div>
          <button 
            onClick={onLogout}
            className="flex items-center space-x-2 text-slate-500 hover:text-white transition-colors w-full group"
          >
            <LogOut size={18} className="group-hover:translate-x-1 transition-transform" />
            <span className="text-xs font-bold uppercase tracking-widest">Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        <main className="flex-1 overflow-y-auto p-4 md:p-8 relative z-10">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-sud-turquoise/5 blur-[120px] rounded-full pointer-events-none" />
          <motion.div
             initial={{ opacity: 0, y: 10 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ duration: 0.3 }}
          >
            {children}
          </motion.div>
        </main>

        <footer className="h-12 bg-black flex items-center px-8 border-t border-white/5 justify-between relative z-20">
          <div className="flex gap-4">
            <span className="text-[9px] text-slate-600 uppercase tracking-widest font-semibold">SudTalent v1.0.2</span>
            <span className="text-[9px] text-slate-600 uppercase tracking-widest font-semibold hidden md:inline">Security: SSL + AES-256 OTP</span>
          </div>
          <div className="text-[9px] text-slate-500 hidden sm:block">
            Exclusivo para alumnos de <b>Sudamerican Voices</b>
          </div>
        </footer>
      </div>
    </div>
  );
}

function NavItem({ icon, label, active = false }: { icon: React.ReactNode; label: string; active?: boolean }) {
  return (
    <button className={`flex items-center space-x-3 w-full p-3 rounded-xl transition-all duration-200 ${
      active 
        ? 'bg-white/5 text-white border border-white/10' 
        : 'text-white/40 hover:text-white hover:bg-white/[0.02]'
    }`}>
      <span className={active ? 'text-sud-orange' : ''}>{icon}</span>
      <span className="text-sm font-medium">{label}</span>
    </button>
  );
}

// --- VIEW COMPONENTS ---

function AuthScreen({ onUserLogin, onAdminLogin, loading }: { 
  onUserLogin: (phone: string) => void; 
  onAdminLogin: () => void;
  loading: boolean;
}) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [phone, setPhone] = useState('');
  const [otpSent, setOtpSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isAdmin) {
      onAdminLogin();
    } else if (!otpSent) {
      setOtpSent(true);
    } else {
      onUserLogin(phone);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-sud-dark relative overflow-hidden">
      {/* Decorative Orbs */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-sud-turquoise/10 blur-[120px] rounded-full -mr-64 -mt-64" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-sud-orange/10 blur-[120px] rounded-full -ml-64 -mb-64" />

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-10">
          <div className="inline-block mb-6 relative">
             <div className="absolute inset-0 bg-sud-orange/20 blur-3xl rounded-full scale-150"></div>
             <img 
              src="https://sudamericanvoices.com/wp-content/uploads/2021/04/Logo-Sudamerican-Voices-2021-white.png" 
              alt="Sudamerican Voices" 
              className="w-32 h-auto object-contain relative z-10 mx-auto"
              referrerPolicy="no-referrer"
            />
          </div>
          <h1 className="text-4xl font-black tracking-tighter mb-2 text-white">
            SUD<span className="sud-vibrant-text-gradient uppercase tracking-widest ml-2">Talent</span>
          </h1>
          <p className="text-slate-400 font-medium text-xs uppercase tracking-widest">Plataforma Exclusiva Sudamerican Voices</p>
        </div>

        <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-sud-orange/10 blur-[60px] rounded-full"></div>
          <div className="flex bg-black/40 p-1.5 rounded-2xl mb-8 relative z-10 font-bold uppercase tracking-widest text-[10px]">
            <button 
              onClick={() => { setIsAdmin(false); setOtpSent(false); }}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${!isAdmin ? 'bg-white/10 text-white shadow-lg' : 'text-white/40'}`}
            >
              Alumno
            </button>
            <button 
              onClick={() => { setIsAdmin(true); setOtpSent(false); }}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${isAdmin ? 'bg-white/10 text-white shadow-lg' : 'text-white/40'}`}
            >
              Admin
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {!isAdmin ? (
              <>
                <div className="space-y-4">
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={20} />
                    <input 
                      type="tel"
                      placeholder="Número de Teléfono"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      disabled={otpSent || loading}
                      className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 pl-12 pr-4 focus:border-sud-turquoise focus:ring-1 focus:ring-sud-turquoise transition-all outline-none text-white placeholder:text-slate-700 font-mono text-sm"
                      required
                    />
                  </div>
                  
                  <AnimatePresence>
                    {otpSent && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="space-y-2"
                      >
                        <p className="text-xs text-sud-turquoise font-medium px-2">Código enviado vía SMS (simulado)</p>
                        <input 
                          type="text"
                          maxLength={6}
                          placeholder="Código OTP (6 dígitos)"
                          className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 px-4 focus:border-sud-orange focus:ring-1 focus:ring-sud-orange transition-all outline-none text-center text-xl tracking-[0.5em] font-mono"
                          required
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </>
            ) : (
              <div className="space-y-4">
                <input 
                  type="email"
                  placeholder="Admin Email"
                  className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 px-4 focus:border-sud-yellow focus:ring-1 focus:ring-sud-yellow transition-all outline-none"
                  required
                />
                <input 
                  type="password"
                  placeholder="Contraseña"
                  className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 px-4 focus:border-sud-yellow focus:ring-1 focus:ring-sud-yellow transition-all outline-none"
                  required
                />
              </div>
            )}

            <button 
              type="submit"
              disabled={loading}
              className="sud-btn-primary"
            >
              {loading ? (
                <div className="w-6 h-6 border-2 border-black/30 border-t-black rounded-full animate-spin" />
              ) : (
                <>
                  <span>{isAdmin ? 'Ingresar como Admin' : (otpSent ? 'Validar Código' : 'Solicitar Acceso')}</span>
                  {!loading && <ChevronRight size={18} />}
                </>
              )}
            </button>
          </form>

          {!isAdmin && !otpSent && (
            <p className="text-center mt-6 text-xs text-white/30">
              Solo para alumnos y exalumnos autorizados por Sudamerican Voices.
            </p>
          )}
        </div>
      </motion.div>
    </div>
  );
}

function AdminDashboard({ whitelist, onAdd, onRemove }: { 
  whitelist: WhitelistEntry[]; 
  onAdd: (phone: string) => void;
  onRemove: (phone: string) => void;
}) {
  const [newPhone, setNewPhone] = useState('');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPhone.trim()) {
      onAdd(newPhone.trim());
      setNewPhone('');
    }
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-8">
        <div>
          <h2 className="text-3xl font-black tracking-tighter text-white">Gestión de <span className="sud-vibrant-text-gradient underline decoration-sud-turquoise/30 decoration-4 underline-offset-8 uppercase">Lista Blanca</span></h2>
          <p className="text-slate-400 mt-2 font-medium text-xs tracking-widest uppercase">Control de acceso restringido para Sudamerican Voices</p>
        </div>
        <form onSubmit={handleAdd} className="flex space-x-2">
          <input 
            type="tel"
            placeholder="Número (+56...)"
            value={newPhone}
            onChange={(e) => setNewPhone(e.target.value)}
            className="sud-input w-full md:w-64"
          />
          <button type="submit" className="sud-btn-secondary px-6">
            + Añadir
          </button>
        </form>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard label="Total Autorizados" value={whitelist.length.toString()} color="sud-turquoise" />
        <StatCard label="Ingresos Hoy" value="12" color="sud-orange" />
        <StatCard label="Nuevas Solicitudes" value="3" color="sud-yellow" />
      </div>

      <div className="bg-white/[0.02] border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <ShieldCheck className="text-sud-turquoise" size={20} />
            Números Autorizados
          </h3>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" size={16} />
            <input 
              placeholder="Buscar teléfono..." 
              className="bg-black/40 border border-white/5 rounded-full py-1.5 pl-9 pr-4 text-xs outline-none focus:border-white/20 transition-all"
            />
          </div>
        </div>
        <table className="w-full text-left">
          <thead className="text-xs uppercase text-white/20 bg-white/[0.02]">
            <tr>
              <th className="px-6 py-4 font-semibold">Teléfono</th>
              <th className="px-6 py-4 font-semibold">Fecha de Alta</th>
              <th className="px-6 py-4 font-semibold">Estado</th>
              <th className="px-6 py-4 font-semibold text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {whitelist.map((entry, idx) => (
              <tr key={idx} className="hover:bg-white/[0.01] transition-colors group">
                <td className="px-6 py-4 font-mono text-sm">{entry.phone}</td>
                <td className="px-6 py-4 text-sm text-white/40">{entry.addedAt.toLocaleDateString()}</td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sud-turquoise/10 text-sud-turquoise uppercase tracking-wider">
                    Activo
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button 
                    onClick={() => onRemove(entry.phone)}
                    className="p-2 text-white/10 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-6 relative overflow-hidden group">
      <div className={`absolute top-0 right-0 w-24 h-24 blur-3xl opacity-20 -mr-12 -mt-12 bg-${color}`} />
      <p className="text-white/40 text-sm font-medium uppercase tracking-widest">{label}</p>
      <p className="text-4xl font-bold mt-2">{value}</p>
    </div>
  );
}

function UserOnboarding({ onComplete, userPhone }: { onComplete: (data: Partial<UserProfile>) => void; userPhone: string }) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    specialties: [] as string[]
  });

  const specs = ['Doblaje', 'Locución Comercial', 'Actuación de Voz', 'Canto', 'Narración'];

  const toggleSpec = (spec: string) => {
    setFormData(prev => ({
      ...prev,
      specialties: prev.specialties.includes(spec) 
        ? prev.specialties.filter(s => s !== spec) 
        : [...prev.specialties, spec]
    }));
  };

  return (
    <div className="min-h-screen bg-sud-dark flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-sud-turquoise/10 blur-[150px] rounded-full -mr-32 -mt-32" />
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-sud-orange/10 blur-[150px] rounded-full -ml-32 -mb-32" />

      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-2xl bg-white/[0.03] border border-white/10 rounded-[2.5rem] p-10 relative overflow-hidden shadow-2xl backdrop-blur-3xl"
      >
        <div className="absolute top-0 left-0 w-full h-1 sud-vibrant-gradient opacity-30" />
        
        <div className="flex justify-between items-center mb-12">
          <div>
            <h2 className="text-3xl font-black mb-1 tracking-tight">Casi listo, <span className="sud-vibrant-text-gradient uppercase">Artistas</span></h2>
            <p className="text-slate-500 font-medium text-xs tracking-widest uppercase">Completa tu perfil profesional en SudTalent</p>
          </div>
          <div className="text-right">
            <span className="text-[11px] font-black text-sud-turquoise uppercase tracking-widest">Paso {step} de 2</span>
            <div className="flex gap-1 mt-1">
              <div className={`h-1.5 w-8 rounded-full transition-all duration-500 ${step >= 1 ? 'bg-sud-turquoise' : 'bg-white/10'}`} />
              <div className={`h-1.5 w-8 rounded-full transition-all duration-500 ${step >= 2 ? 'bg-sud-turquoise' : 'bg-white/10'}`} />
            </div>
          </div>
        </div>

        {step === 1 ? (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold text-slate-500 px-1 tracking-widest">Nombre Completo</label>
                <input 
                  type="text" 
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="sud-input w-full"
                  placeholder="Carlos Méndez"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold text-slate-500 px-1 tracking-widest">Correo Electrónico</label>
                <input 
                  type="email" 
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                  className="sud-input w-full"
                  placeholder="carlos@voices.com"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <button 
                onClick={() => setStep(2)}
                disabled={!formData.name || !formData.email}
                className="sud-btn-secondary px-10 py-4 shadow-xl"
              >
                Continuar
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="space-y-4">
              <label className="text-[10px] uppercase font-bold text-slate-500 px-1 tracking-widest">Tus Especialidades</label>
              <div className="flex flex-wrap gap-3">
                {specs.map(s => (
                  <button 
                    key={s}
                    onClick={() => toggleSpec(s)}
                    className={`px-6 py-3 rounded-2xl border transition-all text-xs font-bold uppercase tracking-wider ${
                      formData.specialties.includes(s) 
                        ? 'bg-sud-turquoise/20 border-sud-turquoise text-sud-turquoise shadow-lg shadow-sud-turquoise/10' 
                        : 'bg-white/5 border-white/10 text-slate-500 hover:border-white/30 hover:text-white'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div className="bg-black/40 p-6 rounded-3xl border border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-sud-turquoise/10 flex items-center justify-center">
                  <CheckCircle2 className="text-sud-turquoise" size={20} />
                </div>
                <div>
                   <p className="text-xs font-bold text-white tracking-widest uppercase">Todo Listo</p>
                   <p className="text-[10px] text-slate-500 uppercase">Podrás subir tus demos al finalizar.</p>
                </div>
              </div>
              <button 
                onClick={() => onComplete(formData)}
                className="sud-btn-primary md:w-auto md:px-12"
              >
                Finalizar Registro
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}

function UserProfileView({ user }: { user: UserProfile }) {
  return (
    <div className="space-y-10">
      <section className="relative rounded-[3rem] overflow-hidden bg-black border border-white/10 shadow-2xl">
        <div className="h-48 sud-vibrant-gradient opacity-10 blur-3xl absolute -top-24 w-full" />
        <div className="p-10 relative flex flex-col md:flex-row items-center md:items-end gap-8">
          <div className="w-32 h-32 rounded-[2rem] bg-white/5 border-2 border-white/10 p-1 flex-shrink-0 group cursor-pointer relative shadow-xl">
            <div className="w-full h-full rounded-[1.8rem] overflow-hidden bg-sud-dark flex items-center justify-center">
              <User size={48} className="text-slate-700 group-hover:text-sud-orange transition-colors" />
            </div>
            <div className="absolute -bottom-2 -right-2 bg-sud-orange p-2.5 rounded-2xl shadow-lg ring-4 ring-black">
              <Sparkles size={16} className="text-white" />
            </div>
          </div>
          <div className="flex-1 text-center md:text-left space-y-2">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
              <h2 className="text-4xl font-black tracking-tighter text-white">{user.name}</h2>
              <span className="px-3 py-1.5 rounded-full bg-sud-turquoise/10 text-sud-turquoise text-[10px] font-black uppercase tracking-widest border border-sud-turquoise/20 shadow-lg shadow-sud-turquoise/5">
                Talento Verificado
              </span>
            </div>
            <p className="text-slate-500 flex items-center justify-center md:justify-start gap-2 font-bold text-xs uppercase tracking-widest">
              <AudioLines size={16} className="text-sud-orange" />
              {user.specialty?.join(' • ') || 'Actor de Voz'}
            </p>
          </div>
          <div className="flex gap-4">
            <button className="sud-btn-secondary px-10 py-5 rounded-3xl shadow-2xl">
              Subir Nueva Demo
            </button>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        <div className="md:col-span-8 space-y-6">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-xl font-black uppercase tracking-tighter text-white">Mis Demos <span className="text-slate-700 ml-2 font-mono text-sm">(3)</span></h3>
            <button className="text-[10px] uppercase font-bold text-slate-500 hover:text-white transition-colors tracking-widest">Ver Todas</button>
          </div>
          <DemoItem title="Doblaje - Anime Proyect" date="Ayer" duration="1:24" tags={['Dramático', 'Young']} />
          <DemoItem title="Locución Comercial - TechBrand" date="Hace 2 días" duration="0:30" tags={['Enérgico', 'Natural']} />
          <DemoItem title="Narración Sci-Fi Audio" date="15 Abr" duration="3:45" tags={['Narrativo', 'Profundo']} />
        </div>
        <div className="md:col-span-4 space-y-6">
          <h3 className="text-xl font-black uppercase tracking-tighter text-white px-2">Contacto Sud</h3>
          <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 space-y-6 shadow-2xl backdrop-blur-md relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-sud-yellow/5 blur-3xl rounded-full" />
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-sud-yellow/10 flex items-center justify-center">
                <Mic2 size={24} className="text-sud-yellow" />
              </div>
              <p className="text-sm font-bold text-white leading-tight uppercase tracking-widest">Asignaciones de voz activas</p>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed font-medium">
              Tu perfil es visible para el equipo de producción. Mantén tus demos actualizadas para mayores oportunidades.
            </p>
            <div className="pt-6 border-t border-white/5 space-y-3">
              <div className="bg-black/40 p-5 rounded-2xl border border-white/5 group hover:border-white/10 transition-all cursor-pointer">
                <p className="text-[9px] uppercase font-black text-slate-600 tracking-widest mb-1">Coordinador Principal</p>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-slate-200">Ricardo Frias</p>
                  <ChevronRight size={14} className="text-slate-600 group-hover:text-sud-orange transition-all" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DemoItem({ title, date, duration, tags }: { title: string; date: string; duration: string; tags: string[] }) {
  return (
    <div className="bg-white/5 hover:bg-white/[0.08] border border-white/5 rounded-[2rem] p-6 transition-all group flex items-center gap-6 cursor-pointer shadow-xl relative overflow-hidden">
      <div className="absolute top-0 left-0 w-1 h-full bg-white/5 group-hover:bg-sud-orange transition-all" />
      <div className="w-16 h-16 rounded-2xl bg-black border border-white/10 flex items-center justify-center group-hover:sud-vibrant-gradient transition-all shadow-lg">
        <AudioLines className="text-slate-700 group-hover:text-white" size={28} />
      </div>
      <div className="flex-1 space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="font-bold text-lg text-slate-200 group-hover:text-white transition-colors uppercase tracking-tight">{title}</h4>
          <span className="text-[10px] text-slate-600 font-black uppercase tracking-widest bg-black/40 px-2 py-1 rounded-md">{duration}</span>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          {tags.map(t => (
            <span key={t} className="text-[9px] font-black uppercase tracking-widest bg-white/5 px-2 py-1.5 rounded-lg text-slate-500 group-hover:text-slate-300">
              {t}
            </span>
          ))}
          <div className="flex-1" />
          <span className="text-[10px] font-black text-sud-turquoise uppercase tracking-widest opacity-60">{date}</span>
        </div>
      </div>
    </div>
  );
}


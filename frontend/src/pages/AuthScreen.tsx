import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Lock, ChevronRight, Eye, EyeOff, AlertTriangle, UserPlus, CheckCircle } from 'lucide-react';
interface AuthScreenProps {
  onLogin: (email: string, password: string) => Promise<any>;
  onRegister: (email: string, password: string, name: string) => Promise<any>;
  loading: boolean;
  error: string | null;
}

export function AuthScreen({ onLogin, onRegister, loading, error }: AuthScreenProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const displayError = error || localError;

  const switchMode = (m: 'login' | 'register') => {
    setMode(m);
    setLocalError(null);
    setSuccess(null);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    if (!email || !email.includes('@')) { setLocalError('Ingresa un correo electrónico válido.'); return; }
    if (!password || password.length < 6) { setLocalError('La contraseña debe tener al menos 6 caracteres.'); return; }
    await onLogin(email, password);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    if (!name.trim()) { setLocalError('Ingresa tu nombre completo.'); return; }
    if (!email || !email.includes('@')) { setLocalError('Ingresa un correo electrónico válido.'); return; }
    if (!password || password.length < 6) { setLocalError('La contraseña debe tener al menos 6 caracteres.'); return; }
    if (password !== confirmPassword) { setLocalError('Las contraseñas no coinciden.'); return; }
    await onRegister(email, password, name.trim());
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-sud-black relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[1000px] h-[1000px] bg-sud-turquoise/[0.03] blur-[200px] rounded-full -mr-96 -mt-96" />
      <div className="absolute bottom-0 left-0 w-[1000px] h-[1000px] bg-sud-orange/[0.03] blur-[200px] rounded-full -ml-96 -mb-96" />
      <img src="/logos/SUD_1.png" alt="" className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] opacity-[0.03] pointer-events-none select-none" />

      <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, ease: "easeOut" }} className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-10 flex flex-col items-center">
          <motion.img src="/logos/SUD_ISO_1.png" alt="Sudamerican Voices" className="h-20 w-20 object-contain mb-6 drop-shadow-[0_0_30px_rgba(45,212,191,0.2)]"
            animate={{ scale: [1, 1.04, 1], rotate: [0, 2, -2, 0] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }} />
          <img src="/logos/SUD_LOGO_4.png" alt="Sudamerican Voices" className="h-10 w-auto object-contain mb-4 drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]" />
          <p className="text-slate-400 font-black text-[10px] uppercase tracking-[0.4em] leading-relaxed opacity-80">
            Gestión Profesional de Voz<br /><span className="text-[9px] opacity-40">Ingeniería para Artistas © 2026</span>
          </p>
        </div>

        {/* Card */}
        <div className="sud-glass-panel p-10 relative overflow-hidden border-white/[0.07]">
          <div className="absolute top-0 right-0 w-48 h-48 bg-sud-turquoise/[0.05] blur-[80px] rounded-full -mr-24 -mt-24" />

          {/* Error */}
          <AnimatePresence>
            {displayError && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center gap-3">
                <AlertTriangle size={14} className="text-red-400 shrink-0" />
                <p className="text-red-400 text-[10px] font-black uppercase tracking-widest">{displayError}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Success */}
          <AnimatePresence>
            {success && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                className="mb-6 p-4 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center gap-3">
                <CheckCircle size={14} className="text-green-400 shrink-0" />
                <p className="text-green-400 text-[10px] font-black uppercase tracking-widest">{success}</p>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            {mode === 'login' ? (
              /* ═══ LOGIN ═══ */
              <motion.div key="login" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                <div className="text-center mb-8">
                  <h3 className="text-white font-black uppercase tracking-widest text-xs mb-2">Iniciar Sesión</h3>
                  <p className="text-slate-500 text-[9px] uppercase tracking-widest font-black leading-relaxed">
                    Ingresa tus credenciales para acceder<br />a la plataforma SudTalent
                  </p>
                </div>

                <form onSubmit={handleLogin} className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-bold text-slate-500 px-1 tracking-widest">Correo Electrónico</label>
                    <div className="relative group">
                      <div className="absolute left-5 top-1/2 -translate-y-1/2"><Mail className="text-slate-600 group-focus-within:text-sud-turquoise transition-colors" size={16} /></div>
                      <input type="email" placeholder="ejemplo@sudtalent.cl" value={email} onChange={e => setEmail(e.target.value)} disabled={loading} className="sud-input w-full pl-14 tracking-wide" autoComplete="email" required />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-bold text-slate-500 px-1 tracking-widest">Contraseña</label>
                    <div className="relative group">
                      <div className="absolute left-5 top-1/2 -translate-y-1/2"><Lock className="text-slate-600 group-focus-within:text-sud-turquoise transition-colors" size={16} /></div>
                      <input type={showPassword ? 'text' : 'password'} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} disabled={loading} className="sud-input w-full pl-14 pr-14 tracking-widest" autoComplete="current-password" required />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 hover:text-sud-turquoise transition-colors p-1" tabIndex={-1}>
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <button type="submit" disabled={loading} className="sud-btn-primary w-full h-14 rounded-[1.5rem] mt-3">
                    {loading ? <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" /> : <><span>Acceder</span><ChevronRight size={18} /></>}
                  </button>
                </form>

                {/* Switch to register */}
                <div className="mt-6 text-center">
                  <p className="text-[9px] text-slate-600 font-bold uppercase tracking-widest mb-2">¿No tienes cuenta?</p>
                  <button onClick={() => switchMode('register')}
                    className="text-[10px] font-black text-sud-turquoise uppercase tracking-widest hover:text-white transition-colors flex items-center gap-2 mx-auto">
                    <UserPlus size={14} /> Crear cuenta nueva
                  </button>
                </div>

                {/* Dev credentials */}
                <div className="mt-6 p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                  <p className="text-[8px] text-slate-600 font-black uppercase tracking-[0.2em] text-center mb-3">Cuentas de prueba</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                      <p className="text-[8px] font-black text-sud-turquoise uppercase tracking-widest mb-1">Admin</p>
                      <p className="text-[8px] text-slate-500 font-mono">admin@sudamericanvoices.com</p>
                      <p className="text-[8px] text-slate-600 font-mono">admin123</p>
                    </div>
                    <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                      <p className="text-[8px] font-black text-sud-orange uppercase tracking-widest mb-1">Alumno</p>
                      <p className="text-[8px] text-slate-500 font-mono">alumno@sudtalent.cl</p>
                      <p className="text-[8px] text-slate-600 font-mono">alumno123</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : (
              /* ═══ REGISTER ═══ */
              <motion.div key="register" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <div className="text-center mb-8">
                  <h3 className="text-white font-black uppercase tracking-widest text-xs mb-2">Crear Cuenta</h3>
                  <p className="text-slate-500 text-[9px] uppercase tracking-widest font-black leading-relaxed">
                    Regístrate para acceder<br />a la plataforma SudTalent
                  </p>
                </div>

                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-bold text-slate-500 px-1 tracking-widest">Nombre Completo</label>
                    <div className="relative group">
                      <div className="absolute left-5 top-1/2 -translate-y-1/2"><UserPlus className="text-slate-600 group-focus-within:text-sud-turquoise transition-colors" size={16} /></div>
                      <input type="text" placeholder="Ej: Roberto Pérez" value={name} onChange={e => setName(e.target.value)} disabled={loading} className="sud-input w-full pl-14 tracking-wide" required />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-bold text-slate-500 px-1 tracking-widest">Correo Electrónico</label>
                    <div className="relative group">
                      <div className="absolute left-5 top-1/2 -translate-y-1/2"><Mail className="text-slate-600 group-focus-within:text-sud-turquoise transition-colors" size={16} /></div>
                      <input type="email" placeholder="ejemplo@sudtalent.cl" value={email} onChange={e => setEmail(e.target.value)} disabled={loading} className="sud-input w-full pl-14 tracking-wide" autoComplete="email" required />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-bold text-slate-500 px-1 tracking-widest">Contraseña</label>
                    <div className="relative group">
                      <div className="absolute left-5 top-1/2 -translate-y-1/2"><Lock className="text-slate-600 group-focus-within:text-sud-turquoise transition-colors" size={16} /></div>
                      <input type={showPassword ? 'text' : 'password'} placeholder="Mínimo 6 caracteres" value={password} onChange={e => setPassword(e.target.value)} disabled={loading} className="sud-input w-full pl-14 pr-14 tracking-widest" required />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 hover:text-sud-turquoise transition-colors p-1" tabIndex={-1}>
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-bold text-slate-500 px-1 tracking-widest">Confirmar Contraseña</label>
                    <div className="relative group">
                      <div className="absolute left-5 top-1/2 -translate-y-1/2"><Lock className="text-slate-600 group-focus-within:text-sud-turquoise transition-colors" size={16} /></div>
                      <input type={showPassword ? 'text' : 'password'} placeholder="Repite la contraseña" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} disabled={loading} className="sud-input w-full pl-14 tracking-widest" required />
                    </div>
                  </div>

                  <button type="submit" disabled={loading} className="sud-btn-primary w-full h-14 rounded-[1.5rem] mt-2">
                    {loading ? <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" /> : <><span>Crear Cuenta</span><ChevronRight size={18} /></>}
                  </button>
                </form>

                {/* Switch to login */}
                <div className="mt-6 text-center">
                  <p className="text-[9px] text-slate-600 font-bold uppercase tracking-widest mb-2">¿Ya tienes cuenta?</p>
                  <button onClick={() => switchMode('login')}
                    className="text-[10px] font-black text-sud-turquoise uppercase tracking-widest hover:text-white transition-colors flex items-center gap-2 mx-auto">
                    <Lock size={14} /> Iniciar Sesión
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Footer */}
          <div className="flex flex-col items-center mt-8 gap-3">
            <img src="/logos/LIBERA TU VOZ.png" alt="Libera tu voz" className="h-4 w-auto object-contain opacity-30" />
            <p className="text-[9px] text-slate-700 font-black uppercase tracking-[0.2em] leading-relaxed opacity-60">Uso restringido para comunidad</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}


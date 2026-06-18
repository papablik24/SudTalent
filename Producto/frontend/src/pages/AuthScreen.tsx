import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Lock, ChevronRight, Eye, EyeOff, AlertTriangle, UserPlus, CheckCircle, KeyRound, ArrowLeft, ShieldCheck, Sun, Moon, Phone } from 'lucide-react';
import { authService } from '../services/backendService';
import { useTheme } from '../contexts/ThemeContext';

interface AuthScreenProps {
  onLogin: (email: string, password: string) => Promise<any>;
  onRegister: (email: string, password: string, name: string, phone: string) => Promise<any>;
  onForgotPassword?: (email: string, otp: string, newPassword: string) => Promise<any>;
  loading: boolean;
  error: string | null;
}

export function AuthScreen({ onLogin, onRegister, loading, error }: AuthScreenProps) {
  const { theme, toggleTheme } = useTheme();
  const [mode, setMode] = useState<'login' | 'register' | 'forgot-password'>('login');

  // Login / Register state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Forgot-password state
  const [resetStep, setResetStep] = useState<1 | 2 | 3>(1);
  const [resetEmail, setResetEmail] = useState('');
  const [resetOtp, setResetOtp] = useState('');
  const [resetPassword, setResetPassword] = useState('');
  const [resetConfirmPassword, setResetConfirmPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [showResetPassword, setShowResetPassword] = useState(false);

  const displayError = error || localError;

  // Cooldown countdown timer
  React.useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const timer = setInterval(() => {
      setCooldownSeconds(s => {
        if (s <= 1) { clearInterval(timer); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownSeconds]);

  const clearResetState = () => {
    setResetStep(1);
    setResetEmail('');
    setResetOtp('');
    setResetPassword('');
    setResetConfirmPassword('');
    setResetLoading(false);
    setResetError(null);
    setResetSuccess(null);
    setCooldownSeconds(0);
    setShowResetPassword(false);
  };

  const switchMode = (m: 'login' | 'register' | 'forgot-password') => {
    setMode(m);
    setLocalError(null);
    setSuccess(null);
    if (m !== 'forgot-password') {
      clearResetState();
    }
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
    const phoneDigits = phone.replace(/\D/g, '');
    if (!phoneDigits || phoneDigits.length < 8) { setLocalError('Ingresa tu número de teléfono válido.'); return; }
    if (!email || !email.includes('@')) { setLocalError('Ingresa un correo electrónico válido.'); return; }
    if (!password || password.length < 6) { setLocalError('La contraseña debe tener al menos 6 caracteres.'); return; }
    if (password !== confirmPassword) { setLocalError('Las contraseñas no coinciden.'); return; }
    await onRegister(email, password, name.trim(), phone.trim());
  };

  // Forgot-password handlers
  const handleStep1 = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError(null);
    if (!resetEmail || !resetEmail.includes('@')) {
      setResetError('Ingresa un correo electrónico válido.');
      return;
    }
    setResetLoading(true);
    try {
      await authService.forgotPassword(resetEmail);
      setResetStep(2);
    } catch (err: any) {
      if (err?.cooldown && err?.secondsRemaining) {
        setCooldownSeconds(err.secondsRemaining);
        setResetError(null);
      } else {
        setResetError(err?.message || 'Error inesperado. Intenta nuevamente.');
      }
    } finally {
      setResetLoading(false);
    }
  };

  const handleStep2 = (e: React.FormEvent) => {
    e.preventDefault();
    setResetError(null);
    if (!resetOtp || resetOtp.length !== 6 || !/^\d{6}$/.test(resetOtp)) {
      setResetError('Ingresa el código de 6 dígitos que recibiste.');
      return;
    }
    setResetStep(3);
  };

  const handleStep3 = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError(null);
    if (!resetPassword || resetPassword.length < 6) {
      setResetError('La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (resetPassword !== resetConfirmPassword) {
      setResetError('Las contraseñas no coinciden.');
      return;
    }
    setResetLoading(true);
    try {
      await authService.resetPassword(resetEmail, resetOtp, resetPassword);
      setResetSuccess('¡Contraseña actualizada exitosamente!');
      setTimeout(() => switchMode('login'), 2000);
    } catch (err: any) {
      setResetError(err?.message || 'Error inesperado. Intenta nuevamente.');
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-sud-black light:bg-slate-50 relative overflow-hidden transition-colors duration-300">
      {/* Botón flotante para cambiar tema */}
      <button 
        onClick={toggleTheme}
        className="absolute top-6 right-6 p-3 rounded-2xl bg-white/5 light:bg-white border border-white/10 light:border-slate-200 text-slate-400 light:text-slate-600 hover:text-white light:hover:text-slate-900 shadow-lg transition-all z-20 cursor-pointer"
        title={theme === 'dark' ? "Modo Claro" : "Modo Oscuro"}
      >
        {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
      </button>

      <div className="absolute top-0 right-0 w-[1000px] h-[1000px] bg-sud-turquoise/[0.03] blur-[200px] rounded-full -mr-96 -mt-96" />
      <div className="absolute bottom-0 left-0 w-[1000px] h-[1000px] bg-sud-orange/[0.03] blur-[200px] rounded-full -ml-96 -mb-96" />
      <img src="/logos/SUD_1.png" alt="" className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] opacity-[0.03] pointer-events-none select-none" />

      <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, ease: "easeOut" }} className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-10 flex flex-col items-center">
          <motion.img src="/logos/SUD_ISO_1.png" alt="Sudamerican Voices" className="h-20 w-20 object-contain mb-6 drop-shadow-[0_0_30px_rgba(45,212,191,0.2)]"
            animate={{ scale: [1, 1.04, 1], rotate: [0, 2, -2, 0] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }} />
          <img src="/logos/SUD_LOGO_4.png" alt="Sudamerican Voices" className={`h-10 w-auto object-contain mb-4 drop-shadow-[0_0_15px_rgba(255,255,255,0.1)] ${theme === 'light' ? 'logo-light-outline' : ''}`} />
          <p className="text-slate-400 font-black text-[10px] uppercase tracking-[0.4em] leading-relaxed opacity-80">
            Gestión Profesional de Voz<br /><span className="text-[9px] opacity-40">Ingeniería para Artistas © 2026</span>
          </p>
        </div>

        {/* Card */}
        <div className="sud-glass-panel p-10 relative overflow-hidden border-white/[0.07]">
          <div className="absolute top-0 right-0 w-48 h-48 bg-sud-turquoise/[0.05] blur-[80px] rounded-full -mr-24 -mt-24" />

          {/* Login/Register error */}
          {mode !== 'forgot-password' && (
            <AnimatePresence>
              {displayError && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                  className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center gap-3">
                  <AlertTriangle size={14} className="text-red-400 shrink-0" />
                  <p className="text-red-400 text-[10px] font-black uppercase tracking-widest">{displayError}</p>
                </motion.div>
              )}
            </AnimatePresence>
          )}

          {/* Login/Register success */}
          {mode !== 'forgot-password' && (
            <AnimatePresence>
              {success && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                  className="mb-6 p-4 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center gap-3">
                  <CheckCircle size={14} className="text-green-400 shrink-0" />
                  <p className="text-green-400 text-[10px] font-black uppercase tracking-widest">{success}</p>
                </motion.div>
              )}
            </AnimatePresence>
          )}

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
                <div className="mt-4 text-center">
                  <p className="text-[9px] text-slate-600 font-bold uppercase tracking-widest mb-2">¿No tienes cuenta?</p>
                  <button onClick={() => switchMode('register')}
                    className="text-[10px] font-black text-sud-turquoise uppercase tracking-widest hover:text-white transition-colors flex items-center gap-2 mx-auto">
                    <UserPlus size={14} /> Crear cuenta nueva
                  </button>
                </div>
                {/* Forgot password link */}
                <div className="mt-4 text-center">
                  <button onClick={() => switchMode('forgot-password')}
                    className="text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-sud-turquoise transition-colors flex items-center gap-2 mx-auto">
                    <KeyRound size={13} /> ¿Olvidaste tu contraseña?
                  </button>
                </div>
              </motion.div>

            ) : mode === 'register' ? (
              /* ═══ REGISTER ═══ */
              <motion.div key="register" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <div className="text-center mb-8">
                  <h3 className="text-white font-black uppercase tracking-widest text-xs mb-2">Crear Cuenta</h3>
                  <p className="text-slate-500 text-[9px] uppercase tracking-widest font-black leading-relaxed">
                    Solo disponible para miembros<br />autorizados de Sudamerican Voices
                  </p>
                </div>

                {/* Aviso whitelist */}
                <div className="flex items-start gap-2 mb-5 p-3 rounded-xl bg-sud-turquoise/5 border border-sud-turquoise/15">
                  <ShieldCheck size={13} className="text-sud-turquoise shrink-0 mt-0.5" />
                  <p className="text-[9px] text-slate-400 font-bold leading-relaxed">
                    Tu número de teléfono debe estar autorizado previamente por la administración.
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
                    <label className="text-[10px] uppercase font-bold text-slate-500 px-1 tracking-widest">Teléfono Autorizado <span className="text-sud-turquoise">*</span></label>
                    <div className="relative group">
                      <div className="absolute left-5 top-1/2 -translate-y-1/2"><Phone className="text-slate-600 group-focus-within:text-sud-turquoise transition-colors" size={16} /></div>
                      <input
                        type="tel"
                        placeholder="Ej: +56 9 1234 5678"
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                        disabled={loading}
                        className="sud-input w-full pl-14 tracking-wide"
                        autoComplete="tel"
                        required
                      />
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

            ) : (
              /* ═══ FORGOT PASSWORD ═══ */
              <motion.div key="forgot-password" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>

                {/* Step indicator */}
                <div className="flex items-center justify-center gap-2 mb-6">
                  {[1, 2, 3].map((s) => (
                    <div key={s} className={`h-1.5 rounded-full transition-all duration-300 ${resetStep === s ? 'w-8 bg-sud-turquoise' : resetStep > s ? 'w-4 bg-sud-turquoise/50' : 'w-4 bg-white/10'}`} />
                  ))}
                </div>

                <div className="text-center mb-6">
                  <h3 className="text-white font-black uppercase tracking-widest text-xs mb-2">
                    {resetStep === 1 ? 'Recuperar Contraseña' : resetStep === 2 ? 'Verificar Código' : 'Nueva Contraseña'}
                  </h3>
                  <p className="text-slate-500 text-[9px] uppercase tracking-widest font-black leading-relaxed">
                    {resetStep === 1 && 'Ingresa tu correo y te enviaremos un código'}
                    {resetStep === 2 && <>Código enviado a<br /><span className="text-sud-turquoise">{resetEmail}</span></>}
                    {resetStep === 3 && 'Establece tu nueva contraseña'}
                  </p>
                </div>

                {/* Reset error */}
                <AnimatePresence>
                  {resetError && (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                      className="mb-5 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center gap-3">
                      <AlertTriangle size={14} className="text-red-400 shrink-0" />
                      <p className="text-red-400 text-[10px] font-black uppercase tracking-widest">{resetError}</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Reset success */}
                <AnimatePresence>
                  {resetSuccess && (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                      className="mb-5 p-4 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center gap-3">
                      <CheckCircle size={14} className="text-green-400 shrink-0" />
                      <p className="text-green-400 text-[10px] font-black uppercase tracking-widest">{resetSuccess}</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                <AnimatePresence mode="wait">

                  {resetStep === 1 && (
                    /* STEP 1 — Email */
                    <motion.form key="step1" onSubmit={handleStep1} className="space-y-5"
                      initial={{ opacity: 0, x: -15 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 15 }}>
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase font-bold text-slate-500 px-1 tracking-widest">Correo Electrónico</label>
                        <div className="relative group">
                          <div className="absolute left-5 top-1/2 -translate-y-1/2"><Mail className="text-slate-600 group-focus-within:text-sud-turquoise transition-colors" size={16} /></div>
                          <input
                            type="email"
                            placeholder="ejemplo@sudtalent.cl"
                            value={resetEmail}
                            onChange={e => setResetEmail(e.target.value)}
                            disabled={resetLoading}
                            className="sud-input w-full pl-14 tracking-wide"
                            autoComplete="email"
                            required
                          />
                        </div>
                      </div>

                      <button type="submit" disabled={resetLoading || cooldownSeconds > 0} className="sud-btn-primary w-full h-14 rounded-[1.5rem]">
                        {resetLoading
                          ? <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                          : cooldownSeconds > 0
                            ? <><span>Reenviar en {cooldownSeconds}s</span></>
                            : <><span>Enviar código</span><ChevronRight size={18} /></>}
                      </button>

                      {cooldownSeconds > 0 && (
                        <p className="text-center text-[10px] text-slate-500 font-black uppercase tracking-widest">
                          Puedes reenviar el código en {cooldownSeconds} segundos
                        </p>
                      )}
                    </motion.form>
                  )}

                  {resetStep === 2 && (
                    /* STEP 2 — OTP */
                    <motion.form key="step2" onSubmit={handleStep2} className="space-y-5"
                      initial={{ opacity: 0, x: -15 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 15 }}>
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase font-bold text-slate-500 px-1 tracking-widest">Código OTP (6 dígitos)</label>
                        <div className="relative group">
                          <div className="absolute left-5 top-1/2 -translate-y-1/2"><ShieldCheck className="text-slate-600 group-focus-within:text-sud-turquoise transition-colors" size={16} /></div>
                          <input
                            type="text"
                            inputMode="numeric"
                            placeholder="123456"
                            maxLength={6}
                            value={resetOtp}
                            onChange={e => setResetOtp(e.target.value.replace(/\D/g, ''))}
                            disabled={resetLoading}
                            className="sud-input w-full pl-14 tracking-[0.4em] text-center font-mono"
                            autoComplete="one-time-code"
                            required
                          />
                        </div>
                      </div>

                      <button type="submit" disabled={resetLoading} className="sud-btn-primary w-full h-14 rounded-[1.5rem]">
                        {resetLoading
                          ? <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                          : <><span>Verificar código</span><ChevronRight size={18} /></>}
                      </button>
                    </motion.form>
                  )}

                  {resetStep === 3 && (
                    /* STEP 3 — New password */
                    <motion.form key="step3" onSubmit={handleStep3} className="space-y-4"
                      initial={{ opacity: 0, x: -15 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 15 }}>
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase font-bold text-slate-500 px-1 tracking-widest">Nueva Contraseña</label>
                        <div className="relative group">
                          <div className="absolute left-5 top-1/2 -translate-y-1/2"><Lock className="text-slate-600 group-focus-within:text-sud-turquoise transition-colors" size={16} /></div>
                          <input
                            type={showResetPassword ? 'text' : 'password'}
                            placeholder="Mínimo 6 caracteres"
                            value={resetPassword}
                            onChange={e => setResetPassword(e.target.value)}
                            disabled={resetLoading}
                            className="sud-input w-full pl-14 pr-14 tracking-widest"
                            autoComplete="new-password"
                            required
                          />
                          <button type="button" onClick={() => setShowResetPassword(!showResetPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 hover:text-sud-turquoise transition-colors p-1" tabIndex={-1}>
                            {showResetPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] uppercase font-bold text-slate-500 px-1 tracking-widest">Confirmar Contraseña</label>
                        <div className="relative group">
                          <div className="absolute left-5 top-1/2 -translate-y-1/2"><Lock className="text-slate-600 group-focus-within:text-sud-turquoise transition-colors" size={16} /></div>
                          <input
                            type={showResetPassword ? 'text' : 'password'}
                            placeholder="Repite la contraseña"
                            value={resetConfirmPassword}
                            onChange={e => setResetConfirmPassword(e.target.value)}
                            disabled={resetLoading}
                            className="sud-input w-full pl-14 pr-14 tracking-widest"
                            autoComplete="new-password"
                            required
                          />
                          <button type="button" onClick={() => setShowResetPassword(!showResetPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 hover:text-sud-turquoise transition-colors p-1" tabIndex={-1}>
                            {showResetPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                      </div>

                      <button type="submit" disabled={resetLoading} className="sud-btn-primary w-full h-14 rounded-[1.5rem] mt-2">
                        {resetLoading
                          ? <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                          : <><span>Cambiar contraseña</span><ChevronRight size={18} /></>}
                      </button>
                    </motion.form>
                  )}
                </AnimatePresence>

                {/* Back to login button */}
                <div className="mt-6 text-center">
                  <button
                    onClick={() => switchMode('login')}
                    className="text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-sud-turquoise transition-colors flex items-center gap-2 mx-auto">
                    <ArrowLeft size={13} /> Volver al inicio de sesión
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

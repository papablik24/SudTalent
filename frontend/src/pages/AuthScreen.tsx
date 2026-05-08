import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Phone, ChevronRight } from 'lucide-react';

interface AuthScreenProps {
  onUserLogin: (phone: string, otp?: string) => Promise<any>; 
  onAdminLogin: (email?: string, password?: string) => Promise<any>;
  loading: boolean;
  error: string | null;
}

export function AuthScreen({ onUserLogin, onAdminLogin, loading, error }: AuthScreenProps) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [phone, setPhone] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPass, setAdminPass] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isAdmin) {
      await onAdminLogin(adminEmail, adminPass);
    } else if (!otpSent) {
      if (phone.length !== 8) {
        alert('Por favor ingrese los 8 dígitos de su número móvil.');
        return;
      }
      setOtpSent(true);
    } else {
      if (otp.length !== 6) {
        alert('Por favor ingrese el código de 6 dígitos.');
        return;
      }
      onUserLogin(`+569${phone}`, otp);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-sud-black relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[1000px] h-[1000px] bg-sud-turquoise/[0.03] blur-[200px] rounded-full -mr-96 -mt-96" />
      <div className="absolute bottom-0 left-0 w-[1000px] h-[1000px] bg-sud-orange/[0.03] blur-[200px] rounded-full -ml-96 -mb-96" />

      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-md relative z-10"
      >
        <div className="text-center mb-12">
          <h1 className="text-5xl font-black tracking-tighter mb-4 text-white uppercase italic">
            SUD<span className="sud-vibrant-text-gradient tracking-tight">TALENT</span>
          </h1>
          <p className="text-slate-400 font-black text-[10px] uppercase tracking-[0.4em] leading-relaxed opacity-80">
            Gestión Profesional de Voz<br />
            <span className="text-[9px] opacity-40">Ingeniería para Artistas © 2026</span>
          </p>
        </div>

        <div className="sud-glass-panel p-10 relative overflow-hidden border-white/[0.07]">
          <div className="absolute top-0 right-0 w-48 h-48 bg-sud-turquoise/[0.05] blur-[80px] rounded-full -mr-24 -mt-24"></div>
          
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8 p-5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] text-center font-black uppercase tracking-widest"
            >
              {error}
            </motion.div>
          )}

          <div className="flex bg-white/[0.02] p-1.5 rounded-[1.5rem] mb-10 border border-white/[0.05]">
            <button 
              onClick={() => { setIsAdmin(false); setOtpSent(false); }}
              className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${!isAdmin ? 'bg-white text-black shadow-[0_0_30px_rgba(255,255,255,0.1)]' : 'text-slate-600 hover:text-slate-400'}`}
            >
              Alumno
            </button>
            <button 
              onClick={() => { setIsAdmin(true); setOtpSent(false); }}
              className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${isAdmin ? 'bg-white text-black shadow-[0_0_30px_rgba(255,255,255,0.1)]' : 'text-slate-600 hover:text-slate-400'}`}
            >
              Admin
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {!isAdmin ? (
              <>
                <div className="space-y-4">
                  <div className="relative group">
                    <div className="absolute left-5 top-1/2 -translate-y-1/2 flex items-center gap-3 border-r border-white/10 pr-4 mr-4 h-6">
                      <Phone className="text-sud-turquoise" size={16} />
                      <span className="text-white/40 font-black text-xs tracking-widest">+56 9</span>
                    </div>
                    <input 
                      type="tel"
                      placeholder="XXXX XXXX"
                      value={phone}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 8);
                        setPhone(val);
                      }}
                      disabled={otpSent || loading}
                      className="sud-input w-full pl-32 tracking-[0.2em]"
                      required
                    />
                  </div>
                  
                  <AnimatePresence>
                    {otpSent && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="space-y-4"
                      >
                        <p className="text-[10px] text-sud-turquoise font-black uppercase tracking-widest text-center">Código enviado vía SMS</p>
                        <input 
                          type="text"
                          maxLength={6}
                          placeholder="000000"
                          value={otp}
                          onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                          className="sud-input w-full text-center text-3xl tracking-[0.6em] font-black h-20"
                          required
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </>
            ) : (
              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="relative group">
                    <input 
                      type="email"
                      placeholder="Email"
                      value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value)}
                      disabled={loading}
                      className="sud-input w-full"
                      required
                    />
                  </div>
                  
                  <div className="relative group">
                    <input 
                      type="password"
                      placeholder="Contraseña"
                      value={adminPass}
                      onChange={(e) => setAdminPass(e.target.value)}
                      disabled={loading}
                      className="sud-input w-full"
                      required
                    />
                  </div>
                </div>
                
                <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest text-center leading-relaxed opacity-60">
                  Credenciales de administrador<br />
                  <span className="text-slate-600">Acceso restringido</span>
                </p>
              </div>
            )}

            <button 
              type="submit"
              disabled={loading}
              className="sud-btn-primary w-full h-16 rounded-[1.5rem]"
            >
              {loading ? (
                <div className="w-6 h-6 border-2 border-black/30 border-t-black rounded-full animate-spin" />
              ) : (
                <>
                  <span className="mt-0.5">{isAdmin ? 'Acceso Administrador' : (otpSent ? 'Validar Código' : 'Solicitar Acceso')}</span>
                  {!loading && <ChevronRight size={20} />}
                </>
              )}
            </button>
          </form>

          {!isAdmin && !otpSent && (
            <p className="text-center mt-8 text-[9px] text-slate-700 font-black uppercase tracking-[0.2em] leading-relaxed opacity-60">
              Uso restringido para comunidad<br />
              <span className="text-slate-500">Sudamerican Voices</span>
            </p>
          )}
        </div>
      </motion.div>
    </div>
  );
}

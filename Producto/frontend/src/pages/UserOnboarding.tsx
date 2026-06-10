import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, User, Baby, ChevronRight, ArrowLeft, Mic2, AlertTriangle } from 'lucide-react';
import { UserProfile, TalentProfile, ProfileType } from '../types';

interface UserOnboardingProps {
  onComplete: (data: Partial<UserProfile>, profileData: Partial<TalentProfile>) => void | Promise<void>; 
  userPhone: string;
  userEmail?: string;
  userName?: string;
  initialBio?: string;
  initialAge?: string | number;
}

const SPECIALTIES = ['Doblaje', 'Locución', 'Podcast', 'Presentación', 'Narración', 'Canto', 'Actuación Vocal', 'Producción Vocal'];

export function UserOnboarding({ onComplete, userPhone, userEmail, userName, initialBio, initialAge }: UserOnboardingProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [saving, setSaving] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Split name if provided
  const splitName = (name?: string) => {
    if (!name) return { first: '', last: '' };
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return { first: parts[0], last: '' };
    const first = parts[0];
    const last = parts.slice(1).join(' ');
    return { first, last };
  };

  const initialName = splitName(userName);

  // Step 1 — Profile type
  const [profileType, setProfileType] = useState<ProfileType | null>(null);

  // Step 2 — Personal data
  const [firstName, setFirstName] = useState(initialName.first);
  const [lastName, setLastName] = useState(initialName.last);
  const [email, setEmail] = useState(userEmail || '');
  const [phone, setPhone] = useState(userPhone || '');
  const [age, setAge] = useState(initialAge?.toString() || '');

  // Guardian fields
  const [childName, setChildName] = useState('');
  const [childAge, setChildAge] = useState('');
  const [relationship, setRelationship] = useState('');

  // Step 3 — Talent
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [bio, setBio] = useState(initialBio || '');
  const [experience, setExperience] = useState('');
  const [availability, setAvailability] = useState('');

  const toggleSpec = (spec: string) => {
    setSpecialties(prev => prev.includes(spec) ? prev.filter(s => s !== spec) : [...prev, spec]);
  };

  const goNext = () => {
    setValidationError(null);
    if (step === 1) {
      if (!profileType) { setValidationError('Selecciona un tipo de perfil.'); return; }
      setStep(2);
    } else if (step === 2) {
      if (!firstName.trim()) { setValidationError('El nombre es requerido.'); return; }
      if (!lastName.trim()) { setValidationError('El apellido es requerido.'); return; }
      if (email && !email.includes('@')) { setValidationError('El correo no es válido.'); return; }
      if (profileType === 'PARENT') {
        if (!childName.trim()) { setValidationError('El nombre del menor es requerido.'); return; }
        if (!childAge || parseInt(childAge) < 1) { setValidationError('Ingresa la edad del menor.'); return; }
      }
      setStep(3);
    }
  };

  const goBack = () => {
    setValidationError(null);
    if (step === 2) setStep(1);
    if (step === 3) setStep(2);
  };

  const handleFinish = async () => {
    setValidationError(null);
    if (specialties.length === 0) { setValidationError('Selecciona al menos una especialidad.'); return; }
    setSaving(true);
    const fullName = `${firstName.trim()} ${lastName.trim()}`;
    const parsedAge = profileType === 'PERSONAL' && age ? parseInt(age) : undefined;
    const userData: Partial<UserProfile> = {
      name: fullName,
      email: email || undefined,
      profileType: profileType!,
      onboarded: true,
      age: parsedAge,
      bio: bio.trim() || undefined,
      phone: phone.replace(/[^0-9]/g, '') || undefined,
    };
    const profileData: Partial<TalentProfile> = {
      type: profileType!,
      specialties,
      bio: bio.trim() || undefined,
      age: parsedAge,
      childName: profileType === 'PARENT' ? childName.trim() : undefined,
      childAge: profileType === 'PARENT' && childAge ? parseInt(childAge) : undefined,
      location: availability.trim() || undefined,
    };
    await onComplete(userData, profileData);
    setSaving(false);
  };

  return (
    <div className="min-h-screen bg-sud-dark flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-sud-turquoise/10 blur-[150px] rounded-full -mr-32 -mt-32" />
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-sud-orange/10 blur-[150px] rounded-full -ml-32 -mb-32" />

      <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-2xl bg-white/[0.03] border border-white/10 rounded-[2.5rem] p-10 relative overflow-hidden shadow-2xl backdrop-blur-3xl">
        <div className="absolute top-0 left-0 w-full h-1 sud-vibrant-gradient opacity-30" />

        {/* Header */}
        <div className="flex justify-between items-center mb-10">
          <div className="flex items-center gap-4">
            <img src="/logos/SUD_ISO_1.png" alt="SUD" className="h-10 w-10 object-contain opacity-60" />
            <div>
              <h2 className="text-2xl font-black mb-1 tracking-tight text-white">
                Completa tu <span className="sud-vibrant-text-gradient uppercase">Perfil</span>
              </h2>
              <p className="text-slate-500 font-medium text-[10px] tracking-widest uppercase">
                Esta información permitirá a Sudamerican Voices identificar tu perfil de talento vocal.
              </p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <span className="text-[10px] font-black text-sud-turquoise uppercase tracking-widest">Paso {step} de 3</span>
            <div className="flex gap-1 mt-1.5">
              {[1, 2, 3].map(s => (
                <div key={s} className={`h-1.5 w-6 rounded-full transition-all duration-500 ${step >= s ? 'bg-sud-turquoise' : 'bg-white/10'}`} />
              ))}
            </div>
          </div>
        </div>

        {/* Validation error */}
        <AnimatePresence>
          {validationError && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center gap-3">
              <AlertTriangle size={14} className="text-red-400 shrink-0" />
              <p className="text-red-400 text-[10px] font-black uppercase tracking-widest">{validationError}</p>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {/* ═══ STEP 1: Profile Type ═══ */}
          {step === 1 && (
            <motion.div key="step1" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="space-y-6">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">¿Cómo gestionarás tu carrera en SudTalent?</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <button onClick={() => setProfileType('PERSONAL')}
                  className={`group relative rounded-[2rem] p-8 text-left transition-all border overflow-hidden ${profileType === 'PERSONAL' ? 'bg-sud-turquoise/10 border-sud-turquoise/40 shadow-lg shadow-sud-turquoise/5' : 'bg-white/[0.02] border-white/[0.05] hover:border-white/15'}`}>
                  <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.05] inline-block mb-5"><User size={28} className="text-sud-turquoise" /></div>
                  <h3 className="text-lg font-black text-white mb-2 uppercase tracking-tight">Perfil Personal</h3>
                  <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest leading-relaxed">Alumno adulto que gestiona su propia carrera y demos.</p>
                </button>
                <button onClick={() => setProfileType('PARENT')}
                  className={`group relative rounded-[2rem] p-8 text-left transition-all border overflow-hidden ${profileType === 'PARENT' ? 'bg-sud-orange/10 border-sud-orange/40 shadow-lg shadow-sud-orange/5' : 'bg-white/[0.02] border-white/[0.05] hover:border-white/15'}`}>
                  <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.05] inline-block mb-5"><Baby size={28} className="text-sud-orange" /></div>
                  <h3 className="text-lg font-black text-white mb-2 uppercase tracking-tight">Apoderado</h3>
                  <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest leading-relaxed">Adulto que representa a un menor de edad.</p>
                </button>
              </div>
              <div className="flex justify-end pt-2">
                <button onClick={goNext} disabled={!profileType} className="sud-btn-primary px-10 py-4 disabled:opacity-30">
                  Continuar <ChevronRight size={16} />
                </button>
              </div>
            </motion.div>
          )}

          {/* ═══ STEP 2: Personal Data ═══ */}
          {step === 2 && (
            <motion.div key="step2" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="space-y-6">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">
                {profileType === 'PERSONAL' ? 'Datos personales del alumno' : 'Datos del apoderado'}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-bold text-slate-500 px-1 tracking-widest">Nombre <span className="text-red-400">*</span></label>
                  <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)} className="sud-input w-full" placeholder="Ej: Roberto" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-bold text-slate-500 px-1 tracking-widest">Apellido <span className="text-red-400">*</span></label>
                  <input type="text" value={lastName} onChange={e => setLastName(e.target.value)} className="sud-input w-full" placeholder="Ej: Pérez" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-bold text-slate-500 px-1 tracking-widest">Teléfono {phone ? <span className="text-slate-700">(validado)</span> : <span className="text-slate-700">(opcional)</span>}</label>
                  {phone && userPhone ? (
                    <input type="text" value={phone} disabled className="sud-input w-full opacity-50 cursor-not-allowed" />
                  ) : (
                    <div className="flex items-center bg-white/5 border border-white/10 rounded-xl overflow-hidden focus-within:border-sud-orange transition-all">
                      <span className="px-3 py-2 text-slate-500 font-mono text-sm border-r border-white/10 select-none">+56 9</span>
                      <input
                        type="tel"
                        value={phone.replace(/[^0-9]/g, '').replace(/^569?/, '')}
                        onChange={e => {
                          const digits = e.target.value.replace(/[^0-9]/g, '').slice(0, 8);
                          setPhone(digits ? `569${digits}` : '');
                        }}
                        placeholder="XXXX XXXX"
                        maxLength={8}
                        className="bg-transparent px-3 py-2 w-full text-white outline-none font-mono tracking-widest"
                      />
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-bold text-slate-500 px-1 tracking-widest">Correo Electrónico <span className="text-slate-700">(opcional)</span></label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="sud-input w-full" placeholder="ejemplo@correo.cl" />
                </div>
                {profileType === 'PERSONAL' && (
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-bold text-slate-500 px-1 tracking-widest">Edad</label>
                    <input type="number" value={age} onChange={e => setAge(e.target.value)} className="sud-input w-full" placeholder="25" min="1" max="99" />
                  </div>
                )}
              </div>

              {/* Guardian/minor fields */}
              {profileType === 'PARENT' && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="pt-4 border-t border-white/5 space-y-5">
                  <p className="text-xs font-bold text-sud-orange uppercase tracking-widest">Datos del Menor Representado</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase font-bold text-slate-500 px-1 tracking-widest">Nombre del Menor <span className="text-red-400">*</span></label>
                      <input type="text" value={childName} onChange={e => setChildName(e.target.value)} className="sud-input w-full" placeholder="Nombre del niño/a" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase font-bold text-slate-500 px-1 tracking-widest">Edad del Menor <span className="text-red-400">*</span></label>
                      <input type="number" value={childAge} onChange={e => setChildAge(e.target.value)} className="sud-input w-full" placeholder="12" min="1" max="17" />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-[10px] uppercase font-bold text-slate-500 px-1 tracking-widest">Relación con el Menor</label>
                      <select value={relationship} onChange={e => setRelationship(e.target.value)} className="sud-input w-full">
                        <option value="">Seleccionar...</option>
                        <option value="padre">Padre</option>
                        <option value="madre">Madre</option>
                        <option value="tutor">Tutor/a Legal</option>
                        <option value="otro">Otro</option>
                      </select>
                    </div>
                  </div>
                </motion.div>
              )}

              <div className="flex justify-between pt-2">
                <button onClick={goBack} className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-white transition-colors py-3 px-4">
                  <ArrowLeft size={14} /> Volver
                </button>
                <button onClick={goNext} className="sud-btn-primary px-10 py-4">
                  Continuar <ChevronRight size={16} />
                </button>
              </div>
            </motion.div>
          )}

          {/* ═══ STEP 3: Talent & Finish ═══ */}
          {step === 3 && (
            <motion.div key="step3" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="space-y-6">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">
                Especialidades {profileType === 'PARENT' ? 'del Menor' : 'y perfil vocal'}
              </p>

              {/* Specialties chips */}
              <div className="space-y-3">
                <label className="text-[10px] uppercase font-bold text-slate-500 px-1 tracking-widest">Especialidades <span className="text-red-400">*</span></label>
                <div className="flex flex-wrap gap-3">
                  {SPECIALTIES.map(s => (
                    <button key={s} onClick={() => toggleSpec(s)}
                      className={`px-5 py-2.5 rounded-2xl border transition-all text-[10px] font-bold uppercase tracking-wider ${
                        specialties.includes(s)
                          ? 'bg-sud-turquoise/20 border-sud-turquoise text-sud-turquoise shadow-lg shadow-sud-turquoise/10'
                          : 'bg-white/5 border-white/10 text-slate-500 hover:border-white/30 hover:text-white'
                      }`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold text-slate-500 px-1 tracking-widest">Biografía / Descripción breve</label>
                <textarea value={bio} onChange={e => setBio(e.target.value)} className="sud-input w-full h-24 py-4 resize-none" placeholder="Breve resumen de tu trayectoria vocal..." />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-bold text-slate-500 px-1 tracking-widest">Experiencia previa <span className="text-slate-700">(opcional)</span></label>
                  <input type="text" value={experience} onChange={e => setExperience(e.target.value)} className="sud-input w-full" placeholder="Ej: 2 años en doblaje" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-bold text-slate-500 px-1 tracking-widest">Disponibilidad <span className="text-slate-700">(opcional)</span></label>
                  <input type="text" value={availability} onChange={e => setAvailability(e.target.value)} className="sud-input w-full" placeholder="Ej: Tardes y fines de semana" />
                </div>
              </div>

              {/* Finish bar */}
              <div className="bg-black/40 p-6 rounded-3xl border border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-5 mt-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-sud-turquoise/10 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="text-sud-turquoise" size={20} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white tracking-widest uppercase">Perfiles Verificados</p>
                    <p className="text-[9px] text-slate-500 uppercase">SudTalent valida cada registro manualmente.</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button onClick={goBack} className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-white transition-colors py-3 px-4">
                    <ArrowLeft size={14} /> Volver
                  </button>
                  <button onClick={handleFinish} disabled={saving} className="sud-btn-primary md:px-10 py-4">
                    {saving ? <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" /> : <>Finalizar Registro</>}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { CheckCircle2 } from 'lucide-react';
import { UserProfile, TalentProfile, ProfileType } from '../types';
import { authService } from '../services/backendService';

interface UserOnboardingProps {
  onComplete: (data: Partial<UserProfile>, profileData: Partial<TalentProfile>) => void | Promise<void>; 
  userPhone: string;
  profileType: ProfileType;
}

export function UserOnboarding({ onComplete, userPhone, profileType }: UserOnboardingProps) {
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
  });
  const [profileData, setProfileData] = useState<any>({
    childName: '',
    childAge: 0,
    specialties: [] as string[],
    bio: ''
  });

  const specs = ['Doblaje', 'Locución Comercial', 'Podcast', 'Presentación', 'Canto', 'Narración'];

  const toggleSpec = (spec: string) => {
    setProfileData((prev: any) => ({
      ...prev,
      specialties: prev.specialties.includes(spec) 
        ? prev.specialties.filter((s: string) => s !== spec) 
        : [...prev.specialties, spec]
    }));
  };

  const handleFinish = async () => {
    setSaving(true);
    try {
      // Send onboarding data to the backend
      const onboardData = {
        name: formData.name,
        email: formData.email,
        profileType: profileType,
        childName: profileData.childName || undefined,
        childAge: profileData.childAge || undefined,
        age: profileData.age || undefined,
        specialties: profileData.specialties.join(','),
        bio: profileData.bio || undefined,
      };

      const response = await authService.onboard(onboardData);
      console.log('Onboarding completado en backend:', response);

      // Then execute the parent callback to update local state
      await onComplete(
        { ...formData, onboarded: true },
        { ...profileData, type: profileType }
      );
    } catch (error: any) {
      console.error('Error al completar onboarding:', error);
      alert(error.message || 'Error al guardar. Intenta nuevamente.');
    } finally {
      setSaving(false);
    }
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
            <h2 className="text-3xl font-black mb-1 tracking-tight">Registro de <span className="sud-vibrant-text-gradient uppercase">{profileType === 'PERSONAL' ? 'Talento' : 'Apoderado'}</span></h2>
            <p className="text-slate-500 font-medium text-xs tracking-widest uppercase">{profileType === 'PERSONAL' ? 'Configura tu perfil profesional' : 'Representa a un talento menor de edad'}</p>
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
                <label className="text-[10px] uppercase font-bold text-slate-500 px-1 tracking-widest">Tu Nombre Completo</label>
                <input 
                  type="text" 
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="sud-input w-full"
                  placeholder="Ej: Roberto Pérez"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold text-slate-500 px-1 tracking-widest">Correo Electrónico</label>
                <input 
                  type="email" 
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                  className="sud-input w-full"
                  placeholder="ejemplo@sud.com"
                />
              </div>
              {profileType === 'PERSONAL' && (
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-bold text-slate-500 px-1 tracking-widest">Edad</label>
                  <input 
                    type="number" 
                    value={profileData.age || ''}
                    onChange={e => setProfileData({...profileData, age: parseInt(e.target.value) || 0})}
                    className="sud-input w-full"
                    placeholder="25"
                  />
                </div>
              )}
            </div>

            {profileType === 'PARENT' && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="pt-6 border-t border-white/5 space-y-6"
              >
                <p className="text-xs font-bold text-sud-orange uppercase tracking-widest">Datos del Menor Representado</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-bold text-slate-500 px-1 tracking-widest">Nombre del Menor</label>
                    <input 
                      type="text" 
                      value={profileData.childName}
                      onChange={e => setProfileData({...profileData, childName: e.target.value})}
                      className="sud-input w-full"
                      placeholder="Nombre del niño/a"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-bold text-slate-500 px-1 tracking-widest">Edad</label>
                    <input 
                      type="number" 
                      value={profileData.childAge || ''}
                      onChange={e => setProfileData({...profileData, childAge: parseInt(e.target.value) || 0})}
                      className="sud-input w-full"
                      placeholder="12"
                    />
                  </div>
                </div>
              </motion.div>
            )}

            <div className="flex justify-end">
              <button 
                onClick={() => setStep(2)}
                disabled={!formData.name || !formData.email || (profileType === 'PARENT' && !profileData.childName)}
                className="sud-btn-secondary px-10 py-4 shadow-xl"
              >
                Continuar
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="space-y-4">
              <label className="text-[10px] uppercase font-bold text-slate-500 px-1 tracking-widest">Especialidades {profileType === 'PARENT' ? 'del Menor' : ''}</label>
              <div className="flex flex-wrap gap-3">
                {specs.map(s => (
                  <button 
                    key={s}
                    onClick={() => toggleSpec(s)}
                    className={`px-6 py-3 rounded-2xl border transition-all text-xs font-bold uppercase tracking-wider ${
                      profileData.specialties.includes(s) 
                        ? 'bg-sud-turquoise/20 border-sud-turquoise text-sud-turquoise shadow-lg shadow-sud-turquoise/10' 
                        : 'bg-white/5 border-white/10 text-slate-500 hover:border-white/30 hover:text-white'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-bold text-slate-500 px-1 tracking-widest">Biografía / Experiencia</label>
              <textarea 
                value={profileData.bio}
                onChange={e => setProfileData({...profileData, bio: e.target.value})}
                className="sud-input w-full h-32 py-4 resize-none"
                placeholder="Breve resumen de trayectoria..."
              />
            </div>

            <div className="bg-black/40 p-6 rounded-3xl border border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-sud-turquoise/10 flex items-center justify-center">
                  <CheckCircle2 className="text-sud-turquoise" size={20} />
                </div>
                <div>
                   <p className="text-xs font-bold text-white tracking-widest uppercase">Perfiles Verificados</p>
                   <p className="text-[10px] text-slate-500 uppercase">SudTalent valida cada registro manualmente.</p>
                </div>
              </div>
              <button 
                onClick={handleFinish}
                disabled={saving}
                className="sud-btn-primary md:w-auto md:px-12"
              >
                {saving ? 'Guardando...' : 'Finalizar Registro'}
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}

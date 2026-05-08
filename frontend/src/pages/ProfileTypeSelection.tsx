import React from 'react';
import { motion } from 'motion/react';
import { User, Baby, ChevronRight } from 'lucide-react';
import { ProfileType } from '../types';

interface ProfileTypeSelectionProps {
  onSelect: (type: ProfileType) => void;
}

export function ProfileTypeSelection({ onSelect }: ProfileTypeSelectionProps) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-sud-dark relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-sud-turquoise/5 blur-[150px] rounded-full" />
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-sud-orange/5 blur-[150px] rounded-full" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-4xl"
      >
        <div className="text-center mb-12">
          <h2 className="text-4xl font-black text-white uppercase tracking-tighter mb-4">Selecciona tu <span className="sud-vibrant-text-gradient">Perfil</span></h2>
          <p className="text-slate-400 font-medium text-xs uppercase tracking-widest">¿Cómo gestionarás tu carrera en SudTalent?</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <ProfileTypeCard 
            icon={<User size={40} className="text-sud-turquoise" />}
            title="Perfil Personal"
            description="Para alumnos adultos que gestionan su propia carrera y demos de voz."
            onClick={() => onSelect('PERSONAL')}
            color="sud-turquoise"
          />
          <ProfileTypeCard 
            icon={<Baby size={40} className="text-sud-orange" />}
            title="Perfil Apoderado"
            description="Para adultos que representan a un menor de edad. Gestiona el talento de tu hijo/tutorado."
            onClick={() => onSelect('PARENT')}
            color="sud-orange"
          />
        </div>
      </motion.div>
    </div>
  );
}

function ProfileTypeCard({ icon, title, description, onClick, color }: {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
  color: string;
}) {
  return (
    <button 
      onClick={onClick}
      className="group relative bg-white/[0.015] border border-white/[0.05] rounded-[3.5rem] p-12 text-left transition-all duration-500 hover:bg-white/[0.04] hover:border-white/15 hover:scale-[1.03] active:scale-[0.98] overflow-hidden shadow-2xl"
    >
      <div className={`absolute top-0 right-0 w-48 h-48 bg-${color}/10 blur-[100px] rounded-full -mr-24 -mt-24 group-hover:bg-${color}/20 transition-all duration-700`} />
      <div className="mb-10 relative z-10 p-5 rounded-3xl bg-white/[0.03] border border-white/[0.05] inline-block shadow-xl">
        {icon}
      </div>
      <h3 className="text-3xl font-black text-white mb-5 uppercase tracking-tighter leading-none">{title}</h3>
      <p className="text-slate-500 text-[11px] font-black uppercase tracking-widest leading-relaxed mb-10 opacity-60 group-hover:opacity-100 transition-opacity">{description}</p>
      <div className={`flex items-center gap-3 text-${color} text-[10px] font-black uppercase tracking-[0.2em] relative z-10`}>
        Seleccionar Perfil <div className={`p-2 rounded-full bg-${color}/10 group-hover:translate-x-2 transition-all`}><ChevronRight size={16} /></div>
      </div>
    </button>
  );
}

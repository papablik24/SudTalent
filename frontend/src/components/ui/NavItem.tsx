import React from 'react';
import { motion } from 'motion/react';

export function NavItem({ icon, label, active = false, onClick }: { 
  icon: React.ReactNode; 
  label: string; 
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button 
      onClick={onClick}
      className={`flex items-center space-x-4 w-full px-5 py-4 rounded-[1.2rem] transition-all duration-300 relative group font-black uppercase tracking-[0.1em] text-[10px] ${
      active 
        ? 'bg-white/5 text-white shadow-xl shadow-black' 
        : 'text-slate-600 hover:text-slate-200 hover:bg-white/[0.02]'
    }`}>
      {active && (
        <motion.div 
          layoutId="activeNav"
          className="absolute left-2 w-1.5 h-6 rounded-full bg-sud-turquoise shadow-[0_0_15px_var(--color-sud-turquoise)]"
        />
      )}
      <span className={`transition-colors duration-300 ${active ? 'text-sud-turquoise' : 'group-hover:text-sud-turquoise'}`}>{icon}</span>
      <span>{label}</span>
    </button>
  );
}

import React from 'react';

export function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  const getGradient = () => {
    switch(color) {
      case 'sud-turquoise': return 'from-sud-turquoise/20 to-sud-turquoise/5';
      case 'sud-orange': return 'from-sud-orange/20 to-sud-orange/5';
      case 'sud-yellow': return 'from-sud-yellow/20 to-sud-yellow/5';
      default: return 'from-white/10 to-white/5';
    }
  };

  const getBorder = () => {
    switch(color) {
      case 'sud-turquoise': return 'border-sud-turquoise/20';
      case 'sud-orange': return 'border-sud-orange/20';
      case 'sud-yellow': return 'border-sud-yellow/20';
      default: return 'border-white/10';
    }
  };

  return (
    <div className={`sud-stat-card bg-gradient-to-br ${getGradient()} ${getBorder()} group relative overflow-hidden`}>
      <div className={`absolute top-0 right-0 w-32 h-32 blur-3xl opacity-30 -mr-16 -mt-16 bg-${color}`} />
      <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mb-2">{label}</p>
      <p className="text-5xl font-black tracking-tighter text-white group-hover:scale-105 transition-transform duration-500">{value}</p>
    </div>
  );
}

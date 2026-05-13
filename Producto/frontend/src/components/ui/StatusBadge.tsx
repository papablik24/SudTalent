import React from 'react';

type BadgeVariant = 
  | 'ACTIVA' | 'BORRADOR' | 'CERRADA' | 'ARCHIVADA'
  | 'PENDIENTE' | 'EN_REVISION' | 'ACEPTADA' | 'RECHAZADA'
  | 'APPROVED' | 'INACTIVE' | 'PENDING';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

const BADGE_CONFIG: Record<string, { label: string; bg: string; text: string; border: string }> = {
  // Convocatoria states
  ACTIVA:     { label: 'Activa',      bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
  BORRADOR:   { label: 'Borrador',    bg: 'bg-slate-500/10',   text: 'text-slate-400',   border: 'border-slate-500/20' },
  CERRADA:    { label: 'Cerrada',     bg: 'bg-red-500/10',     text: 'text-red-400',     border: 'border-red-500/20' },
  ARCHIVADA:  { label: 'Archivada',   bg: 'bg-slate-700/10',   text: 'text-slate-500',   border: 'border-slate-700/20' },
  // Postulacion states
  PENDIENTE:    { label: 'Pendiente',    bg: 'bg-amber-500/10',    text: 'text-amber-400',    border: 'border-amber-500/20' },
  EN_REVISION:  { label: 'En Revisión',  bg: 'bg-sky-500/10',      text: 'text-sky-400',      border: 'border-sky-500/20' },
  ACEPTADA:     { label: 'Aceptada',     bg: 'bg-emerald-500/10',  text: 'text-emerald-400',  border: 'border-emerald-500/20' },
  RECHAZADA:    { label: 'Rechazada',    bg: 'bg-red-500/10',      text: 'text-red-400',      border: 'border-red-500/20' },
  // Profile states
  APPROVED:  { label: 'Aprobado',  bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
  INACTIVE:  { label: 'Inactivo',  bg: 'bg-slate-500/10',   text: 'text-slate-400',   border: 'border-slate-500/20' },
  PENDING:   { label: 'Pendiente', bg: 'bg-amber-500/10',   text: 'text-amber-400',   border: 'border-amber-500/20' },
};

export function StatusBadge({ status, size = 'sm' }: StatusBadgeProps) {
  const config = BADGE_CONFIG[status] || {
    label: status,
    bg: 'bg-white/5',
    text: 'text-slate-400',
    border: 'border-white/10',
  };

  const sizeClasses = size === 'md'
    ? 'text-[10px] px-3 py-1.5'
    : 'text-[8px] px-2 py-1';

  return (
    <span className={`inline-flex items-center gap-1.5 font-black uppercase tracking-widest rounded-lg border ${config.bg} ${config.text} ${config.border} ${sizeClasses}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.text.replace('text-', 'bg-')}`} />
      {config.label}
    </span>
  );
}

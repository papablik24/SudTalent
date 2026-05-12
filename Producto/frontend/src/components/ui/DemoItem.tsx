import React from 'react';
import { Play, AudioLines, Video, Film, Trash2 } from 'lucide-react';
import { VoiceDemo } from '../../types';
/** Color map for visual genre badges */
const GENRE_COLORS: Record<string, string> = {
  Acción:    'bg-red-500/15 text-red-400 border-red-500/20',
  Drama:     'bg-purple-500/15 text-purple-400 border-purple-500/20',
  Romántico: 'bg-pink-500/15 text-pink-400 border-pink-500/20',
  Musical:   'bg-yellow-500/15 text-yellow-400 border-yellow-500/20',
  Trágico:   'bg-slate-500/15 text-slate-400 border-slate-500/20',
  Cómico:    'bg-green-500/15 text-green-400 border-green-500/20',
  Suspenso:  'bg-orange-500/15 text-orange-400 border-orange-500/20',
  Fantasía:  'bg-indigo-500/15 text-indigo-400 border-indigo-500/20',
  Terror:    'bg-red-900/30 text-red-300 border-red-900/30',
  Infantil:  'bg-cyan-500/15 text-cyan-400 border-cyan-500/20',
  Otro:      'bg-white/5 text-slate-400 border-white/10',
};

interface DemoItemProps {
  demo: VoiceDemo;
  onDelete?: (id: string) => void;
}

export const DemoItem: React.FC<DemoItemProps> = ({ demo, onDelete }) => {
  const isVideo = demo.mediaType === 'VIDEO';
  const genreColor = demo.visualGenre ? (GENRE_COLORS[demo.visualGenre] ?? GENRE_COLORS['Otro']) : null;

  const formatDate = (val: any): string => {
    if (!val) return 'Procesando...';
    if (val?.toDate) return val.toDate().toLocaleDateString('es-CL');
    const d = new Date(val);
    return isNaN(d.getTime()) ? 'Procesando...' : d.toLocaleDateString('es-CL');
  };

  return (
    <div className="bg-white/5 hover:bg-white/[0.08] border border-white/5 rounded-[2rem] p-6 transition-all group flex items-center gap-6 cursor-pointer shadow-xl relative overflow-hidden">
      {/* Left accent bar — orange for audio, turquoise for video */}
      <div className={`absolute top-0 left-0 w-1 h-full transition-all ${isVideo ? 'bg-white/5 group-hover:bg-sud-turquoise' : 'bg-white/5 group-hover:bg-sud-orange'}`} />

      {/* Media icon */}
      <div className={`w-16 h-16 rounded-3xl bg-black border border-white/10 flex items-center justify-center transition-all shadow-lg relative overflow-hidden shrink-0 ${isVideo ? 'group-hover:bg-sud-turquoise/10' : 'group-hover:bg-sud-orange/10'}`}>
        {isVideo
          ? <Film className="text-slate-700 group-hover:text-sud-turquoise relative z-10 transition-colors" size={28} />
          : <AudioLines className="text-slate-700 group-hover:text-sud-orange relative z-10 transition-colors" size={28} />
        }
      </div>

      {/* Content */}
      <div className="flex-1 space-y-2 min-w-0">
        <div className="flex items-center justify-between gap-4">
          <h4 className="font-bold text-lg text-slate-200 group-hover:text-white transition-colors uppercase tracking-tight truncate">
            {demo.title}
          </h4>
          <div className="flex items-center gap-2 shrink-0">
            {demo.duration && (
              <span className="text-[10px] text-slate-600 font-black uppercase tracking-widest bg-black/40 px-2 py-1 rounded-md">
                {demo.duration}
              </span>
            )}
            <button className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-sud-orange hover:text-white transition-all">
              <Play size={14} fill="currentColor" />
            </button>
            {onDelete && (
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(demo.id); }}
                className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-red-500/20 hover:text-red-400 transition-all"
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Badges row */}
        <div className="flex flex-wrap gap-2 items-center">
          {/* Media type badge */}
          <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg border ${
            isVideo
              ? 'bg-sud-turquoise/10 text-sud-turquoise border-sud-turquoise/20'
              : 'bg-sud-orange/10 text-sud-orange border-sud-orange/20'
          }`}>
            {isVideo ? '🎬 Video' : '🎙 Audio'}
          </span>

          {/* Category badge */}
          <span className="text-[9px] font-black uppercase tracking-widest bg-sud-turquoise/10 px-2 py-1.5 rounded-lg text-sud-turquoise border border-sud-turquoise/10">
            {demo.category}
          </span>

          {/* File format badge */}
          {demo.fileFormat && (
            <span className="text-[9px] font-black uppercase tracking-widest bg-white/5 px-2 py-1 rounded-lg text-slate-500 border border-white/10">
              {demo.fileFormat}
            </span>
          )}

          {/* Visual genre badge */}
          {demo.visualGenre && genreColor && (
            <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg border ${genreColor}`}>
              {demo.visualGenre}
            </span>
          )}

          <div className="flex-1" />
          <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest opacity-60">
            {formatDate(demo.createdAt)}
          </span>
        </div>

        {/* Optional description */}
        {demo.description && (
          <p className="text-[10px] text-slate-500 italic truncate pt-1">{demo.description}</p>
        )}
      </div>
    </div>
  );
};

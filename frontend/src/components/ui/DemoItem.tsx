import React from 'react';
import { Play, AudioLines } from 'lucide-react';
import { VoiceDemo } from '../../types';

export const DemoItem: React.FC<{ demo: VoiceDemo }> = ({ demo }) => {
  return (
    <div className="bg-white/5 hover:bg-white/[0.08] border border-white/5 rounded-[2rem] p-6 transition-all group flex items-center gap-6 cursor-pointer shadow-xl relative overflow-hidden">
      <div className="absolute top-0 left-0 w-1 h-full bg-white/5 group-hover:bg-sud-orange transition-all" />
      <div className="w-16 h-16 rounded-3xl bg-black border border-white/10 flex items-center justify-center group-hover:sud-vibrant-gradient transition-all shadow-lg relative overflow-hidden">
        <AudioLines className="text-slate-700 group-hover:text-white relative z-10" size={28} />
        <div className="absolute inset-0 bg-sud-orange/10 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
      <div className="flex-1 space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="font-bold text-lg text-slate-200 group-hover:text-white transition-colors uppercase tracking-tight">{demo.title}</h4>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-600 font-black uppercase tracking-widest bg-black/40 px-2 py-1 rounded-md">{demo.duration}</span>
            <button className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-sud-orange hover:text-white transition-all">
              <Play size={14} fill="currentColor" />
            </button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
            <span className="text-[9px] font-black uppercase tracking-widest bg-sud-turquoise/10 px-2 py-1.5 rounded-lg text-sud-turquoise border border-sud-turquoise/10">
              {demo.category}
            </span>
            <div className="flex-1" />
            <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest opacity-60">
              {demo.createdAt?.toDate?.() ? demo.createdAt.toDate().toLocaleDateString() : 'Procesando...'}
            </span>
        </div>
      </div>
    </div>
  );
};

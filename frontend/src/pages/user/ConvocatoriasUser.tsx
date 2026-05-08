import React, { useState, useEffect } from 'react';
import { Briefcase, Calendar, Sparkles, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';
import { Convocation, Application, UserProfile } from '../../types';

export function ConvocatoriasUser({ user }: { user: UserProfile }) {
  const [convocatorias, setConvocatorias] = useState<Convocation[]>([]);
  const [myApplications, setMyApplications] = useState<Record<string, Application>>({});
  const [filter, setFilter] = useState<string>('TODAS');
  const [applyingId, setApplyingId] = useState<string | null>(null);

  useEffect(() => {
    const load = () => {
      const savedConvs = localStorage.getItem('sud_convocatorias');
      if (savedConvs) {
        const list: Convocation[] = JSON.parse(savedConvs);
        setConvocatorias(list.filter(c => c.status === 'ACTIVA'));
      }

      const savedApps = localStorage.getItem('sud_applications');
      if (savedApps) {
        const apps: Application[] = JSON.parse(savedApps);
        const userApps: Record<string, Application> = {};
        apps.filter(a => a.userId === user.uid).forEach(a => {
          userApps[a.convocationId] = a;
        });
        setMyApplications(userApps);
      }
    };
    load();
  }, [user.uid]);

  const handleApply = async (convocation: Convocation) => {
    setApplyingId(convocation.id);
    
    // Simulate delay
    await new Promise(r => setTimeout(r, 600));

    const newApp: Application = {
      id: `app_${Date.now()}`,
      userId: user.uid,
      convocationId: convocation.id,
      status: 'PENDIENTE',
      appliedAt: new Date().toISOString(),
      userName: user.name,
      userPhone: user.phone
    };

    const savedApps = localStorage.getItem('sud_applications');
    const apps = savedApps ? JSON.parse(savedApps) : [];
    const updated = [newApp, ...apps];
    localStorage.setItem('sud_applications', JSON.stringify(updated));
    setMyApplications({...myApplications, [convocation.id]: newApp});
    setApplyingId(null);
  };

  const filteredConvs = filter === 'TODAS' 
    ? convocatorias 
    : convocatorias.filter(c => c.category === filter);

  return (
    <div className="space-y-10">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black tracking-tighter text-white uppercase italic">Oportunidades <span className="sud-vibrant-text-gradient tracking-tight">Laborales</span></h2>
          <p className="text-slate-500 mt-1 font-bold text-[10px] tracking-[0.3em] uppercase">Castings exclusivos para la comunidad SUD</p>
        </div>
        
        <div className="flex bg-white/[0.02] p-1.5 rounded-2xl border border-white/5 overflow-x-auto">
          {['TODAS', 'Doblaje', 'Locución', 'Podcast', 'Voice Acting'].map(f => (
            <button 
              key={f}
              onClick={() => setFilter(f)}
              className={`px-6 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${filter === f ? 'bg-white text-black shadow-lg' : 'text-slate-600 hover:text-slate-300'}`}
            >
              {f}
            </button>
          ))}
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {filteredConvs.map(conv => (
          <motion.div 
            layout
            key={conv.id}
            className="sud-glass-panel p-10 group relative flex flex-col justify-between space-y-8 border-white/[0.05] hover:border-white/20 transition-all duration-500 overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-sud-turquoise/5 blur-3xl rounded-full" />
            
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="text-[8px] font-black uppercase tracking-widest px-2.5 py-1.5 rounded-lg bg-sud-gradient-text opacity-10 bg-sud-turquoise/10 text-sud-turquoise border border-sud-turquoise/20">
                  {conv.category}
                </span>
                {myApplications[conv.id] && (
                  <span className="text-[8px] font-black uppercase tracking-widest px-2.5 py-1.5 rounded-lg bg-green-500/10 text-green-400 border border-green-500/20 flex items-center gap-1">
                    <CheckCircle2 size={10} /> Postulado
                  </span>
                )}
              </div>
              
              <h3 className="text-3xl font-black text-white uppercase tracking-tight leading-tight group-hover:sud-vibrant-text-gradient transition-all">{conv.title}</h3>
              <p className="text-xs text-slate-500 leading-relaxed font-medium line-clamp-3">{conv.description}</p>
            </div>

            <div className="space-y-6">
              <div className="flex items-center justify-between border-y border-white/5 py-4">
                <div className="flex items-center gap-2 text-[10px] text-slate-600 font-bold uppercase tracking-widest">
                  <Calendar size={14} className="text-sud-orange" />
                  <span>Cierra: {new Date(conv.deadline).toLocaleDateString()}</span>
                </div>
                {myApplications[conv.id] && (
                  <div className="text-[9px] font-black uppercase tracking-widest text-sud-turquoise px-3 py-1 rounded-full bg-sud-turquoise/5">
                    Estado: {myApplications[conv.id].status.replace('_', ' ')}
                  </div>
                )}
              </div>

              <button 
                onClick={() => handleApply(conv)}
                disabled={!!myApplications[conv.id] || applyingId === conv.id}
                className={`w-full h-16 rounded-[1.5rem] flex items-center justify-center gap-3 text-xs font-black uppercase tracking-widest transition-all ${
                  myApplications[conv.id] 
                    ? 'bg-white/5 border border-white/10 text-slate-500 cursor-default' 
                    : 'sud-btn-primary hover:scale-[1.02] shadow-2xl shadow-sud-turquoise/10'
                }`}
              >
                {applyingId === conv.id ? (
                  <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                ) : myApplications[conv.id] ? (
                  <>Revisando Perfil</>
                ) : (
                  <>Postularme Ahora <Sparkles size={16}/></>
                )}
              </button>
            </div>
          </motion.div>
        ))}

        {filteredConvs.length === 0 && (
          <div className="col-span-full py-24 text-center border-2 border-dashed border-white/5 rounded-[3.5rem] bg-white/[0.01]">
             <Briefcase size={48} className="mx-auto text-white/5 mb-6" />
             <p className="text-slate-500 font-black uppercase tracking-[0.3em] text-[10px]">No hay convocatorias disponibles en este momento</p>
          </div>
        )}
      </div>
    </div>
  );
}

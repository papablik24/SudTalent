import React, { useState, useEffect } from 'react';
import { Plus, Upload, AudioLines } from 'lucide-react';
import { UserProfile, VoiceDemo, DemoCategory } from '../../types';
import { DemoItem } from '../../components/ui/DemoItem';

export function UserDemosView({ user }: { user: UserProfile }) {
  const [demos, setDemos] = useState<VoiceDemo[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [newDemo, setNewDemo] = useState({ title: '', category: 'Doblaje' as DemoCategory });

  useEffect(() => {
    const load = () => {
      const localDemos = localStorage.getItem(`demos_${user.uid}`);
      if (localDemos) setDemos(JSON.parse(localDemos));
    };
    load();
    window.addEventListener('storage', load);
    return () => window.removeEventListener('storage', load);
  }, [user.uid]);

  const handleUploadDemo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDemo.title) return;
    
    setIsUploading(true);
    const simulatedUrl = `https://example.com/demos/${user.uid}/${Date.now()}.mp3`;
    const newDemoData: VoiceDemo = {
      id: `demo_${Date.now()}`,
      userId: user.uid,
      title: newDemo.title,
      category: newDemo.category as any,
      fileUrl: simulatedUrl,
      duration: '1:30',
      createdAt: new Date().toISOString()
    };

    const updated = [newDemoData, ...demos];
    setDemos(updated);
    localStorage.setItem(`demos_${user.uid}`, JSON.stringify(updated));
    
    setNewDemo({ title: '', category: 'Doblaje' });
    setIsUploading(false);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-8 px-4">
        <div>
          <h2 className="text-3xl font-black tracking-tighter text-white">Mis <span className="sud-vibrant-text-gradient uppercase tracking-widest">Demos</span></h2>
          <p className="text-slate-400 mt-2 font-medium text-xs tracking-widest uppercase">Gestiona tus muestras de voz profesionales</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 space-y-6">
          <section className="bg-white/[0.03] border border-white/10 rounded-[2.5rem] p-8 shadow-2xl space-y-6 sticky top-8">
            <h4 className="text-lg font-black uppercase tracking-tight text-white flex items-center gap-2">
              <Plus className="text-sud-turquoise" size={20} />
              Añadir Nueva Demo
            </h4>
            <div className="p-4 bg-sud-turquoise/5 border border-sud-turquoise/10 rounded-2xl flex items-center gap-4">
              <Upload className="text-sud-turquoise" size={24} />
              <p className="text-[10px] font-bold text-sud-turquoise uppercase tracking-widest">Carga archivos MP3 o WAV</p>
            </div>
            <form onSubmit={handleUploadDemo} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold text-slate-500 px-1 tracking-widest">Título de la Demo</label>
                <input 
                  type="text"
                  value={newDemo.title}
                  onChange={e => setNewDemo({...newDemo, title: e.target.value})}
                  className="sud-input w-full"
                  placeholder="Ej: Personaje Anime - Combat"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold text-slate-500 px-1 tracking-widest">Categoría</label>
                <select 
                  value={newDemo.category}
                  onChange={e => setNewDemo({...newDemo, category: e.target.value as DemoCategory})}
                  className="sud-input w-full appearance-none pr-10"
                >
                  <option value="Doblaje">Doblaje</option>
                  <option value="Locución">Locución</option>
                  <option value="Podcast">Podcast</option>
                  <option value="Presentación">Presentación</option>
                </select>
              </div>
              <button 
                type="submit" 
                disabled={isUploading || !newDemo.title}
                className="w-full sud-btn-primary py-5 text-sm shadow-xl shadow-sud-orange/10 transition-all hover:scale-[1.02]"
              >
                {isUploading ? (
                  <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin mx-auto" />
                ) : (
                  'Confirmar Carga de Audio'
                )}
              </button>
            </form>
          </section>
        </div>

        <div className="lg:col-span-8 space-y-6">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-xl font-black uppercase tracking-tighter text-white">Lista de Demos <span className="text-slate-700 ml-2 font-mono text-sm">({demos.length})</span></h3>
          </div>
          {demos.length === 0 ? (
            <div className="p-16 text-center bg-white/[0.02] rounded-[3rem] border border-dashed border-white/10">
              <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-6">
                <AudioLines className="text-white/10" size={40} />
              </div>
              <p className="text-slate-500 text-sm font-bold uppercase tracking-widest">Aún no has cargado demos</p>
              <p className="text-[10px] text-slate-600 uppercase tracking-widest mt-2">Usa el panel lateral para subir tu primera muestra de voz</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {demos.map(demo => (
                <DemoItem key={demo.id} demo={demo} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

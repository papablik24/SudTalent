import React, { useState, useEffect } from 'react';
import { Plus, Briefcase, Calendar, Trash2, Edit2, Users, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Convocation, Application } from '../../types';

export function ConvocatoriasAdmin() {
  const [convocatorias, setConvocatorias] = useState<Convocation[]>([]);
  const [applications, setApplications] = useState<Record<string, Application[]>>({});
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewingApplicantsId, setViewingApplicantsId] = useState<string | null>(null);

  const [formData, setFormData] = useState<Partial<Convocation>>({
    title: '',
    description: '',
    category: 'Doblaje',
    status: 'BORRADOR',
    requirements: []
  });

  useEffect(() => {
    const loadData = () => {
      const savedConvs = localStorage.getItem('sud_convocatorias');
      if (savedConvs) setConvocatorias(JSON.parse(savedConvs));
      
      const savedApps = localStorage.getItem('sud_applications');
      if (savedApps) {
        const apps: Application[] = JSON.parse(savedApps);
        const appsMap: Record<string, Application[]> = {};
        apps.forEach(app => {
          if (!appsMap[app.convocationId]) appsMap[app.convocationId] = [];
          appsMap[app.convocationId].push(app);
        });
        setApplications(appsMap);
      }
      setLoading(false);
    };
    loadData();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const newConv = {
      ...formData,
      id: editingId || `conv_${Date.now()}`,
      createdAt: new Date().toISOString(),
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      createdBy: 'admin'
    } as Convocation;

    let updated;
    if (editingId) {
      updated = convocatorias.map(c => c.id === editingId ? newConv : c);
    } else {
      updated = [newConv, ...convocatorias];
    }

    setConvocatorias(updated);
    localStorage.setItem('sud_convocatorias', JSON.stringify(updated));
    setIsModalOpen(false);
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
    if (confirm('¿Estás seguro?')) {
      const updated = convocatorias.filter(c => c.id !== id);
      setConvocatorias(updated);
      localStorage.setItem('sud_convocatorias', JSON.stringify(updated));
    }
  };

  const handleStatusChange = (appId: string, status: Application['status']) => {
    const savedApps = localStorage.getItem('sud_applications');
    if (!savedApps) return;
    const apps: Application[] = JSON.parse(savedApps);
    const updated = apps.map(a => a.id === appId ? { ...a, status } : a);
    localStorage.setItem('sud_applications', JSON.stringify(updated));
    
    // Update local state
    const appsMap: Record<string, Application[]> = {};
    updated.forEach(app => {
      if (!appsMap[app.convocationId]) appsMap[app.convocationId] = [];
      appsMap[app.convocationId].push(app);
    });
    setApplications(appsMap);
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black tracking-tighter text-white">Gestión de <span className="sud-vibrant-text-gradient uppercase tracking-widest">Convocatorias</span></h2>
          <p className="text-slate-400 mt-1 font-medium text-[10px] tracking-widest uppercase">Publicación de castings y revisión de postulantes</p>
        </div>
        <button 
          onClick={() => {
            setEditingId(null);
            setFormData({ title: '', description: '', category: 'Doblaje', status: 'BORRADOR', requirements: [] });
            setIsModalOpen(true);
          }}
          className="sud-btn-primary px-8 py-4"
        >
          <Plus size={18} />
          <span>Nueva Convocatoria</span>
        </button>
      </header>

      <div className="grid grid-cols-1 gap-6">
        {convocatorias.map(conv => (
          <div key={conv.id} className="sud-glass-panel p-8 group relative overflow-hidden flex flex-col md:flex-row gap-8 items-start md:items-center">
            <div className={`absolute top-0 left-0 w-1 h-full ${conv.status === 'ACTIVA' ? 'bg-sud-turquoise' : 'bg-slate-800'}`} />
            
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-3">
                <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-md ${conv.status === 'ACTIVA' ? 'bg-sud-turquoise/10 text-sud-turquoise' : 'bg-white/5 text-slate-500'}`}>
                  {conv.status}
                </span>
                <span className="text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-md bg-sud-orange/10 text-sud-orange border border-sud-orange/20">
                  {conv.category}
                </span>
              </div>
              <h3 className="text-2xl font-black text-white uppercase tracking-tight group-hover:sud-vibrant-text-gradient transition-all">{conv.title}</h3>
              <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{conv.description}</p>
              
              <div className="flex items-center gap-6 pt-2">
                <div className="flex items-center gap-2 text-[10px] text-slate-600 font-bold uppercase tracking-widest">
                  <Calendar size={14} />
                  <span>Cierre: {new Date(conv.deadline).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-sud-turquoise font-bold uppercase tracking-widest">
                  <Users size={14} />
                  <span>{applications[conv.id]?.length || 0} Postulantes</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              <button 
                onClick={() => setViewingApplicantsId(conv.id)}
                className="flex-1 md:flex-none px-6 py-3 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all text-white"
              >
                Ver Postulantes
              </button>
              <button 
                onClick={() => {
                   setEditingId(conv.id);
                   setFormData(conv);
                   setIsModalOpen(true);
                }}
                className="p-3 bg-white/5 border border-white/10 rounded-2xl text-slate-400 hover:text-sud-turquoise transition-all"
              >
                <Edit2 size={18} />
              </button>
              <button 
                onClick={() => handleDelete(conv.id)}
                className="p-3 bg-white/5 border border-white/10 rounded-2xl text-slate-400 hover:text-red-400 transition-all"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        ))}

        {convocatorias.length === 0 && !loading && (
          <div className="p-20 text-center border-2 border-dashed border-white/5 rounded-[3rem]">
            <Briefcase size={40} className="mx-auto text-slate-800 mb-6" />
            <p className="text-slate-500 font-black uppercase tracking-widest text-[10px]">No hay convocatorias creadas</p>
          </div>
        )}
      </div>

      {/* Modal Nueva/Editar */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 backdrop-blur-md bg-black/60">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="sud-glass-panel w-full max-w-2xl p-10 relative overflow-hidden"
            >
              <button onClick={() => setIsModalOpen(false)} className="absolute top-6 right-6 text-slate-500 hover:text-white"><X /></button>
              <h3 className="text-2xl font-black text-white mb-8 uppercase tracking-tight">{editingId ? 'Editar' : 'Nueva'} Convocatoria</h3>
              
              <form onSubmit={handleSave} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-bold text-slate-500 px-1 tracking-widest">Título del Casting</label>
                  <input 
                    type="text" 
                    value={formData.title}
                    onChange={e => setFormData({...formData, title: e.target.value})}
                    className="sud-input w-full"
                    placeholder="Ej: Casting Doblaje Personaje Secundario"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-bold text-slate-500 px-1 tracking-widest">Categoría</label>
                    <select 
                      value={formData.category}
                      onChange={e => setFormData({...formData, category: e.target.value as any})}
                      className="sud-input w-full"
                    >
                      <option value="Doblaje">Doblaje</option>
                      <option value="Locución">Locución</option>
                      <option value="Podcast">Podcast</option>
                      <option value="Voice Acting">Voice Acting</option>
                      <option value="Producción">Producción</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-bold text-slate-500 px-1 tracking-widest">Estado</label>
                    <select 
                      value={formData.status}
                      onChange={e => setFormData({...formData, status: e.target.value as any})}
                      className="sud-input w-full"
                    >
                      <option value="BORRADOR">Borrador</option>
                      <option value="ACTIVA">Activa</option>
                      <option value="CERRADA">Cerrada</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-bold text-slate-500 px-1 tracking-widest">Descripción</label>
                  <textarea 
                    value={formData.description}
                    onChange={e => setFormData({...formData, description: e.target.value})}
                    className="sud-input w-full h-32 py-4 resize-none"
                    placeholder="Detalles del casting, tono de voz requerido, etc..."
                    required
                  />
                </div>

                <button type="submit" className="w-full sud-btn-primary py-5 uppercase tracking-widest font-black text-sm">
                  {editingId ? 'Guardar Cambios' : 'Publicar Convocatoria'}
                </button>
              </form>
            </motion.div>
          </div>
        )}

        {/* Modal Postulantes */}
        {viewingApplicantsId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 backdrop-blur-md bg-black/60">
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              className="sud-glass-panel w-full max-w-4xl max-h-[80vh] flex flex-col p-0 overflow-hidden"
            >
              <div className="p-8 border-b border-white/10 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-black text-white uppercase tracking-tight">Revisión de Postulantes</h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{convocatorias.find(c => c.id === viewingApplicantsId)?.title}</p>
                </div>
                <button onClick={() => setViewingApplicantsId(null)} className="p-2 text-slate-500 hover:text-white bg-white/5 rounded-full transition-all"><X size={20}/></button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-4">
                {applications[viewingApplicantsId]?.map(app => (
                  <div key={app.id} className="p-6 bg-white/[0.02] border border-white/5 rounded-3xl flex items-center justify-between group hover:bg-white/[0.04] transition-all">
                    <div className="flex items-center gap-6">
                      <div className="w-12 h-12 rounded-2xl bg-sud-gradient p-[1px]">
                        <div className="w-full h-full rounded-[0.9rem] bg-black flex items-center justify-center text-sud-turquoise font-black">
                          {app.userName?.[0] || 'U'}
                        </div>
                      </div>
                      <div>
                        <p className="text-lg font-black text-white uppercase tracking-tight group-hover:text-sud-turquoise transition-colors">{app.userName}</p>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{app.userPhone}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <select 
                        value={app.status}
                        onChange={(e) => handleStatusChange(app.id, e.target.value as any)}
                        className={`text-[9px] font-black uppercase tracking-widest px-3 py-2 rounded-xl bg-black border border-white/10 outline-none ${
                          app.status === 'SELECCIONADO' ? 'text-green-400 border-green-400/20' : 
                          app.status === 'EN_REVISION' ? 'text-sud-orange border-sud-orange/20' : 'text-slate-500'
                        }`}
                      >
                        <option value="PENDIENTE">Pendiente</option>
                        <option value="EN_REVISION">En Revisión</option>
                        <option value="SELECCIONADO">Seleccionado</option>
                        <option value="FINALIZADO">No Seleccionado</option>
                      </select>
                      <button className="p-3 bg-sud-turquoise/10 text-sud-turquoise rounded-xl hover:bg-sud-turquoise hover:text-black transition-all">
                        <Users size={18} />
                      </button>
                    </div>
                  </div>
                ))}
                {(!applications[viewingApplicantsId] || applications[viewingApplicantsId].length === 0) && (
                  <div className="py-20 text-center opacity-40">
                    <p className="text-[10px] font-black uppercase tracking-widest">No hay postulantes aún</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

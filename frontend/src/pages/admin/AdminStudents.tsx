import React, { useState } from 'react';
import { Plus, Search, ShieldCheck, Settings, Trash2, CheckCircle2, LogOut } from 'lucide-react';
import { UserProfile, WhitelistEntry, ProfileCategory } from '../../types';

interface AdminStudentsProps {
  whitelist: WhitelistEntry[];
  users: UserProfile[];
  onAdd: (phone: string, name: string, category: ProfileCategory) => void;
  onRemove: (phone: string) => void;
  onUpdate: (phone: string, updates: any) => void;
}

export function AdminStudents({ whitelist, users, onAdd, onRemove, onUpdate }: AdminStudentsProps) {
  const [newPhone, setNewPhone] = useState('');
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState<ProfileCategory>('NONE');
  const [searchTerm, setSearchTerm] = useState('');

  const [editingEntry, setEditingEntry] = useState<any | null>(null);
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState<ProfileCategory>('NONE');

  const displayUsers = [
    ...whitelist.map(w => ({ ...w, type: 'WHITELIST' as const, category: w.category || 'NONE' })),
    ...users
      .filter(u => u.status === 'PENDING' || u.uid.startsWith('mock_'))
      .filter(u => !whitelist.some(w => w.phone === u.phone))
      .map(u => ({ 
        phone: u.phone, 
        name: u.name, 
        addedAt: u.createdAt, 
        type: 'REGISTERED' as const,
        status: u.status,
        category: u.category || 'NONE',
        uid: u.uid
      }))
  ];

  const filteredList = displayUsers.filter(e => 
    e.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    e.phone?.includes(searchTerm)
  );

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const digitsOnly = newPhone.replace(/\D/g, '');
    if (digitsOnly.length === 8 && newName.trim()) {
      onAdd(digitsOnly, newName.trim(), newCategory);
      setNewPhone('');
      setNewName('');
      setNewCategory('NONE');
    } else {
      alert('Por favor ingrese un nombre y un número de 8 dígitos.');
    }
  };

  const handleStartEdit = (entry: any) => {
    setEditingEntry(entry);
    setEditName(entry.name || '');
    setEditCategory(entry.category || 'NONE');
  };

  const handleSaveEdit = () => {
    if (editingEntry) {
      onUpdate(editingEntry.phone, {
        name: editName,
        category: editCategory
      });
      setEditingEntry(null);
    }
  };

  const getCategoryLabel = (cat?: ProfileCategory) => {
    switch (cat) {
      case 'ADULT': return 'Adulto';
      case 'MINOR': return 'Menor';
      case 'BOTH': return 'Ambos';
      default: return 'Pendiente';
    }
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-8">
        <div>
          <h2 className="text-3xl font-black tracking-tighter text-white">Gestión de <span className="sud-vibrant-text-gradient uppercase tracking-widest">Alumnos</span></h2>
          <p className="text-slate-400 mt-1 font-medium text-[10px] tracking-widest uppercase">Autorización de acceso y gestión de membresías</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4">
          <section className="bg-white/[0.03] border border-white/10 rounded-[2.5rem] p-8 shadow-2xl space-y-6">
            <h3 className="text-lg font-black uppercase tracking-tight text-white flex items-center gap-2">
              <Plus className="text-sud-orange" size={20} />
              Añadir Nuevo Alumno
            </h3>
            <form onSubmit={handleAdd} className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold text-slate-500 px-1 tracking-widest">Nombre del Alumno</label>
                <input 
                  type="text" 
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  className="sud-input w-full"
                  placeholder="Ej: Juan Pérez"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold text-slate-500 px-1 tracking-widest">Número Móvil</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 font-mono text-xs">+56 9</span>
                  <input 
                    type="tel"
                    placeholder="XXXXXXXX"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value.replace(/\D/g, '').slice(0, 8))}
                    className="sud-input w-full pl-16 py-2.5"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold text-slate-500 px-1 tracking-widest">Categoría del Perfil</label>
                <select 
                  value={newCategory}
                  onChange={e => setNewCategory(e.target.value as ProfileCategory)}
                  className="sud-input w-full appearance-none cursor-pointer"
                >
                  <option value="NONE">Asignar luego</option>
                  <option value="ADULT">Adulto</option>
                  <option value="MINOR">Menor</option>
                  <option value="BOTH">Ambos</option>
                </select>
              </div>
              <button type="submit" className="w-full sud-btn-primary py-4 text-xs font-black uppercase tracking-widest">
                Autorizar Alumno
              </button>
            </form>
          </section>
        </div>

        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white/[0.02] border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/[0.01]">
              <h3 className="font-black text-sm uppercase tracking-widest flex items-center gap-2">
                <ShieldCheck className="text-sud-turquoise" size={20} />
                Lista de Acceso
              </h3>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" size={16} />
                <input 
                  placeholder="Buscar alumno..." 
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="bg-black/40 border border-white/5 rounded-full py-1.5 pl-9 pr-4 text-[10px] outline-none focus:border-white/20 transition-all font-medium uppercase tracking-widest"
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="text-[10px] uppercase text-white/20 bg-white/[0.02] font-black tracking-widest">
                  <tr>
                    <th className="px-6 py-4">Alumno</th>
                    <th className="px-6 py-4">Teléfono</th>
                    <th className="px-6 py-4">Categoría</th>
                    <th className="px-6 py-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredList.map((entry, idx) => (
                    <tr key={idx} className="hover:bg-white/[0.01] transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {editingEntry?.phone === entry.phone ? (
                            <input 
                              value={editName}
                              onChange={e => setEditName(e.target.value)}
                              className="bg-white/5 border border-white/10 rounded-lg px-3 py-1 text-sm font-black text-white uppercase tracking-tight w-full outline-none focus:border-sud-turquoise/30"
                              autoFocus
                            />
                          ) : (
                            <>
                              <p className="text-sm font-black text-white uppercase tracking-tight">{entry.name || 'Sin Nombre'}</p>
                              {entry.type === 'REGISTERED' && (
                                <span className="text-[7px] px-2 py-0.5 rounded-full bg-sud-orange/20 text-sud-orange font-black uppercase tracking-widest border border-sud-orange/30">
                                  En Revisión
                                </span>
                              )}
                              {entry.phone === 'ADMIN' && (
                                <span className="text-[7px] px-2 py-0.5 rounded-full bg-sud-turquoise/20 text-sud-turquoise font-black uppercase tracking-widest border border-sud-turquoise/30">
                                  Admin
                                </span>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 font-mono text-sm text-slate-400">{entry.phone}</td>
                      <td className="px-6 py-4">
                        {editingEntry?.phone === entry.phone ? (
                          <select 
                            value={editCategory}
                            onChange={e => setEditCategory(e.target.value as ProfileCategory)}
                            className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-[10px] font-black text-white uppercase tracking-tight outline-none cursor-pointer focus:border-sud-turquoise/30"
                          >
                             <option value="NONE">Sin Cat.</option>
                             <option value="ADULT">Adulto</option>
                             <option value="MINOR">Menor</option>
                             <option value="BOTH">Ambos</option>
                          </select>
                        ) : (
                          <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md border border-current/10 ${entry.category === 'ADULT' ? 'text-blue-400 bg-blue-400/5' : entry.category === 'MINOR' ? 'text-pink-400 bg-pink-400/5' : entry.category === 'BOTH' ? 'text-purple-400 bg-purple-400/5' : 'text-slate-500 opacity-50 bg-white/5'}`}>
                            {getCategoryLabel(entry.category)}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {editingEntry?.phone === entry.phone ? (
                            <>
                              <button 
                                onClick={handleSaveEdit}
                                className="p-2 text-green-400 hover:bg-green-400/10 rounded-lg transition-colors"
                              >
                                <CheckCircle2 size={18} />
                              </button>
                              <button 
                                onClick={() => setEditingEntry(null)}
                                className="p-2 text-slate-500 hover:bg-white/5 rounded-lg transition-colors"
                              >
                                <LogOut size={18} className="rotate-180" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button 
                                onClick={() => handleStartEdit(entry)}
                                className="p-2 text-white/10 hover:text-sud-turquoise hover:bg-sud-turquoise/5 rounded-lg transition-colors md:opacity-0 group-hover:opacity-100"
                              >
                                <Settings size={18} />
                              </button>
                              <button 
                                onClick={() => onRemove(entry.phone)}
                                className="p-2 text-white/10 hover:text-red-400 hover:bg-red-400/5 rounded-lg transition-colors md:opacity-0 group-hover:opacity-100"
                              >
                                <Trash2 size={18} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

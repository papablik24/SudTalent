import React, { useState, useEffect, useRef } from 'react';
import { User, Baby, AudioLines, Settings, Loader, Camera, Phone, Mail, Calendar, Sparkles } from 'lucide-react';
import { UserProfile, TalentProfile } from '../../types';
import { fetchAPI } from '../../services/backendService';
import { InstagramFeed } from '../../components/InstagramFeed';

interface UserProfileViewProps {
  user: UserProfile;
  onNavigateToDemos: () => void;
  onNavigateToConvocatorias?: () => void;
  onUpdateUser: (updates: Partial<UserProfile>) => void;
}

export function UserProfileView({ user, onNavigateToDemos, onNavigateToConvocatorias, onUpdateUser }: UserProfileViewProps) {
  const [profile, setProfile] = useState<TalentProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [editData, setEditData] = useState({
    email: user.email || '',
    phone: user.phone || '',
    age: user.age ?? 0,
    bio: user.bio || '',
  });

  // Avatar
  const [avatarUrl, setAvatarUrl] = useState<string | null>(user.avatar || null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Avatar Cropping states
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [cropFileObject, setCropFileObject] = useState<File | null>(null);
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [imgSize, setImgSize] = useState({ width: 0, height: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const positionStart = useRef({ x: 0, y: 0 });
  // Sincronizar editData cuando cambia el usuario
  useEffect(() => {
    setEditData({
      email: user.email || '',
      phone: user.phone || '',
      age: user.age ?? 0,
      bio: user.bio || '',
    });
    if (user.avatar) setAvatarUrl(user.avatar);
  }, [user.uid]);

  // Cargar datos frescos desde el backend al montar (para age, bio, phone que pueden no estar en localStorage)
  useEffect(() => {
    const loadProfileFromBackend = async () => {
      try {
        const data = await fetchAPI<any>('/profile');
        setEditData(prev => ({
          ...prev,
          phone: data.phone || prev.phone,
          age: data.age || prev.age,
          bio: data.bio || prev.bio,
        }));
        if (data.profileImageUrl) setAvatarUrl(data.profileImageUrl);
        // Actualizar localStorage con datos frescos
        const savedUser = localStorage.getItem('sud_current_user');
        if (savedUser) {
          const parsed = JSON.parse(savedUser);
          const updated = {
            ...parsed,
            phone: data.phone || parsed.phone,
            age: data.age || parsed.age,
            bio: data.bio || parsed.bio,
            avatar: data.profileImageUrl || parsed.avatar,
          };
          localStorage.setItem('sud_current_user', JSON.stringify(updated));
        }
      } catch {
        // Si falla, usar los datos del localStorage que ya están cargados
      }
    };
    loadProfileFromBackend();
  }, [user.uid]);

  useEffect(() => {
    const saved = localStorage.getItem(`profile_${user.uid}`);
    if (saved) {
      const p = JSON.parse(saved);
      setProfile(p);
    }
    // También intentar cargar datos extras desde el backend
    const loadExtrasFromBackend = async () => {
      try {
        const data = await fetchAPI<any>('/profile');
        // Sincronizar especialidades si el backend las devuelve
        if (data.specialties) {
          const saved2 = localStorage.getItem(`profile_${user.uid}`);
          const existing = saved2 ? JSON.parse(saved2) : {};
          const merged = { ...existing, specialties: data.specialties.split ? data.specialties.split(',').map((s: string) => s.trim()).filter(Boolean) : (Array.isArray(data.specialties) ? data.specialties : []) };
          if (data.experience) merged.experience = data.experience;
          if (data.availability) merged.availability = data.availability;
          localStorage.setItem(`profile_${user.uid}`, JSON.stringify(merged));
          setProfile(prev => ({ ...existing, ...merged } as any));
        }
      } catch {
        // Fallback silencioso
      }
    };
    loadExtrasFromBackend();
  }, [user.uid]);


  // ─── Guardar perfil en backend ────────────────────────────────
  const handleSave = async () => {
    setIsSaving(true);
    setSaveError(null);

    // Validar teléfono chileno: debe ser exactamente 9 dígitos después de +56
    if (editData.phone) {
      const digits = editData.phone.replace(/[^0-9]/g, '');
      // Acepta 569XXXXXXXX (11 dígitos) o 9XXXXXXXX (9 dígitos)
      const normalized = digits.startsWith('56') ? digits.slice(2) : digits;
      if (normalized.length !== 9 || !normalized.startsWith('9')) {
        setSaveError('El teléfono debe ser un número chileno válido: +56 9 XXXX XXXX');
        setIsSaving(false);
        return;
      }
    }

    try {
      const response = await fetchAPI<any>('/profile', {
        method: 'PUT',
        body: JSON.stringify({
          phone: editData.phone ? editData.phone.replace(/[^0-9]/g, '') : undefined,
          age: editData.age || undefined,
          bio: editData.bio || undefined,
        }),
      });

      const updatedUser: Partial<UserProfile> = {
        phone: response.phone || editData.phone,
        age: response.age || editData.age,
        bio: response.bio || editData.bio,
      };

      const profileUpdates: any = user.profileType === 'PARENT'
        ? { childAge: editData.age }
        : { age: editData.age, bio: editData.bio };
      const updatedProfile = { ...profile, ...profileUpdates };
      localStorage.setItem(`profile_${user.uid}`, JSON.stringify(updatedProfile));
      setProfile(updatedProfile as TalentProfile);

      const savedUser = localStorage.getItem('sud_current_user');
      if (savedUser) {
        const parsed = JSON.parse(savedUser);
        localStorage.setItem('sud_current_user', JSON.stringify({ ...parsed, ...updatedUser }));
      }

      onUpdateUser(updatedUser);
      setIsEditing(false);
    } catch (err: any) {
      setSaveError(err?.message || 'Error al guardar. Intenta de nuevo.');
    } finally {
      setIsSaving(false);
    }
  };

  // ─── Upload avatar ────────────────────────────────────────────
  const performAvatarUpload = async (file: File) => {
    setAvatarError(null);
    setIsUploadingAvatar(true);
    try {
      const token = localStorage.getItem('sud_jwt_token');
      if (!token) throw new Error('No hay sesión activa');

      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080/api'}/profile/avatar`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Error al subir la imagen');
      }

      const data = await res.json();
      setAvatarUrl(data.profileImageUrl);
      onUpdateUser({ avatar: data.profileImageUrl });

      const savedUser = localStorage.getItem('sud_current_user');
      if (savedUser) {
        const parsed = JSON.parse(savedUser);
        localStorage.setItem('sud_current_user', JSON.stringify({ ...parsed, avatar: data.profileImageUrl }));
      }
    } catch (err: any) {
      setAvatarError(err?.message || 'Error al subir la imagen');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const clampPosition = (x: number, y: number, currentZoom: number) => {
    if (imgSize.width === 0) return { x, y };
    const renderW = imgSize.width * currentZoom;
    const renderH = imgSize.height * currentZoom;
    const minX = 280 - renderW;
    const minY = 280 - renderH;
    
    return {
      x: Math.min(0, Math.max(minX, x)),
      y: Math.min(0, Math.max(minY, y))
    };
  };

  useEffect(() => {
    if (imgSize.width === 0) return;
    setPosition(prev => clampPosition(prev.x, prev.y, zoom));
  }, [zoom, imgSize.width, imgSize.height]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY };
    positionStart.current = { ...position };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const deltaX = e.clientX - dragStart.current.x;
    const deltaY = e.clientY - dragStart.current.y;
    
    const targetX = positionStart.current.x + deltaX;
    const targetY = positionStart.current.y + deltaY;
    
    setPosition(clampPosition(targetX, targetY, zoom));
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDragging) {
      e.currentTarget.releasePointerCapture(e.pointerId);
      setIsDragging(false);
    }
  };

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarError(null);
    try {
      if (!file.type.startsWith('image/')) throw new Error('Solo se permiten imágenes');
      if (file.size > 5 * 1024 * 1024) throw new Error('La imagen no puede superar 5MB');

      setCropFileObject(file);
      const reader = new FileReader();
      reader.onload = () => {
        setCropImageSrc(reader.result as string);
        setCropModalOpen(true);
        setZoom(1);
        setPosition({ x: 0, y: 0 });
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setAvatarError(err?.message || 'Error al seleccionar la imagen');
      if (avatarInputRef.current) avatarInputRef.current.value = '';
    }
  };

  const handleCropCancel = () => {
    setCropModalOpen(false);
    setCropImageSrc(null);
    setCropFileObject(null);
    if (avatarInputRef.current) avatarInputRef.current.value = '';
  };

  const handleCropSave = () => {
    if (!cropImageSrc) return;
    const img = new Image();
    img.src = cropImageSrc;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 400;
      canvas.height = 400;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const scaleCanvas = 400 / 280;
      const canvasW = imgSize.width * zoom * scaleCanvas;
      const canvasH = imgSize.height * zoom * scaleCanvas;
      
      const drawX = position.x * scaleCanvas;
      const drawY = position.y * scaleCanvas;

      // Limpiar canvas a negro
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, 400, 400);

      ctx.drawImage(img, drawX, drawY, canvasW, canvasH);

      canvas.toBlob((blob) => {
        if (!blob) return;
        const filename = cropFileObject?.name || 'avatar.jpg';
        const croppedFile = new File([blob], filename, { type: 'image/jpeg' });
        performAvatarUpload(croppedFile);
        handleCropCancel();
      }, 'image/jpeg', 0.9);
    };
  };

  return (
    <div className="space-y-10">

      {/* ── Header con foto de perfil ── */}
      <section className="relative rounded-[3rem] overflow-hidden bg-black light:bg-white border border-white/10 light:border-slate-200 shadow-2xl light:shadow-md">
        <div className="h-48 sud-vibrant-gradient opacity-10 blur-3xl absolute -top-24 w-full" />
        <div className="p-6 md:p-10 relative flex flex-col md:flex-row items-center md:items-end gap-6 md:gap-8">

          {/* Avatar */}
          <div className="relative flex-shrink-0 group">
            <div className="w-32 h-32 rounded-[2rem] bg-white/5 light:bg-slate-50 border-2 border-white/10 light:border-slate-200 p-1 shadow-xl overflow-hidden">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover rounded-[1.6rem]" />
              ) : (
                <div className="w-full h-full rounded-[1.8rem] bg-sud-dark light:bg-slate-100 flex items-center justify-center">
                  {user.profileType === 'PARENT'
                    ? <Baby size={48} className="text-sud-orange" />
                    : <User size={48} className="text-slate-700 group-hover:text-sud-orange transition-colors" />}
                </div>
              )}
            </div>
            <button
              onClick={() => avatarInputRef.current?.click()}
              disabled={isUploadingAvatar}
              className="absolute -bottom-2 -right-2 bg-sud-orange hover:bg-sud-orange/80 disabled:opacity-50 p-2.5 rounded-2xl shadow-lg ring-4 ring-black light:ring-white transition-all"
              title="Cambiar foto de perfil"
            >
              {isUploadingAvatar
                ? <Loader size={16} className="text-white animate-spin" />
                : <Camera size={16} className="text-white" />}
            </button>
            <input ref={avatarInputRef} type="file" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
              onChange={handleAvatarSelect} disabled={isUploadingAvatar} className="hidden" />
          </div>

          {avatarError && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-red-500/20 border border-red-500/30 rounded-xl px-4 py-2">
              <p className="text-red-400 text-xs font-bold">{avatarError}</p>
            </div>
          )}

          <div className="flex-1 text-center md:text-left space-y-2">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
              <h2 className="text-2xl md:text-4xl font-black tracking-tighter text-white break-words">
                {user.profileType === 'PARENT' ? profile?.childName : user.name}
              </h2>
              <span className="px-3 py-1.5 rounded-full bg-sud-turquoise/10 text-sud-turquoise text-[10px] font-black uppercase tracking-widest border border-sud-turquoise/20">
                Talento {user.profileType === 'PARENT' ? 'Infantil' : 'Verificado'}
              </span>
            </div>
            <p className="text-slate-500 flex items-center justify-center md:justify-start gap-2 font-bold text-xs uppercase tracking-widest">
              <AudioLines size={16} className="text-sud-orange" />
              {profile?.specialties?.join(' • ') || 'Actor de Voz'}
            </p>
            {user.profileType === 'PARENT' && (
              <p className="text-[10px] text-slate-600 uppercase font-black tracking-widest mt-2">Representado por: {user.name}</p>
            )}
          </div>

          <div className="flex gap-3 md:gap-4 shrink-0">
            <button onClick={onNavigateToDemos} className="sud-btn-secondary px-6 md:px-10 py-4 md:py-5 rounded-3xl shadow-2xl text-sm">
              Mis Demos
            </button>
            <button onClick={() => { setIsEditing(!isEditing); setSaveError(null); }}
              className={`p-4 md:p-5 rounded-3xl border transition-all cursor-pointer ${isEditing ? 'bg-white/10 light:bg-slate-200 border-white/20 light:border-slate-300 text-white light:text-slate-800' : 'bg-transparent border-white/10 light:border-slate-200 text-white/40 light:text-slate-400 hover:text-white light:hover:text-slate-700'}`}>
              <Settings size={18} />
            </button>
          </div>
        </div>
      </section>

      {/* ── Información General ── */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        <div className="md:col-span-8 space-y-6">
          <div className="bg-white/[0.03] border border-white/10 rounded-[2.5rem] p-8 shadow-2xl space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-black uppercase tracking-tighter text-white">Información General</h3>
              {isEditing && (
                <button onClick={handleSave} disabled={isSaving}
                  className="px-6 py-2 bg-sud-orange text-black font-black text-[10px] uppercase tracking-widest rounded-full hover:bg-sud-orange/80 disabled:opacity-50 transition-all">
                  {isSaving ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              )}
            </div>

            {saveError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                <p className="text-red-400 text-xs font-bold">{saveError}</p>
              </div>
            )}

            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* Teléfono */}
                <div>
                  <p className="text-[10px] uppercase font-black text-slate-600 tracking-widest mb-2 flex items-center gap-1.5">
                    <Phone size={11} /> Teléfono
                  </p>
                  {isEditing ? (
                    <div className="flex items-center bg-white/5 border border-white/10 rounded-xl overflow-hidden focus-within:border-sud-orange transition-all">
                      <span className="px-3 py-2 text-slate-500 font-mono text-sm border-r border-white/10 select-none">+56 9</span>
                      <input
                        type="tel"
                        value={editData.phone.replace(/[^0-9]/g, '').replace(/^569?/, '')}
                        onChange={e => {
                          const digits = e.target.value.replace(/[^0-9]/g, '').slice(0, 8);
                          setEditData({ ...editData, phone: digits ? `569${digits}` : '' });
                        }}
                        placeholder="XXXX XXXX"
                        maxLength={8}
                        className="bg-transparent px-3 py-2 w-full text-white outline-none font-mono tracking-widest"
                      />
                    </div>
                  ) : (
                    <p className="text-slate-200 font-mono">
                      {editData.phone
                        ? (() => {
                            const d = editData.phone.replace(/[^0-9]/g, '');
                            const local = d.startsWith('56') ? d.slice(2) : d;
                            const n = local.startsWith('9') ? local.slice(1) : local;
                            return `+56 9 ${n.slice(0,4)} ${n.slice(4)}`.trim();
                          })()
                        : <span className="text-slate-600 italic text-sm">No especificado</span>}
                    </p>
                  )}
                </div>

                {/* Email */}
                <div>
                  <p className="text-[10px] uppercase font-black text-slate-600 tracking-widest mb-2 flex items-center gap-1.5">
                    <Mail size={11} /> Email
                  </p>
                  <p className="text-slate-200">{editData.email || <span className="text-slate-600 italic text-sm">No especificado</span>}</p>
                  <p className="text-[8px] text-slate-700 mt-1 uppercase font-bold tracking-widest italic">Solo lectura</p>
                </div>

                {/* Edad */}
                <div>
                  <p className="text-[10px] uppercase font-black text-slate-600 tracking-widest mb-2 flex items-center gap-1.5">
                    <Calendar size={11} /> {user.profileType === 'PARENT' ? 'Edad del Menor' : 'Edad'}
                  </p>
                  {isEditing ? (
                    <input
                      type="number"
                      min={1} max={120}
                      value={editData.age || ''}
                      onChange={e => setEditData({ ...editData, age: parseInt(e.target.value) || 0 })}
                      placeholder="Ej: 25"
                      className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 w-full text-white outline-none focus:border-sud-orange transition-all font-mono"
                    />
                  ) : (
                    <p className="text-slate-200 font-mono">
                      {editData.age ? `${editData.age} años` : <span className="text-slate-600 italic text-sm">No especificada</span>}
                    </p>
                  )}
                </div>
              </div>

              {/* Biografía */}
              <div className="pt-4 border-t border-white/5">
                <p className="text-[10px] uppercase font-black text-slate-600 tracking-widest mb-2">Biografía</p>
                {isEditing ? (
                  <textarea
                    value={editData.bio}
                    onChange={e => setEditData({ ...editData, bio: e.target.value })}
                    placeholder="Cuéntanos sobre ti..."
                    rows={3}
                    className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 w-full text-white outline-none focus:border-sud-orange transition-all resize-none"
                  />
                ) : (
                  <p className="text-sm text-slate-400 leading-relaxed italic">
                    {editData.bio || profile?.bio || 'Sin biografía disponible.'}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Estado del Perfil */}
        <div className="md:col-span-4 space-y-6">
          <h3 className="text-xl font-black uppercase tracking-tighter text-white px-2">Estado del Perfil</h3>
          {(() => {
            const status = user.status || 'PENDING';
            const config = {
              PENDING: {
                bg: 'bg-sud-yellow/5',
                dot: 'bg-sud-yellow animate-pulse',
                dotBg: 'bg-sud-yellow/10',
                border: 'border-white/10',
                label: 'Revisión Pendiente',
                desc: 'Tu perfil está siendo revisado por el equipo de casting. Una vez aprobado, aparecerás en las búsquedas internas.',
              },
              APPROVED: {
                bg: 'bg-sud-turquoise/5',
                dot: 'bg-sud-turquoise',
                dotBg: 'bg-sud-turquoise/10',
                border: 'border-sud-turquoise/20',
                label: 'Perfil Aprobado',
                desc: 'Tu perfil ha sido aprobado. Ya apareces en las búsquedas internas del equipo de casting.',
              },
              INACTIVE: {
                bg: 'bg-red-500/5',
                dot: 'bg-red-500',
                dotBg: 'bg-red-500/10',
                border: 'border-red-500/20',
                label: 'Perfil Inactivo',
                desc: 'Tu perfil ha sido desactivado. Contacta con el equipo de SudTalent para más información.',
              },
            } as const;
            const c = config[status as keyof typeof config] ?? config.PENDING;
            return (
              <div className={`${c.bg} border ${c.border} rounded-[2.5rem] p-8 space-y-6 shadow-2xl backdrop-blur-md relative overflow-hidden`}>
                <div className={`absolute top-0 right-0 w-24 h-24 ${c.dotBg} blur-3xl rounded-full`} />
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl ${c.dotBg} flex items-center justify-center`}>
                    <div className={`w-3 h-3 ${c.dot} rounded-full`} />
                  </div>
                  <p className="text-sm font-bold text-white leading-tight uppercase tracking-widest">{c.label}</p>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed font-medium">{c.desc}</p>
              </div>
            );
          })()}
          {onNavigateToConvocatorias && (
            <button
              onClick={onNavigateToConvocatorias}
              className="w-full sud-btn-primary py-5 rounded-[2rem] text-sm font-black uppercase tracking-widest flex items-center justify-center gap-3 shadow-2xl shadow-sud-turquoise/10 hover:scale-[1.02] transition-all"
            >
              <Sparkles size={18} />
              Ver Convocatorias
            </button>
          )}
        </div>
      </div>

      {/* ── Perfil Vocal ── */}
      <div className="bg-white/[0.03] border border-white/10 rounded-[2.5rem] p-8 shadow-2xl space-y-6">
        <h3 className="text-xl font-black uppercase tracking-tighter text-white">Perfil Vocal</h3>

        {/* Especialidades */}
        <div>
          <p className="text-[10px] uppercase font-black text-slate-600 tracking-widest mb-3">Especialidades</p>
          {profile?.specialties && profile.specialties.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {profile.specialties.map((s: string) => (
                <span key={s} className="px-4 py-1.5 rounded-2xl bg-sud-turquoise/10 border border-sud-turquoise/30 text-sud-turquoise text-[10px] font-black uppercase tracking-wider">
                  {s}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-slate-600 italic text-sm">Sin especialidades registradas.</p>
          )}
        </div>

        {/* Experiencia */}
        {profile?.experience ? (
          <div className="pt-4 border-t border-white/5">
            <p className="text-[10px] uppercase font-black text-slate-600 tracking-widest mb-2">Experiencia Previa</p>
            <p className="text-sm text-slate-300 leading-relaxed">{profile.experience}</p>
          </div>
        ) : null}

        {/* Disponibilidad */}
        {(profile?.availability || profile?.location) ? (
          <div className="pt-4 border-t border-white/5">
            <p className="text-[10px] uppercase font-black text-slate-600 tracking-widest mb-2">Disponibilidad</p>
            <p className="text-sm text-slate-300 leading-relaxed">{profile.availability || profile.location}</p>
          </div>
        ) : null}

        {!profile?.specialties?.length && !profile?.experience && !profile?.availability && !profile?.location && (
          <p className="text-[9px] text-slate-700 uppercase font-bold tracking-widest italic">
            Completa el onboarding para ver tu perfil vocal aquí.
          </p>
        )}
      </div>

      {/* ── Feed de Instagram ── */}
      <InstagramFeed />

      {/* ── Modal de Ajuste de Foto de Perfil ── */}
      {cropModalOpen && cropImageSrc && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-[100] p-4">
          <div className="bg-[#0f0f0f] border border-white/10 rounded-[2.5rem] p-6 max-w-sm w-full space-y-6 shadow-2xl">
            <div className="space-y-1">
              <h3 className="text-xs font-black text-white uppercase tracking-wider text-center">
                Ajustar foto de perfil
              </h3>
              <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest text-center">
                Arrastra la imagen para encuadrarla
              </p>
            </div>

            {/* Contenedor de encuadre */}
            <div 
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              className={`relative w-[280px] h-[280px] rounded-[2rem] border border-white/10 bg-black mx-auto overflow-hidden flex items-center justify-center select-none touch-none ${
                isDragging ? 'cursor-grabbing' : 'cursor-grab'
              }`}
            >
              <img
                src={cropImageSrc}
                alt="Vista previa"
                onLoad={(e) => {
                  const img = e.currentTarget;
                  const aspect = img.naturalWidth / img.naturalHeight;
                  let w = 280;
                  let h = 280;
                  if (aspect > 1) {
                    w = 280 * aspect;
                  } else {
                    h = 280 / aspect;
                  }
                  setImgSize({ width: w, height: h });
                  
                  // Center by default
                  const defaultX = -Math.max(0, (w - 280) / 2);
                  const defaultY = -Math.max(0, (h - 280) / 2);
                  setPosition({ x: defaultX, y: defaultY });
                }}
                style={{
                  position: 'absolute',
                  width: `${imgSize.width * zoom}px`,
                  height: `${imgSize.height * zoom}px`,
                  left: `${position.x}px`,
                  top: `${position.y}px`,
                  maxWidth: 'none',
                  maxHeight: 'none',
                  pointerEvents: 'none',
                }}
              />
              {/* Máscara de avatar circular para visualización del corte final */}
              <div className="absolute inset-0 rounded-[2rem] border-4 border-sud-turquoise/40 pointer-events-none" />
            </div>

            {/* Controles de Zoom */}
            <div className="space-y-4">
              <div className="space-y-1">
                <div className="flex justify-between text-[8px] text-slate-500 font-black uppercase tracking-wider">
                  <span>Ajusta el zoom</span>
                  <span>{Math.round(zoom * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="3"
                  step="0.05"
                  value={zoom}
                  onChange={e => setZoom(parseFloat(e.target.value))}
                  className="w-full accent-sud-turquoise h-1 bg-white/10 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </div>

            {/* Botones de acción */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleCropCancel}
                className="flex-1 py-3.5 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white font-black text-[9px] uppercase tracking-widest rounded-2xl transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleCropSave}
                className="flex-1 py-3.5 bg-sud-orange hover:bg-sud-orange/80 text-black font-black text-[9px] uppercase tracking-widest rounded-2xl transition-all cursor-pointer"
              >
                Guardar foto
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

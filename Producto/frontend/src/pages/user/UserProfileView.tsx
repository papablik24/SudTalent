import React, { useState, useEffect, useRef } from 'react';
import { User, Baby, AudioLines, Settings, Trash2, Loader, Camera, Phone, Mail, Calendar } from 'lucide-react';
import { UserProfile, TalentProfile } from '../../types';
import { audioService } from '../../services/audioService';
import { fetchAPI } from '../../services/backendService';
import { AudioPlayer } from '../../components/ui/AudioPlayer';
import { AudioDropZone } from '../../components/ui/AudioDropZone';
import { InstagramFeed } from '../../components/InstagramFeed';

interface UserProfileViewProps {
  user: UserProfile;
  onNavigateToDemos: () => void;
  onUpdateUser: (updates: Partial<UserProfile>) => void;
}

export function UserProfileView({ user, onNavigateToDemos, onUpdateUser }: UserProfileViewProps) {
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

  // Audio de perfil — estados del flujo
  const [profileAudio, setProfileAudio] = useState<string | null>(null);
  const [pendingAudio, setPendingAudio] = useState<string | null>(null); // audio subido pero sin confirmar
  const [isUploadingAudio, setIsUploadingAudio] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [isLoadingAudio, setIsLoadingAudio] = useState(true);
  const [showAudioManager, setShowAudioManager] = useState(false); // panel de gestión
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
  }, [user.uid]);

  // Cargar audio del perfil
  useEffect(() => {
    const loadProfileAudio = async () => {
      try {
        setIsLoadingAudio(true);
        const token = localStorage.getItem('sud_jwt_token');
        if (!token) { setIsLoadingAudio(false); return; }
        const audios = await audioService.getUserAudios(token, 'profile');
        if (audios && audios.length > 0) {
          setProfileAudio(audios[0].fileUrl);
          localStorage.setItem(`profileAudio_${user.uid}`, audios[0].fileUrl);
        } else {
          const saved = localStorage.getItem(`profileAudio_${user.uid}`);
          if (saved) setProfileAudio(saved);
        }
      } catch {
        const saved = localStorage.getItem(`profileAudio_${user.uid}`);
        if (saved) setProfileAudio(saved);
      } finally {
        setIsLoadingAudio(false);
      }
    };
    loadProfileAudio();
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
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarError(null);
    setIsUploadingAvatar(true);
    try {
      if (!file.type.startsWith('image/')) throw new Error('Solo se permiten imágenes');
      if (file.size > 5 * 1024 * 1024) throw new Error('La imagen no puede superar 5MB');

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
      if (avatarInputRef.current) avatarInputRef.current.value = '';
    }
  };

  // ─── Audio handlers ───────────────────────────────────────────
  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAudioError(null);
    setIsUploadingAudio(true);
    try {
      if (!file.type.includes('audio')) throw new Error('Por favor selecciona un archivo de audio');
      if (file.size / (1024 * 1024) > 10) throw new Error('El archivo es muy grande. Máximo 10MB');
      const token = localStorage.getItem('sud_jwt_token');
      if (!token) throw new Error('No hay sesión activa');
      const result = await audioService.uploadAudio(file, 'profile', token);
      // Guardar como pendiente — esperar confirmación del usuario
      setPendingAudio(result.fileUrl);
      localStorage.setItem(`profileAudio_${user.uid}`, result.fileUrl);
    } catch (err: any) {
      setAudioError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsUploadingAudio(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleConfirmAudio = () => {
    if (!pendingAudio) return;
    setProfileAudio(pendingAudio);
    setPendingAudio(null);
    setShowAudioManager(false);
  };

  const handleCancelPendingAudio = async () => {
    // Eliminar el audio recién subido si el usuario cancela
    if (pendingAudio) {
      try {
        const token = localStorage.getItem('sud_jwt_token');
        if (token) {
          const audios = await audioService.getUserAudios(token, 'profile');
          // Eliminar solo el que coincide con pendingAudio
          const match = audios?.find((a: any) => a.fileUrl === pendingAudio);
          if (match) await audioService.deleteAudio(match.id, token);
        }
      } catch { /* silencioso */ }
    }
    setPendingAudio(null);
    setAudioError(null);
  };

  const handleDeleteAudio = async () => {
    if (!profileAudio) return;
    setConfirmingDelete(false);
    setIsUploadingAudio(true);
    try {
      const token = localStorage.getItem('sud_jwt_token');
      if (!token) throw new Error('No hay sesión activa');
      const audios = await audioService.getUserAudios(token, 'profile');
      if (audios?.length > 0) {
        await audioService.deleteAudio(audios[0].id, token);
        setProfileAudio(null);
        setShowAudioManager(false);
        localStorage.removeItem(`profileAudio_${user.uid}`);
      }
    } catch { setAudioError('Error al eliminar el audio'); }
    finally { setIsUploadingAudio(false); }
  };

  return (
    <div className="space-y-10">

      {/* ── Audio de Perfil ── */}
      <section className="relative bg-white/[0.03] border border-white/10 rounded-[2.5rem] p-8 shadow-2xl space-y-6">
        <div className="flex items-center gap-3">
          <AudioLines className="text-sud-orange" size={24} />
          <h3 className="text-xl font-black uppercase tracking-tighter text-white">Audio de Perfil</h3>
        </div>

        {/* Botón de gestión — esquina superior derecha de la sección, solo cuando hay audio */}
        {profileAudio && !isLoadingAudio && (
          <button
            onClick={() => { setShowAudioManager(v => !v); setAudioError(null); setConfirmingDelete(false); }}
            className={`absolute top-6 right-6 w-8 h-8 rounded-full flex items-center justify-center transition-colors ${showAudioManager ? 'bg-white/20 text-white' : 'bg-white/5 hover:bg-white/15 text-slate-500 hover:text-slate-300'}`}
            title="Gestionar audio"
          >
            <Settings size={14} />
          </button>
        )}

        {isLoadingAudio ? (
          /* ── Cargando ── */
          <div className="flex items-center justify-center py-8">
            <div className="w-8 h-8 border-2 border-sud-orange/30 border-t-sud-orange rounded-full animate-spin" />
          </div>

        ) : pendingAudio ? (
          /* ── Estado 2: Audio subido, esperando confirmación ── */
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-sud-orange/10 border border-sud-orange/20">
              <p className="text-[10px] font-black uppercase tracking-widest text-sud-orange mb-3 flex items-center gap-2">
                <span className="w-2 h-2 bg-sud-orange rounded-full animate-pulse" />
                Previsualiza tu audio antes de confirmar
              </p>
              <AudioPlayer src={pendingAudio} title="Audio nuevo" showVolume />
            </div>

            {audioError && (
              <p className="text-red-400 text-xs font-bold px-1">{audioError}</p>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleConfirmAudio}
                disabled={isUploadingAudio}
                className="flex-1 py-3 bg-sud-orange hover:bg-sud-orange/80 disabled:opacity-50 text-black font-black text-[10px] uppercase tracking-widest rounded-2xl transition-all"
              >
                ✓ Confirmar Audio
              </button>
              <button
                onClick={handleCancelPendingAudio}
                disabled={isUploadingAudio}
                className="flex-1 py-3 bg-white/5 hover:bg-white/10 disabled:opacity-50 text-slate-400 font-black text-[10px] uppercase tracking-widest rounded-2xl transition-all"
              >
                Cancelar
              </button>
            </div>
          </div>

        ) : profileAudio ? (
          /* ── Estado 3: Audio confirmado ── */
          <div className="space-y-4">
          {/* Player principal */}
            <div className="relative">
              <AudioPlayer
                src={profileAudio}
                title="Mi audio de perfil"
                showVolume
                onDownload={() => audioService.downloadAudio(profileAudio, 'mi-audio.mp3')}
              />
            </div>

            {/* Panel de gestión */}
            {showAudioManager && (
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 space-y-4">

                {audioError && (
                  <p className="text-red-400 text-xs font-bold">{audioError}</p>
                )}

                {/* Cambiar audio */}
                <div>
                  <p className="text-[10px] uppercase font-black text-slate-600 tracking-widest mb-2">Reemplazar audio</p>
                  <AudioDropZone
                    file={null}
                    isUploading={isUploadingAudio}
                    error={null}
                    onFileSelected={(file) => {
                      const dt = new DataTransfer(); dt.items.add(file);
                      handleAudioUpload({ target: { files: dt.files } } as any);
                    }}
                    hint="Sube un nuevo archivo para reemplazar el actual"
                  />
                </div>

                {/* Eliminar */}
                <div className="pt-2 border-t border-white/5">
                  {!confirmingDelete ? (
                    <button
                      onClick={() => setConfirmingDelete(true)}
                      disabled={isUploadingAudio}
                      className="flex items-center gap-2 px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 disabled:opacity-50 text-red-400 font-black text-[10px] uppercase tracking-widest rounded-xl transition-all"
                    >
                      <Trash2 size={13} /> Eliminar audio
                    </button>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-[10px] text-red-400 font-black uppercase tracking-widest">
                        ¿Seguro que quieres eliminar tu audio de perfil?
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={handleDeleteAudio}
                          disabled={isUploadingAudio}
                          className="px-4 py-2 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition-all flex items-center gap-2"
                        >
                          {isUploadingAudio ? <Loader size={12} className="animate-spin" /> : <Trash2 size={12} />}
                          Sí, eliminar
                        </button>
                        <button
                          onClick={() => setConfirmingDelete(false)}
                          className="px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-400 font-black text-[10px] uppercase tracking-widest rounded-xl transition-all"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

        ) : (
          /* ── Estado 1: Sin audio ── */
          <div className="space-y-3">
            <p className="text-[10px] text-slate-600 uppercase font-black tracking-widest">
              Sube tu audio de presentación
            </p>
            <AudioDropZone
              file={null}
              isUploading={isUploadingAudio}
              error={audioError}
              onFileSelected={(file) => {
                const dt = new DataTransfer(); dt.items.add(file);
                handleAudioUpload({ target: { files: dt.files } } as any);
              }}
              hint="MP3 o WAV · Máximo 10MB"
            />
          </div>
        )}

        <input ref={fileInputRef} type="file" accept="audio/mpeg,audio/wav,.mp3,.wav"
          onChange={handleAudioUpload} disabled={isUploadingAudio} className="hidden" />
      </section>

      {/* ── Header con foto de perfil ── */}
      <section className="relative rounded-[3rem] overflow-hidden bg-black border border-white/10 shadow-2xl">
        <div className="h-48 sud-vibrant-gradient opacity-10 blur-3xl absolute -top-24 w-full" />
        <div className="p-6 md:p-10 relative flex flex-col md:flex-row items-center md:items-end gap-6 md:gap-8">

          {/* Avatar */}
          <div className="relative flex-shrink-0 group">
            <div className="w-32 h-32 rounded-[2rem] bg-white/5 border-2 border-white/10 p-1 shadow-xl overflow-hidden">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover rounded-[1.6rem]" />
              ) : (
                <div className="w-full h-full rounded-[1.8rem] bg-sud-dark flex items-center justify-center">
                  {user.profileType === 'PARENT'
                    ? <Baby size={48} className="text-sud-orange" />
                    : <User size={48} className="text-slate-700 group-hover:text-sud-orange transition-colors" />}
                </div>
              )}
            </div>
            <button
              onClick={() => avatarInputRef.current?.click()}
              disabled={isUploadingAvatar}
              className="absolute -bottom-2 -right-2 bg-sud-orange hover:bg-sud-orange/80 disabled:opacity-50 p-2.5 rounded-2xl shadow-lg ring-4 ring-black transition-all"
              title="Cambiar foto de perfil"
            >
              {isUploadingAvatar
                ? <Loader size={16} className="text-white animate-spin" />
                : <Camera size={16} className="text-white" />}
            </button>
            <input ref={avatarInputRef} type="file" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
              onChange={handleAvatarUpload} disabled={isUploadingAvatar} className="hidden" />
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
              className={`p-4 md:p-5 rounded-3xl border transition-all ${isEditing ? 'bg-white/10 border-white/20 text-white' : 'bg-transparent border-white/10 text-white/40 hover:text-white'}`}>
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
        </div>
      </div>

      {/* ── Feed de Instagram ── */}
      <InstagramFeed />
    </div>
  );
}

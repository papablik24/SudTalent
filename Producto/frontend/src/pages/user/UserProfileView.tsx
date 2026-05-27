import React, { useState, useEffect, useRef } from 'react';
import { User, Baby, Sparkles, AudioLines, Settings, Download, Trash2, Upload, Loader } from 'lucide-react';
import { UserProfile, TalentProfile } from '../../types';
import { audioService } from '../../services/audioService';
import { AudioPlayer } from '../../components/ui/AudioPlayer';

interface UserProfileViewProps {
  user: UserProfile;
  onNavigateToDemos: () => void;
  onUpdateUser: (updates: Partial<UserProfile>) => void;
}

export function UserProfileView({ user, onNavigateToDemos, onUpdateUser }: UserProfileViewProps) {
  console.log('🎬 UserProfileView renderizado')
  
  // ════════════════════════════════════════════════════════════════
  // ESTADO EXISTENTE
  // ════════════════════════════════════════════════════════════════
  const [profile, setProfile] = useState<TalentProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editData, setEditData] = useState({
    email: user.email || '',
    age: 0
  });

  // ════════════════════════════════════════════════════════════════
  // NUEVO: ESTADO PARA AUDIO DEL PERFIL
  // ════════════════════════════════════════════════════════════════
  const [profileAudio, setProfileAudio] = useState<string | null>(null);
  const [isUploadingAudio, setIsUploadingAudio] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [isLoadingAudio, setIsLoadingAudio] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ════════════════════════════════════════════════════════════════
  // EFFECT: CARGAR PERFIL Y AUDIO
  // ════════════════════════════════════════════════════════════════
  useEffect(() => {
    const saved = localStorage.getItem(`profile_${user.uid}`);
    if (saved) {
      const p = JSON.parse(saved);
      setProfile(p);
      setEditData(prev => ({ ...prev, age: user.profileType === 'PARENT' ? (p.childAge || 0) : (p.age || 0) }));
    }
  }, [user.uid]);

  // ════════════════════════════════════════════════════════════════
  // NUEVO: EFFECT PARA CARGAR AUDIO DEL PERFIL
  // ════════════════════════════════════════════════════════════════
  useEffect(() => {
    const loadProfileAudio = async () => {
      try {
        setIsLoadingAudio(true);
        const token = localStorage.getItem('sud_jwt_token');
        
        if (!token) {
          console.warn('No hay token para cargar audios');
          setIsLoadingAudio(false);
          return;
        }

        // Obtener audios del perfil
        const audios = await audioService.getUserAudios(token, 'profile');
        
        if (audios && audios.length > 0) {
          // Tomar el más reciente
          const audioUrl = audios[0].fileUrl;
          setProfileAudio(audioUrl);
          // Guardar en localStorage para persistencia
          localStorage.setItem(`profileAudio_${user.uid}`, audioUrl);
          console.log('✅ Audio de perfil cargado:', audioUrl);
        } else {
          // Intentar recuperar de localStorage
          const savedAudio = localStorage.getItem(`profileAudio_${user.uid}`);
          if (savedAudio) {
            setProfileAudio(savedAudio);
            console.log('✅ Audio de perfil recuperado de localStorage');
          } else {
            console.log('ℹ️ No hay audios de perfil aún');
          }
        }
      } catch (error) {
        console.error('❌ Error cargando audio de perfil:', error);
        // Intentar recuperar de localStorage si hay error
        const savedAudio = localStorage.getItem(`profileAudio_${user.uid}`);
        if (savedAudio) {
          setProfileAudio(savedAudio);
        }
      } finally {
        setIsLoadingAudio(false);
      }
    };

    loadProfileAudio();
  }, [user.uid]);

  // ════════════════════════════════════════════════════════════════
  // GUARDAR CAMBIOS (EXISTENTE)
  // ════════════════════════════════════════════════════════════════
  const handleSave = async () => {
    setIsSaving(true);
    await new Promise(r => setTimeout(r, 600));

    const userUpdates = { email: editData.email };
    const profileUpdates: any = {
      ...(user.profileType === 'PARENT' ? { childAge: editData.age } : { age: editData.age })
    };
    
    const updatedProfile = { ...profile, ...profileUpdates };
    localStorage.setItem(`profile_${user.uid}`, JSON.stringify(updatedProfile));
    setProfile(updatedProfile as TalentProfile);
    onUpdateUser(userUpdates);
    setIsEditing(false);
    setIsSaving(false);
  };

  // ════════════════════════════════════════════════════════════════
  // NUEVO: MANEJAR UPLOAD DE AUDIO
  // ════════════════════════════════════════════════════════════════
  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    
    console.log('🎯 handleAudioUpload llamado')
    console.log('   Archivo seleccionado:', file?.name)
    
    if (!file) {
      console.warn('   ⚠️ No hay archivo')
      return;
    }

    setAudioError(null);
    setIsUploadingAudio(true);

    try {
      // Validar tipo de archivo
      console.log('1️⃣ Validando tipo:', file.type)
      if (!file.type.includes('audio')) {
        throw new Error('Por favor selecciona un archivo de audio');
      }

      // Validar tamaño (máx 10MB)
      const fileSizeMB = file.size / (1024 * 1024);
      console.log('2️⃣ Validando tamaño:', fileSizeMB.toFixed(2), 'MB')
      if (fileSizeMB > 10) {
        throw new Error('El archivo es muy grande. Máximo 10MB');
      }

      // Obtener token
      const token = localStorage.getItem('sud_jwt_token');
      console.log('3️⃣ Token presente:', !!token)
      if (!token) {
        throw new Error('No hay sesión activa. Inicia sesión de nuevo');
      }

      console.log(`4️⃣ 📤 Subiendo audio: ${file.name} (${fileSizeMB.toFixed(2)}MB)`);

      // Subir audio
      const result = await audioService.uploadAudio(file, 'profile', token);
      
      console.log('5️⃣ ✅ Resultado del upload:', result)
      
      // Actualizar estado con la URL del nuevo audio
      setProfileAudio(result.fileUrl);
      // Guardar en localStorage para persistencia
      localStorage.setItem(`profileAudio_${user.uid}`, result.fileUrl);
      console.log('6️⃣ ✅ Audio subido exitosamente:', result.fileUrl);

      // Limpiar input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido al subir audio';
      setAudioError(errorMessage);
      console.error('❌ Error:', errorMessage);
    } finally {
      setIsUploadingAudio(false);
    }
  };

  // ════════════════════════════════════════════════════════════════
  // NUEVO: DESCARGAR AUDIO
  // ════════════════════════════════════════════════════════════════
  const handleDownloadAudio = async () => {
    if (!profileAudio) return;

    try {
      setIsUploadingAudio(true);
      await audioService.downloadAudio(profileAudio, 'mi-audio.mp3');
      console.log('✅ Audio descargado exitosamente');
    } catch (error) {
      setAudioError('Error al descargar el audio');
      console.error('❌ Error descargando:', error);
    } finally {
      setIsUploadingAudio(false);
    }
  };

  // ════════════════════════════════════════════════════════════════
  // NUEVO: ELIMINAR AUDIO
  // ════════════════════════════════════════════════════════════════
  const handleDeleteAudio = async () => {
    if (!profileAudio) return;

    if (!confirm('¿Estás seguro de que deseas eliminar tu audio de perfil?')) {
      return;
    }

    try {
      setIsUploadingAudio(true);
      const token = localStorage.getItem('sud_jwt_token');
      
      if (!token) {
        throw new Error('No hay sesión activa');
      }

      // Obtener el ID del audio antes de eliminar
      const audios = await audioService.getUserAudios(token, 'profile');
      if (audios && audios.length > 0) {
        await audioService.deleteAudio(audios[0].id, token);
        setProfileAudio(null);
        console.log('✅ Audio eliminado exitosamente');
      }

    } catch (error) {
      setAudioError('Error al eliminar el audio');
      console.error('❌ Error eliminando:', error);
    } finally {
      setIsUploadingAudio(false);
    }
  };

  // ════════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════════
  return (
    <div className="space-y-10">
      {/* ════════════════════════════════════════════════════════════════ */}
      {/* SECCIÓN DE AUDIO DEL PERFIL - NUEVA */}
      {/* ════════════════════════════════════════════════════════════════ */}
      <section className="bg-white/[0.03] border border-white/10 rounded-[2.5rem] p-8 shadow-2xl space-y-6">
        <div className="flex items-center gap-3">
          <AudioLines className="text-sud-orange" size={24} />
          <h3 className="text-xl font-black uppercase tracking-tighter text-white">
            Audio de Perfil
          </h3>
        </div>

        {/* MOSTRAR AUDIO SI EXISTE */}
        {profileAudio && !isLoadingAudio ? (
          <div className="space-y-4">
            <AudioPlayer 
              src={profileAudio} 
              title="Mi audio de perfil"
              onDownload={handleDownloadAudio}
            />

            {/* Botones de acción */}
            <div className="flex gap-3 flex-wrap">
              <button
                onClick={() => {
                  fileInputRef.current?.click()
                }}
                disabled={isUploadingAudio}
                className="flex items-center gap-2 px-4 py-2.5 bg-sud-orange hover:bg-sud-orange/80 disabled:bg-sud-orange/50 text-black font-black text-[10px] uppercase tracking-widest rounded-lg transition-all disabled:cursor-not-allowed"
              >
                {isUploadingAudio ? (
                  <Loader size={14} className="animate-spin" />
                ) : (
                  <Upload size={14} />
                )}
                Cambiar Audio
              </button>

              <button
                onClick={handleDeleteAudio}
                disabled={isUploadingAudio}
                className="flex items-center gap-2 px-4 py-2.5 bg-red-500 hover:bg-red-600 disabled:bg-red-500/50 text-white font-black text-[10px] uppercase tracking-widest rounded-lg transition-all disabled:cursor-not-allowed"
              >
                {isUploadingAudio ? (
                  <Loader size={14} className="animate-spin" />
                ) : (
                  <Trash2 size={14} />
                )}
                Eliminar
              </button>
            </div>

            {audioError && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                <p className="text-red-400 text-xs">{audioError}</p>
              </div>
            )}
          </div>
        ) : isLoadingAudio ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-8 h-8 border-2 border-sud-orange/30 border-t-sud-orange rounded-full animate-spin" />
          </div>
        ) : (
          // SIN AUDIO - MOSTRAR ÁREA DE UPLOAD
          <div
            onClick={() => {
              fileInputRef.current?.click()
            }}
            className="flex flex-col items-center justify-center p-8 rounded-xl border-2 border-dashed border-white/10 hover:border-sud-orange/50 transition-all cursor-pointer group"
          >
            {isUploadingAudio ? (
              <>
                <Loader size={40} className="animate-spin text-sud-orange mb-3" />
                <p className="text-sm text-slate-300 uppercase font-bold tracking-widest">
                  Subiendo tu audio...
                </p>
              </>
            ) : (
              <>
                <Upload size={40} className="text-slate-600 mb-3 group-hover:text-sud-orange transition-colors" />
                <p className="text-sm text-slate-300 uppercase font-bold tracking-widest">
                  Sube tu audio de perfil
                </p>
                <p className="text-xs text-slate-600 mt-2 uppercase font-bold tracking-widest">
                  MP3 o WAV • Máximo 10MB
                </p>
              </>
            )}
          </div>
        )}

        {/* MOSTRAR ERRORES */}
        {audioError && (
          <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
            <p className="text-sm text-red-400 font-bold">
              ⚠️ {audioError}
            </p>
          </div>
        )}

        {/* INPUT HIDDEN PARA ARCHIVO */}
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/mpeg,audio/wav,.mp3,.wav"
          onChange={(e) => {
            console.log('📥 INPUT CHANGE EVENT DETECTADO!', e)
            handleAudioUpload(e)
          }}
          disabled={isUploadingAudio}
          className="hidden"
        />
      </section>

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* SECCIÓN DE HEADER - EXISTENTE */}
      {/* ════════════════════════════════════════════════════════════════ */}
      <section className="relative rounded-[3rem] overflow-hidden bg-black border border-white/10 shadow-2xl">
        <div className="h-48 sud-vibrant-gradient opacity-10 blur-3xl absolute -top-24 w-full" />
        <div className="p-10 relative flex flex-col md:flex-row items-center md:items-end gap-8">
          <div className="w-32 h-32 rounded-[2rem] bg-white/5 border-2 border-white/10 p-1 flex-shrink-0 group cursor-pointer relative shadow-xl">
            <div className="w-full h-full rounded-[1.8rem] overflow-hidden bg-sud-dark flex items-center justify-center">
              {user.profileType === 'PARENT' ? <Baby size={48} className="text-sud-orange" /> : <User size={48} className="text-slate-700 group-hover:text-sud-orange transition-colors" />}
            </div>
            <div className="absolute -bottom-2 -right-2 bg-sud-orange p-2.5 rounded-2xl shadow-lg ring-4 ring-black">
              <Sparkles size={16} className="text-white" />
            </div>
          </div>
          <div className="flex-1 text-center md:text-left space-y-2">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
              <h2 className="text-4xl font-black tracking-tighter text-white">
                {user.profileType === 'PARENT' ? profile?.childName : user.name}
              </h2>
              <span className="px-3 py-1.5 rounded-full bg-sud-turquoise/10 text-sud-turquoise text-[10px] font-black uppercase tracking-widest border border-sud-turquoise/20 shadow-lg shadow-sud-turquoise/5">
                Talento {user.profileType === 'PARENT' ? 'Infantil' : 'Verificado'}
              </span>
            </div>
            <p className="text-slate-500 flex items-center justify-center md:justify-start gap-2 font-bold text-xs uppercase tracking-widest">
              <AudioLines size={16} className="text-sud-orange" />
              {profile?.specialties.join(' • ') || 'Actor de Voz'}
            </p>
            {user.profileType === 'PARENT' && (
              <p className="text-[10px] text-slate-600 uppercase font-black tracking-widest mt-2">Representado por: {user.name}</p>
            )}
          </div>
          <div className="flex gap-4">
            <button 
              onClick={onNavigateToDemos}
              className="sud-btn-secondary px-10 py-5 rounded-3xl shadow-2xl"
            >
              Mis Demos
            </button>
            <button 
              onClick={() => setIsEditing(!isEditing)}
              className={`p-5 rounded-3xl border transition-all ${isEditing ? 'bg-white/10 border-white/20 text-white' : 'bg-transparent border-white/10 text-white/40 hover:text-white'}`}
            >
              <Settings size={20} />
            </button>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* INFORMACIÓN GENERAL - EXISTENTE */}
      {/* ════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        <div className="md:col-span-8 space-y-6">
          <div className="bg-white/[0.03] border border-white/10 rounded-[2.5rem] p-8 shadow-2xl space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-black uppercase tracking-tighter text-white">Información General</h3>
              {isEditing && (
                <button 
                  onClick={handleSave}
                  disabled={isSaving}
                  className="px-6 py-2 bg-sud-orange text-black font-black text-[10px] uppercase tracking-widest rounded-full hover:bg-sud-orange/80 disabled:opacity-50 transition-all"
                >
                  {isSaving ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              )}
            </div>
            
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <p className="text-[10px] uppercase font-black text-slate-600 tracking-widest mb-1">Teléfono</p>
                  <p className="text-slate-200 font-mono">{user.phone}</p>
                  <p className="text-[8px] text-slate-700 mt-1 uppercase font-bold tracking-widest italic">Solo lectura por seguridad</p>
                </div>
                
                <div>
                  <p className="text-[10px] uppercase font-black text-slate-600 tracking-widest mb-2">Email</p>
                  {isEditing ? (
                    <input 
                      type="email"
                      value={editData.email}
                      onChange={e => setEditData({...editData, email: e.target.value})}
                      className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 w-full text-white outline-none focus:border-sud-orange transition-all"
                    />
                  ) : (
                    <p className="text-slate-200">{editData.email || 'No proporcionado'}</p>
                  )}
                </div>

                <div>
                  <p className="text-[10px] uppercase font-black text-slate-600 tracking-widest mb-2">
                    {user.profileType === 'PARENT' ? 'Edad del Menor' : 'Edad'}
                  </p>
                  {isEditing ? (
                    <input 
                      type="number"
                      value={editData.age || ''}
                      onChange={e => setEditData({...editData, age: parseInt(e.target.value) || 0})}
                      className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 w-full text-white outline-none focus:border-sud-orange transition-all"
                    />
                  ) : (
                    <p className="text-slate-200 font-mono">{editData.age || 'No especificada'} años</p>
                  )}
                </div>
              </div>
              
              <div className="pt-4 border-t border-white/5">
                <p className="text-[10px] uppercase font-black text-slate-600 tracking-widest mb-2">Biografía</p>
                <p className="text-sm text-slate-400 leading-relaxed italic">
                  {profile?.bio || 'Sin biografía disponible.'}
                </p>
              </div>
            </div>
          </div>
        </div>
        
        {/* ════════════════════════════════════════════════════════════════ */}
        {/* ESTADO DEL PERFIL - EXISTENTE */}
        {/* ════════════════════════════════════════════════════════════════ */}
        <div className="md:col-span-4 space-y-6">
          <h3 className="text-xl font-black uppercase tracking-tighter text-white px-2">Estado del Perfil</h3>
          <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 space-y-6 shadow-2xl backdrop-blur-md relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-sud-yellow/5 blur-3xl rounded-full" />
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-sud-yellow/10 flex items-center justify-center">
                <div className="w-3 h-3 bg-sud-yellow rounded-full animate-pulse" />
              </div>
              <p className="text-sm font-bold text-white leading-tight uppercase tracking-widest">Revisión Pendiente</p>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed font-medium">
              Tu perfil está siendo revisado por el equipo de casting. Una vez aprobado, aparecerás en las búsquedas internas.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
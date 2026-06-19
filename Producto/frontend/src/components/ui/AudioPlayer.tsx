import React, { useRef, useState, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, Download } from 'lucide-react';

interface AudioPlayerProps {
  src: string;
  title?: string;
  onDownload?: () => void;
  showVolume?: boolean;
  compact?: boolean;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  src,
  title,
  onDownload,
  showVolume = false,
  compact = false,
}) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const volumeAreaRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [volumeHovered, setVolumeHovered] = useState(false);

  useEffect(() => {
    const el = volumeAreaRef.current;
    if (!el) return;
    const onLeave = () => setVolumeHovered(false);
    el.addEventListener('mouseleave', onLeave);
    return () => el.removeEventListener('mouseleave', onLeave);
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onMeta = () => { setDuration(audio.duration || 0); setIsLoading(false); };
    const onTime = () => setCurrentTime(audio.currentTime);
    const onEnd = () => setIsPlaying(false);
    const onErr = () => { setError('No se pudo cargar el audio'); setIsLoading(false); };
    audio.addEventListener('loadedmetadata', onMeta);
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('ended', onEnd);
    audio.addEventListener('error', onErr);
    return () => {
      audio.removeEventListener('loadedmetadata', onMeta);
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('ended', onEnd);
      audio.removeEventListener('error', onErr);
    };
  }, [src]);

  const togglePlay = async () => {
    if (!audioRef.current) return;
    try {
      if (isPlaying) { audioRef.current.pause(); }
      else { await audioRef.current.play(); }
      setIsPlaying(!isPlaying);
    } catch { setError('Error al reproducir el audio'); }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (audioRef.current) { audioRef.current.currentTime = time; setCurrentTime(time); }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    setVolume(v);
    if (audioRef.current) { audioRef.current.volume = v; audioRef.current.muted = v === 0; setMuted(v === 0); }
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    const next = !muted;
    setMuted(next);
    audioRef.current.muted = next;
  };

  const formatTime = (s: number) => {
    if (!isFinite(s)) return '0:00';
    return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`;
  };

  const effectiveVolume = muted ? 0 : volume;
  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
        <p className="text-red-400 text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className={`w-full bg-black/30 border border-white/10 rounded-xl min-w-0 overflow-hidden ${compact ? 'p-2.5' : 'p-4'}`}>
      <audio ref={audioRef} src={src} crossOrigin="anonymous" />

      <div className="flex items-center gap-2 md:gap-3">
        {/* Play */}
        <button
          type="button"
          onClick={togglePlay}
          disabled={isLoading}
          className="w-10 h-10 rounded-full bg-sud-orange/20 hover:bg-sud-orange/30 flex items-center justify-center transition-colors disabled:opacity-50 shrink-0"
        >
          {isLoading
            ? <div className="w-4 h-4 border-2 border-sud-orange/30 border-t-sud-orange rounded-full animate-spin" />
            : isPlaying
              ? <Pause size={18} className="text-sud-orange" fill="currentColor" />
              : <Play size={18} className="text-sud-orange" fill="currentColor" />}
        </button>

        {/* Tiempo actual */}
        <span className="text-xs text-slate-500 font-mono shrink-0">{formatTime(currentTime)}</span>

        {/* Progress — track custom + input nativo invisible encima */}
        <div className="relative flex-1 min-w-0 h-4 flex items-center group">
          {/* Track base */}
          <div className="absolute inset-x-0 h-1 bg-white/15 rounded-full pointer-events-none" />
          {/* Track llenado */}
          <div
            className="absolute left-0 h-1 bg-sud-orange rounded-full pointer-events-none"
            style={{ width: `${progressPct}%` }}
          />
          {/* Thumb */}
          <div
            className="absolute w-3 h-3 bg-sud-orange rounded-full shadow-md pointer-events-none -translate-x-1/2 group-hover:scale-125 transition-transform"
            style={{ left: `${progressPct}%` }}
          />
          {/* Input nativo invisible — maneja todo el drag */}
          <input
            type="range"
            min={0}
            max={duration || 0}
            step={0.01}
            value={currentTime}
            onChange={handleSeek}
            className="absolute inset-0 w-full opacity-0 cursor-pointer"
            style={{ margin: 0 }}
          />
        </div>

        {/* Duración total */}
        <span className="text-xs text-slate-500 font-mono shrink-0">{formatTime(duration)}</span>

        {/* Volumen — botón + slider estilo YouTube */}
        {showVolume && !compact && (
          <div
            ref={volumeAreaRef}
            className="flex items-center gap-1.5 shrink-0"
            onMouseEnter={() => setVolumeHovered(true)}
          >
            <button
              type="button"
              onClick={toggleMute}
              className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
              title={muted ? 'Activar sonido' : 'Silenciar'}
            >
              {effectiveVolume === 0
                ? <VolumeX size={14} className="text-slate-400" />
                : <Volume2 size={14} className="text-slate-400" />}
            </button>

            {/* Slider expandible */}
            <div
              className={`overflow-hidden transition-all duration-200 ease-out flex items-center ${
                volumeHovered ? 'w-20 opacity-100' : 'w-0 opacity-0'
              }`}
            >
              <div className="relative w-full h-4 flex items-center group/vol">
                {/* Track base */}
                <div className="absolute inset-x-0 h-1 bg-white/15 rounded-full pointer-events-none" />
                {/* Track llenado */}
                <div
                  className="absolute left-0 h-1 bg-white rounded-full pointer-events-none"
                  style={{ width: `${effectiveVolume * 100}%` }}
                />
                {/* Thumb */}
                <div
                  className="absolute w-2.5 h-2.5 bg-white rounded-full shadow-md pointer-events-none -translate-x-1/2 group-hover/vol:scale-125 transition-transform"
                  style={{ left: `${effectiveVolume * 100}%` }}
                />
                {/* Input nativo invisible */}
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.02}
                  value={effectiveVolume}
                  onChange={handleVolumeChange}
                  className="absolute inset-0 w-full opacity-0 cursor-pointer"
                  style={{ margin: 0 }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Descarga */}
        {onDownload && (
          <button
            type="button"
            onClick={onDownload}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors shrink-0"
            title="Descargar"
          >
            <Download size={14} className="text-slate-400" />
          </button>
        )}
      </div>

      {title && (
        <p className="text-[10px] text-slate-400 font-medium truncate mt-1.5">{title}</p>
      )}
    </div>
  );
};

import React, { useRef, useState, useEffect } from 'react';
import { Play, Pause, Volume2, Download } from 'lucide-react';

interface AudioPlayerProps {
  src: string;
  title?: string;
  onDownload?: () => void;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({ src, title, onDownload }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration || 0);
      setIsLoading(false);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
    };

    const handleError = () => {
      setError('No se pudo cargar el audio');
      setIsLoading(false);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
    };
  }, []);

  const togglePlay = async () => {
    if (!audioRef.current) return;
    try {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        await audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    } catch (err) {
      console.error('Error playing audio:', err);
      setError('Error al reproducir el audio');
    }
  };

  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const formatTime = (seconds: number) => {
    if (!isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
        <p className="text-red-400 text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="w-full bg-black/30 border border-white/10 rounded-lg p-4 space-y-3">
      <audio ref={audioRef} src={src} crossOrigin="anonymous" />
      
      {/* Controls row */}
      <div className="flex items-center gap-3">
        {/* Play button */}
        <button
          onClick={togglePlay}
          disabled={isLoading}
          className="w-10 h-10 rounded-full bg-sud-orange/20 hover:bg-sud-orange/30 flex items-center justify-center transition-colors disabled:opacity-50"
        >
          {isLoading ? (
            <div className="w-4 h-4 border-2 border-sud-orange/30 border-t-sud-orange rounded-full animate-spin" />
          ) : isPlaying ? (
            <Pause size={18} className="text-sud-orange" fill="currentColor" />
          ) : (
            <Play size={18} className="text-sud-orange" fill="currentColor" />
          )}
        </button>

        {/* Progress bar */}
        <div className="flex-1 flex items-center gap-2">
          <input
            type="range"
            min="0"
            max={duration || 0}
            value={currentTime}
            onChange={handleProgressChange}
            className="flex-1 h-1 bg-white/10 rounded cursor-pointer accent-sud-orange"
          />
          <span className="text-xs text-slate-500 font-mono w-12 text-right">
            {formatTime(currentTime)}
          </span>
        </div>

        {/* Duration */}
        <span className="text-xs text-slate-500 font-mono w-12">
          {formatTime(duration)}
        </span>

        {/* Download button */}
        {onDownload && (
          <button
            onClick={onDownload}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
            title="Descargar"
          >
            <Download size={14} className="text-slate-400" />
          </button>
        )}
      </div>

      {title && (
        <p className="text-xs text-slate-400 font-medium truncate">{title}</p>
      )}
    </div>
  );
};

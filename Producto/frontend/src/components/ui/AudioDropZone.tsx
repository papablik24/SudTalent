import React, { useRef, useState, useCallback } from 'react';
import { Upload, AudioLines, X, Loader } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const AUDIO_ACCEPT = 'audio/mpeg,audio/wav,audio/mp3,.mp3,.wav';
const MAX_SIZE_MB = 10;

interface AudioDropZoneProps {
  /** Archivo actualmente seleccionado (si hay uno pendiente) */
  file: File | null;
  /** Si se está subiendo */
  isUploading?: boolean;
  /** Mensaje de error */
  error?: string | null;
  /** Callback cuando el usuario elige o suelta un archivo válido */
  onFileSelected: (file: File) => void;
  /** Callback para limpiar el archivo seleccionado */
  onClear?: () => void;
  /** Texto de ayuda debajo del ícono */
  hint?: string;
}

export function AudioDropZone({
  file,
  isUploading = false,
  error,
  onFileSelected,
  onClear,
  hint = 'MP3 o WAV · Máximo 10MB',
}: AudioDropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragError, setDragError] = useState<string | null>(null);

  const validate = (f: File): string | null => {
    if (!f.type.includes('audio') && !f.name.match(/\.(mp3|wav)$/i)) {
      return 'Formato no permitido. Solo MP3 o WAV.';
    }
    if (f.size / (1024 * 1024) > MAX_SIZE_MB) {
      return `El archivo supera el límite de ${MAX_SIZE_MB}MB.`;
    }
    return null;
  };

  const handleFiles = useCallback(
    (files: FileList | null) => {
      setDragError(null);
      const f = files?.[0];
      if (!f) return;
      const err = validate(f);
      if (err) { setDragError(err); return; }
      onFileSelected(f);
    },
    [onFileSelected]
  );

  // ── Drag events ────────────────────────────────────────────────
  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const onDragLeave = (e: React.DragEvent) => {
    // Only clear if leaving the drop zone entirely
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragging(false);
    }
  };
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const displayError = dragError || error;

  return (
    <div className="space-y-2">
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => !isUploading && inputRef.current?.click()}
        className={`relative flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border-2 border-dashed cursor-pointer transition-all select-none ${
          isUploading
            ? 'border-sud-orange/30 bg-sud-orange/5 cursor-not-allowed'
            : isDragging
            ? 'border-sud-orange bg-sud-orange/10 scale-[1.01]'
            : file
            ? 'border-sud-orange/40 bg-sud-orange/5'
            : 'border-white/10 hover:border-white/25 bg-black/20'
        }`}
      >
        {isUploading ? (
          <>
            <Loader size={28} className="animate-spin text-sud-orange" />
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Subiendo...
            </p>
          </>
        ) : isDragging ? (
          <>
            <AudioLines size={32} className="text-sud-orange" />
            <p className="text-[10px] font-black uppercase tracking-widest text-sud-orange">
              Suelta el archivo aquí
            </p>
          </>
        ) : file ? (
          <>
            <AudioLines size={28} className="text-sud-orange" />
            <p className="text-[10px] font-black text-center uppercase tracking-widest text-white truncate max-w-full px-2">
              {file.name}
            </p>
            <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-sud-orange/20 text-sud-orange">
              {(file.size / (1024 * 1024)).toFixed(1)} MB
            </span>
            {onClear && (
              <button
                type="button"
                onClick={e => { e.stopPropagation(); onClear(); }}
                className="absolute top-2 right-2 p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-slate-500 hover:text-white transition-colors"
              >
                <X size={12} />
              </button>
            )}
          </>
        ) : (
          <>
            <Upload size={28} className="text-slate-600" />
            <div className="text-center">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Arrastra aquí o haz clic para seleccionar
              </p>
              <p className="text-[9px] font-bold uppercase tracking-widest text-slate-600 mt-1">
                {hint}
              </p>
            </div>
          </>
        )}

        <input
          ref={inputRef}
          type="file"
          accept={AUDIO_ACCEPT}
          onChange={e => handleFiles(e.target.files)}
          className="hidden"
          disabled={isUploading}
        />
      </div>

      <AnimatePresence>
        {displayError && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-[10px] font-black text-red-400 uppercase tracking-widest px-1 flex items-center gap-1"
          >
            <X size={12} /> {displayError}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

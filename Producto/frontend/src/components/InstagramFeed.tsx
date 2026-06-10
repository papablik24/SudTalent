import React, { useEffect, useRef } from 'react';
import { Instagram, ExternalLink } from 'lucide-react';

const INSTAGRAM_HANDLE = 'sudamericanvoices';
const INSTAGRAM_URL = `https://www.instagram.com/${INSTAGRAM_HANDLE}/`;

/**
 * Posts estáticos de @sudamericanvoices.
 * Para actualizarlos: reemplaza las URLs de cada post con las reales del perfil.
 * Formato: https://www.instagram.com/p/SHORTCODE/
 *
 * Cómo obtener el shortcode: abre el post en Instagram, copia la URL.
 * Ejemplo: https://www.instagram.com/p/C_abc123XYZ/ → shortcode = C_abc123XYZ
 */
const STATIC_POSTS = [
  {
    url: `${INSTAGRAM_URL}`,          // placeholder — reemplazar con URL real del post
    caption: 'Únete a nuestra comunidad de voces profesionales. 🎙️',
    isPlaceholder: true,
  },
  {
    url: `${INSTAGRAM_URL}`,
    caption: 'Nuevas oportunidades de casting disponibles para nuestros talentos.',
    isPlaceholder: true,
  },
  {
    url: `${INSTAGRAM_URL}`,
    caption: 'Formación, comunidad y oportunidades reales para actores de voz.',
    isPlaceholder: true,
  },
];

/** Tarjeta de post placeholder con el estilo del diseño */
function PostCard({ post, idx }: { post: typeof STATIC_POSTS[0]; idx: number }) {
  return (
    <a
      href={post.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group block bg-white/[0.03] border border-white/10 rounded-[1.5rem] overflow-hidden hover:border-white/20 hover:bg-white/[0.05] transition-all"
    >
      {/* Thumbnail placeholder con gradiente */}
      <div className={`aspect-square relative overflow-hidden ${
        idx % 3 === 0 ? 'bg-gradient-to-br from-sud-orange/20 to-black' :
        idx % 3 === 1 ? 'bg-gradient-to-br from-sud-turquoise/20 to-black' :
                        'bg-gradient-to-br from-purple-500/20 to-black'
      }`}>
        <div className="absolute inset-0 flex items-center justify-center">
          <Instagram size={40} className="text-white/10" />
        </div>
        {/* Overlay hover */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <ExternalLink size={24} className="text-white" />
        </div>
      </div>

      {/* Caption */}
      <div className="p-4 space-y-1">
        <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">{post.caption}</p>
        <p className="text-[9px] text-slate-700 uppercase font-bold tracking-widest">@{INSTAGRAM_HANDLE}</p>
      </div>
    </a>
  );
}

export function InstagramFeed() {
  return (
    <section className="bg-white/[0.03] border border-white/10 rounded-[2.5rem] p-8 shadow-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-pink-500 via-purple-500 to-orange-400 flex items-center justify-center">
            <Instagram size={20} className="text-white" />
          </div>
          <div>
            <h3 className="text-lg font-black uppercase tracking-tighter text-white">
              @{INSTAGRAM_HANDLE}
            </h3>
            <p className="text-[9px] text-slate-600 uppercase font-bold tracking-widest">Últimas publicaciones</p>
          </div>
        </div>

        <a
          href={INSTAGRAM_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-pink-500/10 to-purple-500/10 border border-pink-500/20 text-pink-400 font-black text-[10px] uppercase tracking-widest hover:from-pink-500/20 hover:to-purple-500/20 transition-all"
        >
          <ExternalLink size={13} />
          Ver perfil
        </a>
      </div>

      {/* Grid de posts */}
      <div className="grid grid-cols-3 gap-3">
        {STATIC_POSTS.map((post, i) => (
          <PostCard key={i} post={post} idx={i} />
        ))}
      </div>

      {/* Aviso actualización */}
      <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex items-start gap-3">
        <Instagram size={14} className="text-slate-600 mt-0.5 shrink-0" />
        <p className="text-[10px] text-slate-600 leading-relaxed">
          Para ver las publicaciones más recientes,{' '}
          <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer"
             className="text-pink-400 hover:underline">
            visita nuestro Instagram
          </a>
          . El feed se actualiza cuando el administrador configura la integración con la API de Meta.
        </p>
      </div>
    </section>
  );
}

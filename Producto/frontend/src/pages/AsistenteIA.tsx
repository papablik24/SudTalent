import React, { useState, useEffect, useRef } from 'react';
import { Bot, Send, Trash2, AlertTriangle, Sparkles, RefreshCw, User as UserIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ChatMessage, sendMessageToGemini } from '../services/geminiService';

export function AsistenteIA() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Detectar si la clave de API está configurada en la compilación / entorno de Vite
  const [apiKeyConfigured, setApiKeyConfigured] = useState<boolean>(true);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Verificar si la clave de API está definida al montar la vista
  useEffect(() => {
    const key = import.meta.env.VITE_GEMINI_API_KEY;
    if (!key) {
      setApiKeyConfigured(false);
    } else {
      setApiKeyConfigured(true);
      // Mensaje de bienvenida inicial
      setMessages([
        {
          role: 'model',
          text: '¡Hola! Soy tu asistente virtual de SudTalent. Te puedo ayudar a completar tu perfil de talento, darte consejos para mejorar tus demos de voz, guiarte en tus postulaciones y explicarte el funcionamiento general de la plataforma. ¿En qué te puedo colaborar hoy, po?'
        }
      ]);
    }
  }, []);

  // Hacer scroll automático al último mensaje
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading || !apiKeyConfigured) return;

    const userMessage: ChatMessage = {
      role: 'user',
      text: input.trim()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    setError(null);

    try {
      // Enviamos el historial completo para mantener el contexto básico de la conversación
      const historyToSend = [...messages, userMessage];
      const botResponse = await sendMessageToGemini(historyToSend);
      
      setMessages(prev => [...prev, { role: 'model', text: botResponse }]);
    } catch (err: any) {
      console.error('Error al enviar el mensaje:', err);
      if (err.message === 'API_KEY_MISSING') {
        setApiKeyConfigured(false);
      } else {
        setError('No se pudo obtener respuesta de la IA. Intenta nuevamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClearChat = () => {
    if (window.confirm('¿Seguro que deseas limpiar la conversación actual?')) {
      setMessages([
        {
          role: 'model',
          text: 'Historial limpio. ¿En qué más te puedo asistir sobre SudTalent?'
        }
      ]);
      setError(null);
    }
  };

  return (
    <div className="space-y-8 flex flex-col h-[calc(100vh-10rem)] max-h-[850px] relative">
      {/* Header */}
      <header className="flex justify-between items-center shrink-0">
        <div>
          <h2 className="text-3xl font-black tracking-tighter text-white">
            Asistente <span className="sud-vibrant-text-gradient uppercase tracking-widest">IA</span>
          </h2>
          <p className="text-slate-500 mt-1 font-bold text-[10px] tracking-[0.3em] uppercase">
            Soporte inteligente para tu camino en SudTalent
          </p>
        </div>
        {apiKeyConfigured && messages.length > 1 && (
          <button
            onClick={handleClearChat}
            className="sud-btn-secondary !px-4 !py-3 flex items-center gap-2 hover:text-red-400 hover:border-red-500/20"
            title="Limpiar chat"
          >
            <Trash2 size={14} />
            <span className="hidden sm:inline">Limpiar chat</span>
          </button>
        )}
      </header>

      {/* Si falta la API Key */}
      {!apiKeyConfigured ? (
        <div className="flex-1 sud-glass-panel p-8 md:p-12 flex flex-col items-center justify-center text-center space-y-6 max-w-2xl mx-auto my-auto">
          <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <AlertTriangle size={32} className="animate-pulse" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-black text-white uppercase tracking-tight">API Key no Configurada</h3>
            <p className="text-slate-400 text-sm max-w-md">
              Para habilitar el Asistente IA, debes añadir tu clave de API de Google AI Studio en el archivo de entorno del frontend.
            </p>
          </div>
          <div className="w-full bg-black/60 border border-white/5 rounded-2xl p-4 font-mono text-[11px] text-slate-300 text-left select-all">
            # Agrega esto en tu archivo Producto/frontend/.env :
            <br />
            VITE_GEMINI_API_KEY="TU_GEMINI_API_KEY_AQUÍ"
          </div>
          <button
            onClick={() => {
              const key = import.meta.env.VITE_GEMINI_API_KEY;
              if (key) {
                setApiKeyConfigured(true);
                setMessages([
                  {
                    role: 'model',
                    text: '¡Clave de API detectada! ¿En qué te puedo ayudar sobre la plataforma?'
                  }
                ]);
              } else {
                alert('No se detectó la variable VITE_GEMINI_API_KEY. Asegúrate de configurar el archivo .env del frontend y reiniciar el servidor de desarrollo.');
              }
            }}
            className="sud-btn-primary flex items-center gap-2"
          >
            <RefreshCw size={12} className="animate-spin-slow" />
            <span>Verificar Configuración</span>
          </button>
        </div>
      ) : (
        /* Ventana de Chat */
        <div className="flex-1 sud-glass-panel flex flex-col overflow-hidden">
          {/* Barra de estado del asistente */}
          <div className="px-6 py-4 border-b border-white/5 bg-white/[0.01] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-sud-turquoise/10 border border-sud-turquoise/20 flex items-center justify-center text-sud-turquoise shadow-lg shadow-sud-turquoise/5">
                <Bot size={18} />
              </div>
              <div>
                <p className="text-xs font-black uppercase text-white tracking-wide">Asistente SudTalent</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-sud-turquoise animate-pulse" />
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">En línea</span>
                </div>
              </div>
            </div>
            <span className="text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded bg-white/5 text-slate-400 border border-white/5">
              Gemini 2.5 Flash
            </span>
          </div>

          {/* Historial de Mensajes */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
            <AnimatePresence initial={false}>
              {messages.map((msg, index) => {
                const isBot = msg.role === 'model';
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className={`flex items-start gap-3 max-w-[85%] ${
                      isBot ? 'mr-auto text-left' : 'ml-auto flex-row-reverse text-right'
                    }`}
                  >
                    {/* Avatar */}
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                      isBot 
                        ? 'bg-sud-turquoise/10 border-sud-turquoise/25 text-sud-turquoise' 
                        : 'bg-sud-orange/10 border-sud-orange/25 text-sud-orange'
                    }`}>
                      {isBot ? <Bot size={15} /> : <UserIcon size={15} />}
                    </div>

                    {/* Globo del Mensaje */}
                    <div className={`p-4 rounded-2xl text-sm leading-relaxed border ${
                      isBot
                        ? 'bg-white/[0.02] border-white/5 text-slate-200 rounded-tl-sm'
                        : 'bg-sud-orange/10 border-sud-orange/10 text-white rounded-tr-sm'
                    }`}>
                      <p className="whitespace-pre-wrap">{msg.text}</p>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {/* Estado de carga / Pensando */}
            {loading && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-start gap-3 mr-auto"
              >
                <div className="w-8 h-8 rounded-lg bg-sud-turquoise/10 border border-sud-turquoise/25 flex items-center justify-center text-sud-turquoise shrink-0">
                  <Bot size={15} className="animate-pulse" />
                </div>
                <div className="p-4 rounded-2xl rounded-tl-sm bg-white/[0.02] border border-white/5 text-slate-400 text-sm flex items-center space-x-2">
                  <span>Asistente está escribiendo</span>
                  <span className="flex space-x-1 items-center h-2 mt-1">
                    <span className="w-1.5 h-1.5 bg-sud-turquoise rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-sud-turquoise rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-sud-turquoise rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </span>
                </div>
              </motion.div>
            )}

            {/* Mensaje de Error */}
            {error && (
              <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/5 text-red-400 text-xs font-bold flex items-center gap-2 max-w-md mx-auto">
                <AlertTriangle size={14} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Formulario de Entrada */}
          <form
            onSubmit={handleSend}
            className="p-4 border-t border-white/5 bg-white/[0.01] flex items-center gap-3 shrink-0"
          >
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder={loading ? 'Espera un momento...' : 'Escribe tu consulta sobre SudTalent aquí...'}
              className="sud-input flex-1 focus:border-sud-turquoise/40 focus:ring-sud-turquoise/10"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="sud-btn-primary !p-5 rounded-2xl shrink-0 flex items-center justify-center"
              style={{ minWidth: '54px', minHeight: '54px' }}
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

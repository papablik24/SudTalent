import React, { useState, useEffect, useRef } from 'react';
import { Bot, Send, Trash2, AlertTriangle, Sparkles, RefreshCw, User as UserIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ChatMessage, sendMessageToGemini } from '../services/geminiService';
import { useAuth } from '../hooks/useAuth';
import { fetchAPI, backendService } from '../services/backendService';
import { demoService } from '../services/demoService';
import { postulacionService } from '../services/postulacionService';
import { convocatoriaService } from '../services/convocatoriaService';

export function AsistenteIA() {
  const { currentUser } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userContext, setUserContext] = useState<string>('');
  
  // Detectar si la clave de API está configurada en la compilación / entorno de Vite
  const [apiKeyConfigured, setApiKeyConfigured] = useState<boolean>(true);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Cargar contexto del usuario actual
  useEffect(() => {
    const fetchUserContextData = async () => {
      if (!currentUser) return;

      try {
        let profileDetails: any = null;
        let userDemos: any[] = [];
        let userPostulaciones: any[] = [];
        let activeConvocatorias: any[] = [];
        let allUsersCount: string | number = 'No disponible';
        let allPostulacionesCount: string | number = 'No disponible';
        let allConvocatoriasCount: string | number = 'No disponible';

        const token = localStorage.getItem('sud_jwt_token') || '';

        // 1. Obtener datos de /profile
        try {
          profileDetails = await fetchAPI<any>('/profile');
        } catch (err) {
          console.warn('Error al obtener perfil, usando datos locales:', err);
        }

        // Si falló /profile o no está disponible, usar datos básicos del currentUser
        const nombre = profileDetails?.name || currentUser.name || 'No disponible';
        const rol = currentUser.role || 'No disponible';
        const tipoPerfil = profileDetails?.profileType || currentUser.profileType || 'No disponible';
        const estadoPerfil = profileDetails?.status || currentUser.status || 'No disponible';
        const edad = profileDetails?.age && profileDetails.age > 0 ? profileDetails.age : (currentUser.age || 'No disponible');
        const telefono = profileDetails?.phone || currentUser.phone || 'No disponible';
        const bio = profileDetails?.bio || currentUser.bio || 'No disponible';

        // 2. Alumno vs Admin
        if (currentUser.role === 'ADMIN') {
          // Si es ADMIN, podemos intentar cargar datos generales si están disponibles
          try {
            const users = await backendService.getAllUsers();
            allUsersCount = users.length;
          } catch {}

          try {
            const pos = await postulacionService.getAllPostulaciones();
            allPostulacionesCount = pos.length;
          } catch {}

          try {
            const conv = await convocatoriaService.getConvocatorias();
            allConvocatoriasCount = conv.length;
          } catch {}
        } else {
          // Si es Alumno/USER, cargar demos, postulaciones y convocatorias activas
          try {
            if (token) {
              userDemos = await demoService.getUserDemos(token);
            }
          } catch (err) {
            console.warn('Error al obtener demos:', err);
          }

          try {
            userPostulaciones = await postulacionService.getPostulacionesByUser(currentUser.uid);
          } catch (err) {
            console.warn('Error al obtener postulaciones:', err);
          }

          try {
            activeConvocatorias = await convocatoriaService.getConvocatoriasActivas();
          } catch (err) {
            console.warn('Error al obtener convocatorias activas:', err);
          }
        }

        // 3. Formatear el bloque de contexto
        let contextText = `DATOS DEL USUARIO ACTUAL:
- Nombre: ${nombre}
- Rol/Tipo de Perfil: ${rol} (${tipoPerfil})
- Estado de Cuenta: ${estadoPerfil}
- Edad: ${edad}
- Teléfono: ${telefono}
- Bio: ${bio}
`;

        if (currentUser.role === 'ADMIN') {
          contextText += `
DATOS GENERALES DE LA PLATAFORMA (VISTA ADMINISTRADOR):
- Total de Usuarios Registrados: ${allUsersCount}
- Total de Convocatorias en la Plataforma: ${allConvocatoriasCount}
- Total de Postulaciones en la Plataforma: ${allPostulacionesCount}
`;
        } else {
          contextText += `
DEMOS DE VOZ Y PORTAFOLIO:
- Cantidad de Demos Subidas: ${userDemos.length}
`;
          if (userDemos.length > 0) {
            contextText += `Demos actuales:\n` + userDemos.map((d, i) => `  - "${d.title}" - Categoría: ${d.category} (Formato: ${d.fileFormat || 'No disponible'}, Tamaño: ${d.fileSizeMb}MB)`).join('\n') + '\n';
          }

          contextText += `
MIS POSTULACIONES A AUDICIONES:
- Cantidad de Postulaciones: ${userPostulaciones.length}
`;
          if (userPostulaciones.length > 0) {
            contextText += `Historial de postulaciones:\n` + userPostulaciones.map((p, i) => `  - A Convocatoria: "${p.convocatoriaTitulo || 'No disponible'}" (Categoría: ${p.convocatoriaCategoria || 'No disponible'}) - Estado: ${p.estado || 'PENDIENTE'}`).join('\n') + '\n';
          }

          contextText += `
CONVOCATORIAS DISPONIBLES EN LA PLATAFORMA:
- Cantidad de Convocatorias Activas: ${activeConvocatorias.length}
`;
          if (activeConvocatorias.length > 0) {
            contextText += `Oportunidades activas:\n` + activeConvocatorias.map((c, i) => `  - Convocatoria: "${c.titulo}" (Categoría: ${c.categoria}) - Fecha Límite: ${c.fechaLimite}`).join('\n') + '\n';
          }
        }

        setUserContext(contextText);
        console.log('Contexto de usuario cargado con éxito para Asistente IA.');
      } catch (err) {
        console.error('Error al construir el contexto del Asistente IA:', err);
      }
    };

    fetchUserContextData();
  }, [currentUser]);

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
      const botResponse = await sendMessageToGemini(historyToSend, userContext);
      
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
    <div className="space-y-4 md:space-y-6 flex flex-col h-[calc(100vh-11rem)] md:h-[calc(100vh-15rem)] w-full max-w-[1400px] mx-auto px-1 sm:px-4 lg:px-6 relative">
      {/* Header */}
      <header className="flex justify-between items-center shrink-0 px-2 sm:px-0">
        <div>
          <h2 className="text-2xl md:text-3xl font-black tracking-tighter text-white light:text-slate-900">
            Asistente <span className="sud-vibrant-text-gradient uppercase tracking-widest">IA</span>
          </h2>
          <p className="text-slate-500 mt-0.5 font-bold text-[9px] md:text-[10px] tracking-[0.3em] uppercase">
            Soporte inteligente para tu camino en SudTalent
          </p>
        </div>
        {apiKeyConfigured && messages.length > 1 && (
          <button
            onClick={handleClearChat}
            className="sud-btn-secondary !px-3 !py-2 md:!px-4 md:!py-3 flex items-center gap-2 hover:text-red-400 hover:border-red-500/20"
            title="Limpiar chat"
          >
            <Trash2 size={13} />
            <span className="hidden sm:inline text-[9px] md:text-[10px]">Limpiar chat</span>
          </button>
        )}
      </header>

      {/* Si falta la API Key */}
      {!apiKeyConfigured ? (
        <div className="flex-1 sud-glass-panel p-6 md:p-12 flex flex-col items-center justify-center text-center space-y-6 max-w-2xl mx-auto my-auto w-full">
          <div className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <AlertTriangle size={28} className="animate-pulse" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg md:text-xl font-black text-white light:text-slate-900 uppercase tracking-tight">API Key no Configurada</h3>
            <p className="text-slate-400 light:text-slate-600 text-xs md:text-sm max-w-md">
              Para habilitar el Asistente IA, debes añadir tu clave de API de Google AI Studio en el archivo de entorno del frontend.
            </p>
          </div>
          <div className="w-full bg-black/60 light:bg-slate-100 border border-white/5 light:border-slate-200 rounded-2xl p-4 font-mono text-[10px] md:text-[11px] text-slate-300 light:text-slate-800 text-left select-all">
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
            className="sud-btn-primary flex items-center gap-2 !py-4"
          >
            <RefreshCw size={12} className="animate-spin-slow" />
            <span>Verificar Configuración</span>
          </button>
        </div>
      ) : (
        /* Ventana de Chat */
        <div className="flex-1 sud-glass-panel flex flex-col overflow-hidden w-full">
          {/* Barra de estado del asistente */}
          <div className="px-4 py-3 md:px-6 md:py-4 border-b border-white/5 bg-white/[0.01] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5 md:gap-3">
              <div className="w-8 h-8 md:w-9 md:h-9 rounded-xl bg-sud-turquoise/10 border border-sud-turquoise/20 flex items-center justify-center text-sud-turquoise shadow-lg shadow-sud-turquoise/5">
                <Bot size={18} />
              </div>
              <div>
                <p className="text-[11px] md:text-xs font-black uppercase text-white light:text-slate-900 tracking-wide">Asistente SudTalent</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-sud-turquoise animate-pulse" />
                  <span className="text-[8px] md:text-[9px] font-bold text-slate-500 uppercase tracking-widest">En línea</span>
                </div>
              </div>
            </div>
            <span className="text-[7px] md:text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded bg-white/5 light:bg-slate-100 text-slate-400 light:text-slate-600 border border-white/5 light:border-slate-200">
              Gemini 2.5 Flash
            </span>
          </div>

          {/* Historial de Mensajes */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 min-h-0 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
            <AnimatePresence initial={false}>
              {messages.map((msg, index) => {
                const isBot = msg.role === 'model';
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className={`flex items-start gap-2.5 md:gap-4 max-w-[92%] sm:max-w-[85%] md:max-w-[75%] ${
                      isBot ? 'mr-auto text-left' : 'ml-auto flex-row-reverse text-right'
                    }`}
                  >
                    {/* Avatar */}
                    <div className={`w-8 h-8 md:w-10 md:h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                      isBot 
                        ? 'bg-sud-turquoise/10 border-sud-turquoise/25 text-sud-turquoise' 
                        : 'bg-sud-orange/10 border-sud-orange/25 text-sud-orange'
                    }`}>
                      {isBot ? <Bot size={18} /> : <UserIcon size={18} />}
                    </div>

                    {/* Globo del Mensaje */}
                    <div className={`p-3 md:p-4 rounded-2xl text-[13px] md:text-sm leading-relaxed border ${
                      isBot
                        ? 'bg-white/[0.02] border-white/5 text-slate-200 light:text-slate-800 rounded-tl-sm shadow-md'
                        : 'bg-sud-orange/10 border-sud-orange/15 text-white light:text-slate-950 rounded-tr-sm shadow-md'
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
                className="flex items-start gap-2.5 md:gap-4 max-w-[90%] mr-auto"
              >
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-sud-turquoise/10 border border-sud-turquoise/25 flex items-center justify-center text-sud-turquoise shrink-0">
                  <Bot size={18} className="animate-pulse" />
                </div>
                <div className="p-3 md:p-4 rounded-2xl rounded-tl-sm bg-white/[0.02] border border-white/5 text-slate-400 light:text-slate-600 text-[13px] md:text-sm flex items-center space-x-2 shadow-md">
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
              <div className="p-3 md:p-4 rounded-xl border border-red-500/20 bg-red-500/5 text-red-400 text-xs font-bold flex items-center gap-2 max-w-md mx-auto">
                <AlertTriangle size={14} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Formulario de Entrada */}
          <form
            onSubmit={handleSend}
            className="p-3 md:p-4 border-t border-white/5 bg-white/[0.01] flex items-center gap-2.5 md:gap-3 shrink-0"
          >
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder={loading ? 'Espera un momento...' : 'Escribe tu consulta sobre SudTalent aquí...'}
              className="sud-input flex-1 focus:border-sud-turquoise/40 focus:ring-sud-turquoise/10 !p-3.5 md:!p-5 text-sm"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="sud-btn-primary rounded-2xl shrink-0 flex items-center justify-center cursor-pointer w-[46px] h-[46px] md:w-[54px] md:h-[54px] !p-0"
            >
              <Send size={18} />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

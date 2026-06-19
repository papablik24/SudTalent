import { GoogleGenAI } from '@google/genai';

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

// Inicializamos el cliente si la API key está disponible
// Si no, lo inicializaremos bajo demanda o lanzaremos un error descriptivo
let ai: GoogleGenAI | null = null;

if (apiKey) {
  ai = new GoogleGenAI({ apiKey });
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

const SYSTEM_INSTRUCTION = `
Eres el asistente de Inteligencia Artificial interno de SudTalent (Sudamerican Voices).
Tu objetivo es ayudar a alumnos (talento), profesores y administradores a comprender, navegar y utilizar la plataforma de manera óptima, entregando respuestas altamente personalizadas utilizando los datos del contexto provisto.

### FORMATO DE RESPUESTA EXIGIDO (PROHIBIDO EL USO DE MARKDOWN CRUDO):
- PROHIBIDO EL USO DE ASTERISCOS: Nunca respondas usando asteriscos ni almohadillas para títulos o subtítulos. La UI del chat muestra texto plano y no renderiza Markdown.
- Usa formato de texto plano simple y ordenado:
  - Escribe títulos de sección en mayúsculas simples seguidos de dos puntos (por ejemplo, "RECOMENDACIÓN PRINCIPAL:" o "PASOS A SEGUIR:").
  - Para listas, usa listas numeradas simples (1., 2., 3.) o guiones simples (- ).
  - Divide la información en párrafos cortos y limpios.

### DIRECTRICES PARA EL USO DE INFORMACIÓN:
- TIENES ACCESO COMPLETO AL CONTEXTO: Si el bloque "Contexto real de SudTalent" incluye cursos, demos, postulaciones, convocatorias o perfil, TIENES esa información. Nunca digas "no tengo acceso" si los datos vienen en el contexto.
- Manejo de vacíos: Solo si un dato viene marcado como "No disponible" o vacío, puedes indicar que no hay registro de ese elemento.

### CONOCIMIENTO COMPLETO DE LA PLATAFORMA SUDTALENT:

SudTalent es una aplicación cerrada y exclusiva para la comunidad de Sudamerican Voices. El acceso está controlado por una lista blanca (whitelist) de números de teléfono autorizados. Solo los alumnos cuyo número esté en la whitelist pueden registrarse y acceder.

MÓDULOS PRINCIPALES:
1. Panel de Control / Dashboard - Estadísticas globales (solo ADMIN).
2. Gestión Alumnos / Lista de Acceso - Whitelist y perfiles de alumnos (solo ADMIN).
3. Revisión Casting / Talent Review - Aprobación de perfiles de talento (solo ADMIN).
4. Convocatorias Admin - Crear, editar y gestionar convocatorias de casting (solo ADMIN).
5. Postulaciones - Ver y gestionar todas las postulaciones recibidas (solo ADMIN).
6. Profesores - Gestionar perfiles y cursos de profesores (solo ADMIN).
7. Cursos Admin - Gestionar el catálogo de cursos (solo ADMIN).
8. Reportería - Exportar reportes de alumnos en PDF y Excel (solo ADMIN).
9. Asistente IA - Chat con inteligencia artificial para soporte interno (todos los roles).
10. Convocatorias Usuario - Ver convocatorias activas y postularse (solo USER/alumno).
11. Mis Demos - Subir y gestionar demos de voz o video (solo USER/alumno).
12. Mis Postulaciones - Ver estado de postulaciones propias (solo USER/alumno).
13. Mi Perfil - Completar y editar el perfil de talento (solo USER/alumno).
14. Cursos Usuario - Ver cursos disponibles e inscritos (solo USER/alumno).
15. Panel del Profesor - Ver cursos asignados y agenda (solo PROFESOR).

GESTIÓN DE LA WHITELIST (LISTA BLANCA):
- La whitelist controla quién puede registrarse y acceder a SudTalent.
- Solo administradores pueden agregar, editar o eliminar números.
- Ruta: Admin → Gestión Alumnos → Lista de Acceso.

HERRAMIENTA "IMPORTAR WHATSAPP" (solo ADMIN):
Esta herramienta YA EXISTE en la plataforma. No es necesario contactar al equipo técnico para importar números masivamente. Para usarla:

PASOS:
1. Ir a Admin → Gestión Alumnos → Lista de Acceso.
2. Hacer clic en el botón "Importar WhatsApp" (parte superior derecha de la tabla de alumnos).
3. Se abre el modal "Importar desde WhatsApp" con dos métodos de entrada:

MÉTODO 1 - Importar desde imagen (con IA):
- Subir una captura de pantalla de WhatsApp Web (formatos: PNG, JPG, WEBP; máximo 5 MB).
- La IA analiza la imagen y extrae automáticamente los nombres y teléfonos visibles.
- El resultado se vuelca al área de texto para que el administrador lo revise antes de continuar.
- Recomendación: usar capturas claras con buen zoom y números legibles.

MÉTODO 2 - Texto manual:
- Pegar directamente el texto copiado de WhatsApp, una lista de contactos o cualquier texto con números.
- El sistema detecta automáticamente formatos como: "+56 9 XXXX XXXX Nombre", "XXXXXXXX - Nombre", mensajes de chat, listas exportadas, etc.

FLUJO DESPUÉS DE INGRESAR EL TEXTO (ambos métodos):
4. Hacer clic en "Analizar".
5. El sistema normaliza los números chilenos, detecta duplicados y números ya existentes en la whitelist, y marca los inválidos.
6. Se muestra una previsualización con el estado de cada número: Listo, Duplicado, Ya existe, Inválido.
7. El administrador puede editar nombres y marcar o desmarcar contactos individualmente.
8. Al hacer clic en "Importar Seleccionados", solo se guardan los contactos elegidos.
9. Se muestra un resumen: cuántos se agregaron y cuántos se omitieron con la razón.
10. NADA se guarda automáticamente. El administrador siempre revisa y confirma antes de guardar.

AGREGAR UN ALUMNO MANUALMENTE (uno por uno):
- En la misma sección Admin → Gestión Alumnos, en el panel izquierdo "Añadir Nuevo Alumno".
- Completar: nombre, número de teléfono, correo y categoría.
- Hacer clic en "Autorizar Alumno".

CONVOCATORIAS:
- Los admins crean convocatorias con: título, descripción, categoría, género visual, requisitos, fecha de apertura y fecha límite.
- Estados posibles: Borrador, Activa, Cerrada, Plazo Vencido.
- Los alumnos ven solo las activas y pueden postularse adjuntando una demo de voz.
- Ruta admin: Admin → Convocatorias.
- Ruta alumno: Convocatorias / Oportunidades Laborales.

POSTULACIONES:
- El alumno adjunta una demo de voz existente al postularse.
- Admins gestionan todo desde Admin → Postulaciones.
- El alumno ve el estado desde Mis Postulaciones (estados: Pendiente, En revisión, Aprobada, Rechazada).

DEMOS DE VOZ:
- Alumnos suben demos desde "Mis Demos" (audio o video).
- Cada demo tiene: título, categoría, género visual, descripción, formato.
- La IA no puede escuchar los archivos reales; solo analiza metadatos.

### INSTRUCCIONES ESPECÍFICAS POR ROL:

#### 1. Para ALUMNOS (Rol USER):
Cuando pregunten por recomendaciones de curso, convocatoria o demo:
- Usa esta estructura:
  RECOMENDACIÓN PRINCIPAL:
  (qué curso, convocatoria o demo sugieres)

  POR QUÉ TE CONVIENE:
  (relación con sus demos, postulaciones o cursos del contexto)

  QUÉ TE FALTA MEJORAR:
  (brechas del perfil)

  PRÓXIMO PASO DENTRO DE SUDTALENT:
  (qué sección visitar y qué hacer)

#### 2. Para PROFESORES (Rol PROFESOR):
- Responde con estructura clara en texto plano.
- Entrega material listo para copiar y adaptar (planes de clase, plantillas de feedback).
- No prometas acciones automáticas. Solo asesora.

#### 3. Para ADMINISTRADORES (Rol ADMIN):
- Conoces todas las funcionalidades y módulos de la plataforma.
- Siempre indica la ruta exacta: "Ve a Admin → [Módulo] → [Acción]".
- NUNCA digas "contacta al equipo técnico" si la funcionalidad existe en la plataforma.
- Si la tarea requiere un rol específico, indícalo claramente.
- Asiste en redacción de convocatorias y análisis de estadísticas.

### RESTRICCIONES CRÍTICAS:
- NO realices acciones automáticas: no puedes importar números, crear convocatorias, enviar correos, inscribir cursos ni postular. Solo orientas y guías al usuario a usar las herramientas de la interfaz.
- NO analices audio real: solo usas metadatos de demos. Acláralo en tus recomendaciones.
- NO expongas datos sensibles de alumnos a otros roles.
- Tono: español neutro latinoamericano, profesional, cercano y claro. Sin modismos locales (prohibido usar "po", "cachai", "compa", "colega", etc.).
`;

export async function sendMessageToGemini(history: ChatMessage[], userContext?: string): Promise<string> {
  const currentKey = import.meta.env.VITE_GEMINI_API_KEY;

  if (!currentKey) {
    throw new Error('API_KEY_MISSING');
  }

  // Si no se había inicializado (por ejemplo si se añadió la key dinámicamente) o si cambió, re-inicializamos
  if (!ai) {
    ai = new GoogleGenAI({ apiKey: currentKey });
  }

  try {
    // Convertir el historial al formato que requiere el SDK @google/genai
    const contents = history.map(msg => ({
      role: msg.role,
      parts: [{ text: msg.text }]
    }));

    // Inyectar el bloque "Contexto real de SudTalent" en el prompt del sistema
    const finalInstruction = `
${SYSTEM_INSTRUCTION.trim()}

### Contexto real de SudTalent
${userContext || 'No hay información de contexto del usuario disponible actualmente.'}

Instrucciones adicionales:
- No utilices NINGÚN tipo de formato markdown en tu respuesta (nada de **, *, #, ###, etc.). Todo debe ser texto plano puro.
- Si hay datos de perfil, demos, postulaciones, convocatorias o cursos en el "Contexto real de SudTalent" de arriba, úsalos para estructurar tu respuesta. No le digas al usuario "no tengo acceso" o "no puedo ver tu información" para estos datos, ya que están provistos en tu contexto y los puedes leer perfectamente.
- Mantén las respuestas claras, ordenadas, utilizando saltos de línea y listas numeradas para legibilidad en texto plano.
- Recuerda que no evalúas el archivo de audio real de las demos, sino sus metadatos (título, descripción, categoría, etc.), e indícalo al usuario de manera profesional.
`.trim();

    let response;
    try {
      response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: contents,
        config: {
          systemInstruction: finalInstruction,
          temperature: 0.7,
        }
      });
    } catch (firstError) {
      console.warn('⚠️ Primera llamada fallida a Gemini, reintentando en 300ms...', firstError);
      await new Promise(resolve => setTimeout(resolve, 300));
      response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: contents,
        config: {
          systemInstruction: finalInstruction,
          temperature: 0.7,
        }
      });
    }

    if (!response || !response.text) {
      throw new Error('No se recibió texto de respuesta de la IA.');
    }

    // Limpieza de Markdown residual en texto plano
    const cleanedText = response.text
      .replace(/\*\*/g, '')      // Eliminar negritas con asteriscos
      .replace(/\*/g, '')        // Eliminar asteriscos sueltos
      .replace(/###?\s+/g, '')   // Eliminar encabezados markdown
      .replace(/__+/g, '')       // Eliminar guiones bajos de cursiva/negrita
      .replace(/`{3,}/g, '')     // Eliminar bloques de código markdown
      .trim();

    return cleanedText;
  } catch (error: any) {
    console.error('Error al comunicarse con Gemini:', error);
    throw error;
  }
}

/**
 * Extrae nombres y teléfonos visibles desde una imagen de captura de WhatsApp.
 * Devuelve texto plano con formato "Nombre - Teléfono" (una línea por contacto).
 */
export async function extractPhoneContactsFromImage(imageFile: File): Promise<string> {
  const currentKey = import.meta.env.VITE_GEMINI_API_KEY;

  if (!currentKey) {
    throw new Error('API_KEY_MISSING');
  }

  if (!ai) {
    ai = new GoogleGenAI({ apiKey: currentKey });
  }

  // Convertir el archivo a base64
  const arrayBuffer = await imageFile.arrayBuffer();
  const uint8 = new Uint8Array(arrayBuffer);
  let binary = '';
  for (let i = 0; i < uint8.length; i++) {
    binary += String.fromCharCode(uint8[i]);
  }
  const base64 = btoa(binary);

  const mimeType = imageFile.type as 'image/png' | 'image/jpeg' | 'image/webp';

  const prompt = `Analiza esta imagen de captura de pantalla de WhatsApp Web o similar.
Tu única tarea es extraer TODOS los nombres y números de teléfono visibles en la imagen.
Devuelve SOLO el texto plano, sin explicaciones, sin markdown, sin encabezados.
Formato estricto de salida (una línea por contacto):
Nombre - Número

Si no hay nombre visible para un teléfono, usa "Desconocido" como nombre.
Si solo hay teléfonos sin nombres, lista el teléfono igual.
Si no encuentras ningún número de teléfono, responde únicamente con el texto: SIN_CONTACTOS`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                mimeType,
                data: base64,
              },
            },
            { text: prompt },
          ],
        },
      ],
    });

    if (!response || !response.text) {
      throw new Error('No se recibió respuesta de la IA.');
    }

    return response.text.trim();
  } catch (error: any) {
    console.error('Error al extraer contactos desde imagen con Gemini:', error);
    throw error;
  }
}

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
Tu objetivo es ayudar a alumnos, profesores y administradores a comprender y utilizar la plataforma de manera óptima.

Tus tareas principales e información sobre la que puedes guiar:
1. **Uso de la Plataforma:** Explica cómo navegar por la app, completar el perfil de talento, subir o gestionar demos y realizar postulaciones a convocatorias activas.
2. **Perfil de Talento:** Orienta sobre qué campos son importantes (especialidades, edad, descripción personal, etc.) y cómo completarlo.
3. **Demos de Voz:** Ofrece recomendaciones prácticas para mejorar la calidad de las demos de voz (grabación en espacios silenciosos, entonación, modulación, uso de micrófonos adecuados, evitar eco y ruidos molestos).
4. **Convocatorias y Postulaciones:** Ayuda a comprender qué es una postulación y cómo aplicar a las convocatorias de voz disponibles.
5. **Recomendaciones de Presentación:** Sugiere cómo mejorar la descripción o presentación general en el perfil para llamar más la atención de los directores de casting.

Restricciones críticas:
- NO inventes datos reales de usuarios, convocatorias, demos, profesores o administradores si no los tienes disponibles.
- Si un usuario te pregunta por datos específicos de los cuales no hay registro en el contexto (por ejemplo, notas de demos específicas, contraseñas, etc.), debes responder de manera educada que no tienes acceso en tiempo real a esa información específica y que deben revisarlo en sus respectivas secciones.
- Responde siempre en español de Chile o neutro latinoamericano, con un tono amable, profesional, cercano, claro y de forma breve (evita textos excesivamente largos).
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

Instrucciones para responder con base en el contexto:
- Si el usuario te pregunta cosas como "¿Qué me falta en mi perfil?" o "¿Mi perfil está completo?", analiza los datos reales de arriba: comprueba si la edad, el teléfono o la biografía están como "No disponible" o vacíos, o si la cantidad de demos es 0. Indícales cuáles de estos datos faltan y sugiéreles ir a "Mi Perfil" para completarlos.
- Si te preguntan "¿Tengo demos subidas?", responde usando la sección "DEMOS DE VOZ Y PORTAFOLIO" indicando la cantidad y nombres de las demos si están presentes.
- Si te preguntan "¿Qué puedo mejorar para postular?", sugiéreles completar su perfil y subir demos pertinentes al área que les interese de doblaje/locución.
- Si te preguntan "¿Dónde puedo ver mis convocatorias?", explícales que pueden verlas en la sección "Oportunidades" de la barra lateral, y sus postulaciones enviadas en "Mis Postulaciones".
- Nunca inventes datos que no figuren en el bloque "Contexto real de SudTalent". Si no se indica alguna postulación o convocatoria en la lista de arriba, asume que no hay o di amablemente que no posees ese dato en particular.
`.trim();

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: contents,
      config: {
        systemInstruction: finalInstruction,
        temperature: 0.7,
      }
    });

    if (!response || !response.text) {
      throw new Error('No se recibió texto de respuesta de la IA.');
    }

    return response.text;
  } catch (error: any) {
    console.error('Error al comunicarse con Gemini:', error);
    throw error;
  }
}

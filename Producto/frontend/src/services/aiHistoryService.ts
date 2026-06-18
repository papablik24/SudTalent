import { fetchAPI } from './backendService';
import { ChatMessage } from './geminiService';

export interface AiChatMessage {
  id?: string;
  role: 'user' | 'model';
  content: string;
  contextSummary?: string;
  createdAt?: string;
}

export const aiHistoryService = {
  async getHistory(): Promise<ChatMessage[]> {
    const raw = await fetchAPI<AiChatMessage[]>('/ai/history/me');
    return (raw || []).map(msg => ({
      role: msg.role === 'model' ? 'model' : 'user',
      text: msg.content
    }));
  },

  async addMessage(role: 'user' | 'model', content: string, contextSummary?: string): Promise<void> {
    await fetchAPI<AiChatMessage>('/ai/history/me', {
      method: 'POST',
      body: JSON.stringify({ role, content, contextSummary })
    });
  },

  async clearHistory(): Promise<void> {
    await fetchAPI<void>('/ai/history/me', {
      method: 'DELETE'
    });
  },

  async logQuery(pregunta: string, respuesta: string, contextoUsado: string, estado: 'SUCCESS' | 'ERROR'): Promise<void> {
    await fetchAPI<void>('/ai/log', {
      method: 'POST',
      body: JSON.stringify({ pregunta, respuesta, contextoUsado, estado })
    });
  }
};

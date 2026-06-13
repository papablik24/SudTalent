/**
 * 🎥 Demo Service - Manejo de demostraciones de voz/video
 * Similar a audioService pero para demos de portfolio
 */

export interface DemoUploadResult {
  id: string;
  fileUrl: string;
  storagePath: string;
  title: string;
  mediaType: 'AUDIO' | 'VIDEO';
  fileFormat: string;
  durationSeconds: number | null;
  fileSizeMb: number;
  createdAt: string;
  visualGenre?: string;
}

export interface DemoDTO extends DemoUploadResult {
  category: string;
  isPublic: boolean;
  updatedAt: string;
}

const API_URL = 'http://localhost:8080/api/demos';

export const demoService = {
  /**
   * 📤 Subir una demo (audio o video)
   */
  async uploadDemo(
    file: File,
    category: string = 'Doblaje',
    title?: string,
    token?: string,
    visualGenre?: string
  ): Promise<DemoUploadResult> {
    try {
      console.log('1️⃣ Iniciando uploadDemo...');
      console.log('   - Archivo:', file.name, `(${(file.size / 1024 / 1024).toFixed(2)}MB)`);
      console.log('   - Tipo:', file.type);
      console.log('   - Categoría:', category);
      console.log('   - Género Visual:', visualGenre);
      console.log('   - Token present:', !!token);

      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      const formData = new FormData();
      formData.append('file', file);
      formData.append('category', category);
      if (title) formData.append('title', title);
      if (visualGenre) formData.append('visualGenre', visualGenre);

      const uploadUrl = `${API_URL}/upload`;
      console.log('2️⃣ URL de upload:', uploadUrl);
      console.log('3️⃣ Enviando request...');

      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      console.log('4️⃣ Response recibida:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('   ❌ Error response body:', errorData);
        throw new Error(errorData?.error || `Error ${response.status}`);
      }

      const result: DemoDTO = await response.json();
      console.log('5️⃣ ✅ Demo subida:', result);

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      console.error('❌ Error en uploadDemo:', errorMessage);
      throw error;
    }
  },

  /**
   * 📋 Obtener todas las demos del usuario
   */
  async getUserDemos(token: string, category?: string): Promise<DemoDTO[]> {
    try {
      console.log('1️⃣ Obteniendo demos del usuario...');

      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      const url = new URL(API_URL);
      if (category) url.searchParams.append('category', category);

      console.log('2️⃣ URL:', url.toString());

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}`);
      }

      const demos: DemoDTO[] = await response.json();
      console.log('3️⃣ ✅ Demos obtenidas:', demos.length);

      return demos;
    } catch (error) {
      console.error('❌ Error en getUserDemos:', error);
      throw error;
    }
  },

  /**
   * 📥 Descargar una demo
   */
  async downloadDemo(demoUrl: string, filename: string): Promise<void> {
    try {
      console.log('📥 Descargando demo:', filename);

      const response = await fetch(demoUrl);
      if (!response.ok) throw new Error('Error al descargar');

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      console.log('✅ Demo descargada');
    } catch (error) {
      console.error('❌ Error descargando:', error);
      throw error;
    }
  },

  /**
   * 🗑️ Eliminar una demo
   */
  async deleteDemo(demoId: string, token: string): Promise<void> {
    try {
      console.log('🗑️ Eliminando demo:', demoId);

      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      const response = await fetch(`${API_URL}/${demoId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}`);
      }

      console.log('✅ Demo eliminada');
    } catch (error) {
      console.error('❌ Error eliminando:', error);
      throw error;
    }
  },
};

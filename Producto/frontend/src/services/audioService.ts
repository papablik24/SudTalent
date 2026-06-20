import { supabase } from './supabaseClient';

const API_URL = import.meta.env.VITE_BACKEND_URL
  || (import.meta.env.DEV ? 'http://localhost:8080/api' : 'https://sud-talent.up.railway.app/api');
const SUPABASE_PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID || ''

console.log('🔗 API_URL configurada como:', API_URL)

/**
 * Servicio centralizado para gestionar audios del usuario
 */
export const audioService = {
  /**
   * 📤 Subir audio a Supabase Storage + Backend
   */
  uploadAudio: async (
    file: File,
    category: 'profile' | 'demo' = 'profile',
    token: string
  ): Promise<{ fileUrl: string; storagePath: string }> => {
    try {
      console.log('1️⃣ Iniciando uploadAudio...')
      console.log('   - Archivo:', file.name, `(${(file.size / 1024 / 1024).toFixed(2)}MB)`)
      console.log('   - Tipo:', file.type)
      console.log('   - Categoría:', category)
      console.log('   - Token present:', !!token, `(${token?.substring(0, 20)}...)`)

      const formData = new FormData()
      formData.append('file', file)
      formData.append('category', category)
      formData.append('title', file.name)

      const uploadUrl = `${API_URL}/voice-audios/upload?category=${category}`
      console.log('2️⃣ URL de upload:', uploadUrl)

      console.log('3️⃣ Enviando request...')
      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      })

      console.log('4️⃣ Response recibida:', response.status, response.statusText)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'No se pudo parsear error' }))
        console.error('   ❌ Error response body:', errorData)
        throw new Error(errorData.error || `Error HTTP ${response.status}`)
      }

      const data = await response.json()
      console.log('5️⃣ ✅ Audio subido:', data)
      return {
        fileUrl: data.fileUrl,
        storagePath: data.storagePath
      }
    } catch (error) {
      console.error('❌ Error en uploadAudio:', error)
      if (error instanceof TypeError) {
        console.error('   📌 Esto podría ser un error de CORS o conexión de red')
      }
      throw error
    }
  },

  /**
   * 📥 Descargar audio
   */
  downloadAudio: async (audioUrl: string, filename: string) => {
    try {
      const response = await fetch(audioUrl)
      const blob = await response.blob()
      const downloadUrl = URL.createObjectURL(blob)

      const a = document.createElement('a')
      a.href = downloadUrl
      a.download = filename
      a.click()

      URL.revokeObjectURL(downloadUrl)
    } catch (error) {
      console.error('❌ Error descargando audio:', error)
    }
  },

  /**
   * 📋 Obtener audios del usuario
   */
  getUserAudios: async (token: string, category?: string) => {
    try {
      console.log('📋 Obteniendo audios. Categoría:', category || 'todas')
      console.log('   Token present:', !!token)
      
      const url = category
        ? `${API_URL}/voice-audios?category=${category}`
        : `${API_URL}/voice-audios`

      console.log('   URL:', url)

      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      console.log('   Response:', response.status, response.statusText)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'No se pudo parsear error' }))
        throw new Error(errorData.error || 'Error obteniendo audios')
      }
      
      const data = await response.json()
      console.log('   ✅ Audios obtenidos:', data.length || data)
      return data
    } catch (error) {
      console.error('❌ Error en getUserAudios:', error)
      throw error
    }
  },

  /**
   * 🗑️ Eliminar audio
   */
  deleteAudio: async (audioId: string, token: string) => {
    try {
      const response = await fetch(`${API_URL}/voice-audios/${audioId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (!response.ok) throw new Error('Error eliminando audio')
      return await response.json()
    } catch (error) {
      console.error('❌ Error en deleteAudio:', error)
      throw error
    }
  }
}
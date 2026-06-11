package sudtalent.sudtalentproyecto.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URI;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.UUID;

@Service
public class SupabaseStorageService {

    @Value("${app.supabase.url:}")
    private String supabaseUrl;

    @Value("${app.supabase.service-role-key:}")
    private String supabaseServiceRoleKey;

    @Value("${app.supabase.project-id:}")
    private String supabaseProjectId;

    /**
     * 📤 Subir archivo a Supabase Storage usando HttpURLConnection
     */
    public String uploadFile(
            String bucketName,
            UUID userId,
            MultipartFile file) throws IOException {
        return uploadFile(bucketName, userId, file, "audios");
    }

    /**
     * 📤 Subir archivo a Supabase Storage con prefijo de carpeta personalizado
     */
    public String uploadFile(
            String bucketName,
            UUID userId,
            MultipartFile file,
            String folderPrefix) throws IOException {

        try {
            // 1️⃣ Validar credenciales
            if (supabaseUrl == null || supabaseUrl.isEmpty()) {
                System.err.println("❌ SUPABASE_URL no configurado");
                throw new IOException("SUPABASE_URL no configurado");
            }
            if (supabaseServiceRoleKey == null || supabaseServiceRoleKey.isEmpty()) {
                System.err.println("❌ SUPABASE_SERVICE_ROLE_KEY no configurado");
                throw new IOException("SUPABASE_SERVICE_ROLE_KEY no configurado");
            }

            // 2️⃣ Construir ruta del archivo
            String filename = System.currentTimeMillis() + "-" + sanitizeFilename(file.getOriginalFilename());
            String storagePath = String.format("%s/%s/%s", folderPrefix, userId, filename);

            // 3️⃣ Construir URL de Supabase Storage
            // Codificar solo el filename, mantener barras para la estructura de directorios
            String[] pathParts = storagePath.split("/");
            StringBuilder encodedPath = new StringBuilder();
            for (int i = 0; i < pathParts.length; i++) {
                if (i > 0) encodedPath.append("/");
                encodedPath.append(URLEncoder.encode(pathParts[i], StandardCharsets.UTF_8));
            }
            
            String uploadUrl = String.format(
                    "%s/storage/v1/object/%s/%s",
                    supabaseUrl,
                    bucketName,
                    encodedPath
            );

            System.out.println("📤 Preparando upload a Supabase...");
            System.out.println("   URL: " + uploadUrl);
            System.out.println("   Archivo: " + file.getOriginalFilename() + " (" + file.getSize() + " bytes)");

            // 4️⃣ Crear conexión HTTP
            HttpURLConnection connection = (HttpURLConnection) URI.create(uploadUrl).toURL().openConnection();
            connection.setRequestMethod("PUT");  // ⚠️ Supabase Storage usa PUT, no POST
            connection.setDoOutput(true);
            connection.setConnectTimeout(10000);
            connection.setReadTimeout(10000);

            // 5️⃣ Establecer headers
            byte[] fileBytes = file.getBytes();
            connection.setRequestProperty("Authorization", "Bearer " + supabaseServiceRoleKey);
            connection.setRequestProperty("Content-Type", file.getContentType() != null ? file.getContentType() : "audio/mpeg");
            connection.setRequestProperty("Content-Length", String.valueOf(fileBytes.length));
            connection.setRequestProperty("x-upsert", "true");  // ⚠️ Usar true para permitir sobrescribir

            // 6️⃣ Enviar archivo
            try (OutputStream os = connection.getOutputStream()) {
                os.write(fileBytes);
                os.flush();
            }

            // 7️⃣ Verificar respuesta
            int responseCode = connection.getResponseCode();
            System.out.println("   Respuesta: " + responseCode);

            if (responseCode < 200 || responseCode >= 300) {
                System.err.println("❌ Error de Supabase (código " + responseCode + ")");
                
                // Leer respuesta de error
                try (java.io.InputStream errorStream = connection.getErrorStream()) {
                    if (errorStream != null) {
                        String errorBody = new String(errorStream.readAllBytes(), StandardCharsets.UTF_8);
                        System.err.println("   Error Response: " + errorBody);
                    }
                } catch (Exception e) {
                    System.err.println("   No se pudo leer error response");
                }
                
                throw new IOException("Supabase Storage retornó: " + responseCode);
            }

            connection.disconnect();

            System.out.println("✅ Archivo subido exitosamente a Supabase");
            System.out.println("   Storage Path: " + storagePath);
            return storagePath;

        } catch (IOException e) {
            System.err.println("❌ Error en uploadFile: " + e.getMessage());
            e.printStackTrace();
            throw e;
        } catch (Exception e) {
            System.err.println("❌ Error inesperado en uploadFile: " + e.getMessage());
            e.printStackTrace();
            throw new IOException("Error subiendo a Supabase Storage: " + e.getMessage(), e);
        }
    }

    /**
     * Sanitizar nombre de archivo
     */
    private String sanitizeFilename(String filename) {
        if (filename == null) {
            return "audio-" + System.currentTimeMillis() + ".mp3";
        }
        // Remover caracteres especiales
        return filename.replaceAll("[^a-zA-Z0-9._-]", "_");
    }

    /**
     * 📤 Subir avatar de usuario con nombre fijo (sobreescribe el anterior).
     * La ruta es: avatars/{userId}/avatar.{ext}
     */
    public String uploadAvatar(String bucketName, UUID userId, MultipartFile file, String ext) throws IOException {
        String storagePath = String.format("avatars/%s/avatar.%s", userId, ext);

        if (supabaseUrl == null || supabaseUrl.isEmpty()) throw new IOException("SUPABASE_URL no configurado");
        if (supabaseServiceRoleKey == null || supabaseServiceRoleKey.isEmpty()) throw new IOException("SUPABASE_SERVICE_ROLE_KEY no configurado");

        String[] pathParts = storagePath.split("/");
        StringBuilder encodedPath = new StringBuilder();
        for (int i = 0; i < pathParts.length; i++) {
            if (i > 0) encodedPath.append("/");
            encodedPath.append(URLEncoder.encode(pathParts[i], StandardCharsets.UTF_8));
        }

        String uploadUrl = String.format("%s/storage/v1/object/%s/%s", supabaseUrl, bucketName, encodedPath);

        HttpURLConnection connection = (HttpURLConnection) URI.create(uploadUrl).toURL().openConnection();
        connection.setRequestMethod("PUT");
        connection.setDoOutput(true);
        connection.setConnectTimeout(10000);
        connection.setReadTimeout(10000);

        byte[] fileBytes = file.getBytes();
        connection.setRequestProperty("Authorization", "Bearer " + supabaseServiceRoleKey);
        connection.setRequestProperty("Content-Type", file.getContentType() != null ? file.getContentType() : "image/jpeg");
        connection.setRequestProperty("Content-Length", String.valueOf(fileBytes.length));
        connection.setRequestProperty("x-upsert", "true"); // sobreescribe

        try (OutputStream os = connection.getOutputStream()) {
            os.write(fileBytes);
            os.flush();
        }

        int responseCode = connection.getResponseCode();
        connection.disconnect();

        if (responseCode < 200 || responseCode >= 300) {
            throw new IOException("Supabase Storage retornó: " + responseCode);
        }

        System.out.println("✅ Avatar subido: " + storagePath);
        return storagePath;
    }

    /**
     * Construir URL pública de un archivo en Supabase Storage
     */
    public String buildPublicUrl(String bucketName, String storagePath) {
        return String.format(
                "https://%s.supabase.co/storage/v1/object/public/%s/%s",
                supabaseProjectId,
                bucketName,
                storagePath
        );
    }
}
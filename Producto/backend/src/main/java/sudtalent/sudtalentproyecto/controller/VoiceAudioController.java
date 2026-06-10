package sudtalent.sudtalentproyecto.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import sudtalent.sudtalentproyecto.model.User;
import sudtalent.sudtalentproyecto.dto.VoiceAudioDTO;
import sudtalent.sudtalentproyecto.service.VoiceAudioService;
import sudtalent.sudtalentproyecto.repository.UserRepository;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/voice-audios")
@CrossOrigin(origins = "${app.cors.allowed-origins}")
public class VoiceAudioController {

    @Autowired
    private VoiceAudioService voiceAudioService;

    @Autowired
    private UserRepository userRepository;

    /**
     * Obtener usuario autenticado desde SecurityContextHolder
     */
    private User getAuthenticatedUser() {
        try {
            // Obtener el nombre (email) del usuario autenticado
            String email = SecurityContextHolder.getContext()
                    .getAuthentication()
                    .getName();

            if (email == null || email.isEmpty() || "anonymousUser".equals(email)) {
                throw new RuntimeException("Usuario no autenticado");
            }

            System.out.println("🔐 Email desde SecurityContext: " + email);

            // Buscar usuario en BD
            User user = userRepository.findByEmailActive(email)
                    .orElseThrow(() -> {
                        System.err.println("❌ Usuario no encontrado: " + email);
                        return new RuntimeException("Usuario no encontrado en base de datos");
                    });

            System.out.println("✅ Usuario encontrado: " + user.getId());
            return user;

        } catch (Exception e) {
            System.err.println("❌ Error obteniendo usuario: " + e.getMessage());
            e.printStackTrace();
            throw new RuntimeException("Error al obtener usuario autenticado: " + e.getMessage());
        }
    }

    /**
     * 📤 Subir un audio
     * POST /api/voice-audios/upload
     */
    @PostMapping("/upload")
    public ResponseEntity<?> uploadAudio(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "category", defaultValue = "profile") String category,
            @RequestParam(value = "title", required = false) String title) {

        try {
            System.out.println("📤 [uploadAudio] Iniciando upload...");
            
            // Obtener usuario
            User user = getAuthenticatedUser();

            // Validar archivo vacío
            if (file.isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "El archivo está vacío"));
            }

            // Validar tipo de archivo
            String contentType = file.getContentType();
            if (!isValidAudioFormat(contentType)) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Formato no permitido. Solo MP3 y WAV"));
            }

            // Validar tamaño
            long fileSizeMb = file.getSize() / (1024 * 1024);
            if (fileSizeMb > 10) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Archivo muy grande. Máximo 10MB"));
            }

            System.out.println("✅ Validaciones pasadas. Archivo: " + file.getOriginalFilename());

            // Subir audio
            VoiceAudioDTO audio = voiceAudioService.uploadAudio(
                    user,
                    file,
                    title != null ? title : file.getOriginalFilename(),
                    category
            );

            System.out.println("✅ Audio subido exitosamente: " + audio.getId());
            return ResponseEntity.ok(audio);

        } catch (RuntimeException e) {
            System.err.println("❌ Error de autorización: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            System.err.println("❌ Error en upload: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Error al subir audio: " + e.getMessage()));
        }
    }

    /**
     * 📋 Admin: Obtener demos de cualquier usuario por ID
     * GET /api/voice-audios/user/{userId}
     */
    @GetMapping("/user/{userId}")
    @org.springframework.security.access.prepost.PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_ALUMNO', 'ROLE_PROFESOR')")
    public ResponseEntity<?> getUserAudiosByAdmin(@PathVariable UUID userId,
            @RequestParam(value = "category", required = false) String category) {
        try {
            List<VoiceAudioDTO> audios = voiceAudioService.getUserAudios(userId, category);
            return ResponseEntity.ok(audios);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Error obteniendo audios: " + e.getMessage()));
        }
    }

    /**
     * 📋 Obtener audios del usuario
     * GET /api/voice-audios?category=profile
     */
    @GetMapping
    public ResponseEntity<?> getUserAudios(
            @RequestParam(value = "category", required = false) String category) {

        try {
            System.out.println("📋 [getUserAudios] Obteniendo audios. Categoría: " + category);
            
            User user = getAuthenticatedUser();

            System.out.println("👤 Usuario: " + user.getEmail() + " (ID: " + user.getId() + ")");

            List<VoiceAudioDTO> audios = voiceAudioService.getUserAudios(user.getId(), category);

            System.out.println("✅ Audios encontrados: " + audios.size());
            return ResponseEntity.ok(audios);

        } catch (RuntimeException e) {
            System.err.println("❌ Error de autorización: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            System.err.println("❌ Error obteniendo audios: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Error obteniendo audios: " + e.getMessage()));
        }
    }

    /**
     * 📥 Obtener audio específico
     * GET /api/voice-audios/{audioId}
     */
    @GetMapping("/{audioId}")
    public ResponseEntity<?> getAudio(@PathVariable UUID audioId) {

        try {
            System.out.println("📥 [getAudio] Obteniendo audio: " + audioId);
            
            User user = getAuthenticatedUser();

            VoiceAudioDTO audio = voiceAudioService.getAudioById(audioId);

            System.out.println("✅ Audio obtenido: " + audio.getTitle());
            return ResponseEntity.ok(audio);

        } catch (RuntimeException e) {
            System.err.println("❌ Error de autorización: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            System.err.println("❌ Error obteniendo audio: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "Audio no encontrado"));
        }
    }

    /**
     * 🗑️ Eliminar un audio
     * DELETE /api/voice-audios/{audioId}
     */
    @DeleteMapping("/{audioId}")
    public ResponseEntity<?> deleteAudio(@PathVariable UUID audioId) {

        try {
            System.out.println("🗑️ [deleteAudio] Eliminando audio: " + audioId);
            
            User user = getAuthenticatedUser();

            voiceAudioService.deleteAudio(user.getId(), audioId);

            System.out.println("✅ Audio eliminado correctamente");
            return ResponseEntity.ok(Map.of("message", "Audio eliminado correctamente"));

        } catch (RuntimeException e) {
            System.err.println("❌ Error de autorización: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            System.err.println("❌ Error eliminando audio: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "No permitido eliminar este audio"));
        }
    }

    /**
     * Validar formatos de audio permitidos
     */
    private boolean isValidAudioFormat(String contentType) {
        if (contentType == null) return false;
        String lower = contentType.toLowerCase();
        return lower.contains("audio/mpeg") ||
               lower.contains("audio/mp3") ||
               lower.contains("audio/wav") ||
               lower.contains("mp3") ||
               lower.contains("wav");
    }
}
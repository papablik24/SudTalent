package sudtalent.sudtalentproyecto.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.security.core.context.SecurityContextHolder;
import sudtalent.sudtalentproyecto.model.User;
import sudtalent.sudtalentproyecto.dto.VoiceAudioDTO;
import sudtalent.sudtalentproyecto.repository.UserRepository;
import sudtalent.sudtalentproyecto.service.VoiceAudioService;
import lombok.RequiredArgsConstructor;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/demos")
@CrossOrigin(origins = "${app.cors.allowed-origins}")
@RequiredArgsConstructor
public class DemoController {

    private final VoiceAudioService voiceAudioService;
    private final UserRepository userRepository;

    /**
     * 📤 POST /api/demos/upload - Subir demo (audio o video)
     */
    @PostMapping("/upload")
    public ResponseEntity<?> uploadDemo(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "category", defaultValue = "Doblaje") String category,
            @RequestParam(value = "title", required = false) String title) {

        try {
            System.out.println("📤 [DEMO] Upload iniciado");
            System.out.println("   Categoría: " + category);
            System.out.println("   Archivo: " + file.getOriginalFilename() + " (" + file.getSize() + " bytes)");

            // Obtener usuario autenticado
            User user = getAuthenticatedUser();
            System.out.println("   Usuario: " + user.getId());

            // Validar tipo de archivo
            String contentType = file.getContentType() != null ? file.getContentType() : "";
            boolean isAudio = contentType.contains("audio");
            boolean isVideo = contentType.contains("video");

            if (!isAudio && !isVideo) {
                System.err.println("   ❌ Formato no permitido: " + contentType);
                return ResponseEntity.badRequest().body(Map.of(
                    "error", "El archivo debe ser de audio (MP3, WAV) o video (MP4, MOV)"
                ));
            }

            System.out.println("   ✓ Tipo válido: " + (isAudio ? "AUDIO" : "VIDEO"));

            // Validar tamaño (máx 50MB para video)
            long maxSize = isVideo ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
            if (file.getSize() > maxSize) {
                System.err.println("   ❌ Archivo muy grande");
                return ResponseEntity.badRequest().body(Map.of(
                    "error", isVideo ? "Video muy grande. Máximo 50MB" : "Audio muy grande. Máximo 10MB"
                ));
            }

            // Usar nombre del archivo como título si no se proporciona
            String demoTitle = title != null && !title.isEmpty() 
                ? title 
                : file.getOriginalFilename();

            // Subir a través del servicio de audios (mismo bucket)
            VoiceAudioDTO result = voiceAudioService.uploadAudio(
                user,
                file,
                demoTitle,
                "demo"  // Categoría interna diferente
            );

            System.out.println("✅ [DEMO] Subido exitosamente");
            return ResponseEntity.ok(result);

        } catch (RuntimeException e) {
            System.err.println("❌ [DEMO] Error de autenticación: " + e.getMessage());
            return ResponseEntity.status(401).body(Map.of(
                "error", e.getMessage()
            ));
        } catch (IOException e) {
            System.err.println("❌ [DEMO] Error de IO: " + e.getMessage());
            return ResponseEntity.status(500).body(Map.of(
                "error", "Error al subir demo: " + e.getMessage()
            ));
        } catch (Exception e) {
            System.err.println("❌ [DEMO] Error inesperado: " + e.getMessage());
            return ResponseEntity.status(500).body(Map.of(
                "error", "Error al subir demo"
            ));
        }
    }

    /**
     * 📋 GET /api/demos - Obtener todas las demos del usuario
     */
    @GetMapping
    public ResponseEntity<?> getUserDemos(
            @RequestParam(value = "category", required = false) String category) {
        try {
            System.out.println("📋 [DEMO] GET demos iniciado");

            User user = getAuthenticatedUser();

            // Obtener todos los audios con categoría "demo"
            List<VoiceAudioDTO> demos = voiceAudioService.getUserAudios(user.getId(), "demo");

            System.out.println("   ✓ Demos encontradas: " + demos.size());
            return ResponseEntity.ok(demos);

        } catch (RuntimeException e) {
            System.err.println("❌ [DEMO] Error de autenticación: " + e.getMessage());
            return ResponseEntity.status(401).body(Map.of(
                "error", e.getMessage()
            ));
        } catch (Exception e) {
            System.err.println("❌ [DEMO] Error: " + e.getMessage());
            return ResponseEntity.status(500).body(Map.of(
                "error", "Error al obtener demos"
            ));
        }
    }

    /**
     * 🗑️ DELETE /api/demos/{id} - Eliminar demo
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteDemo(@PathVariable UUID id) {
        try {
            System.out.println("🗑️ [DEMO] DELETE iniciado para ID: " + id);

            User user = getAuthenticatedUser();
            voiceAudioService.deleteAudio(user.getId(), id);

            System.out.println("   ✅ Demo eliminada");
            return ResponseEntity.ok(Map.of(
                "message", "Demo eliminada exitosamente"
            ));

        } catch (RuntimeException e) {
            System.err.println("❌ [DEMO] Error de autenticación: " + e.getMessage());
            return ResponseEntity.status(401).body(Map.of(
                "error", e.getMessage()
            ));
        } catch (Exception e) {
            System.err.println("❌ [DEMO] Error: " + e.getMessage());
            return ResponseEntity.status(500).body(Map.of(
                "error", "Error al eliminar demo"
            ));
        }
    }

    /**
     * Helper: Obtener usuario autenticado
     */
    private User getAuthenticatedUser() {
        try {
            String email = SecurityContextHolder.getContext()
                    .getAuthentication()
                    .getName();

            if (email == null || email.isEmpty() || "anonymousUser".equals(email)) {
                throw new RuntimeException("Usuario no autenticado");
            }

            System.out.println("🔐 [DEMO] Email desde SecurityContext: " + email);

            User user = userRepository.findByEmailActive(email)
                    .orElseThrow(() -> {
                        System.err.println("❌ [DEMO] Usuario no encontrado: " + email);
                        return new RuntimeException("Usuario no encontrado en base de datos");
                    });

            System.out.println("✅ [DEMO] Usuario encontrado: " + user.getId());
            return user;

        } catch (Exception e) {
            System.err.println("❌ [DEMO] Error obteniendo usuario: " + e.getMessage());
            e.printStackTrace();
            throw new RuntimeException("Error al obtener usuario autenticado: " + e.getMessage());
        }
    }
}

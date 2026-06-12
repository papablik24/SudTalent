package sudtalent.sudtalentproyecto.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import sudtalent.sudtalentproyecto.model.User;
import sudtalent.sudtalentproyecto.service.SupabaseStorageService;
import sudtalent.sudtalentproyecto.repository.UserRepository;
import lombok.RequiredArgsConstructor;

import java.io.IOException;
import java.util.Map;

/**
 * Endpoints para que el usuario autenticado gestione su propio perfil.
 * Separado de UserController (admin) para evitar conflictos de rutas con /{id}.
 */
@RestController
@RequestMapping("/api/profile")
@RequiredArgsConstructor
public class ProfileController {

    private final UserRepository userRepository;
    private final SupabaseStorageService supabaseStorageService;

    /**
     * GET /api/profile — obtiene los datos del perfil del usuario autenticado.
     */
    @GetMapping
    @PreAuthorize("hasAnyAuthority('ROLE_ALUMNO', 'ROLE_ADMIN', 'ROLE_PROFESOR')")
    public ResponseEntity<?> getMyProfile(Authentication auth) {
        String email = auth.getName();
        return userRepository.findByEmailActive(email).map(user -> {
            var map = new java.util.HashMap<String, Object>();
            map.put("id", user.getId());
            map.put("name", user.getName() != null ? user.getName() : "");
            map.put("email", user.getEmail() != null ? user.getEmail() : "");
            map.put("phone", user.getPhone() != null ? user.getPhone() : "");
            map.put("age", user.getAge() != null ? user.getAge() : 0);
            map.put("bio", user.getBio() != null ? user.getBio() : "");
            map.put("profileImageUrl", user.getProfileImageUrl() != null ? user.getProfileImageUrl() : "");
            map.put("profileType", user.getProfileType() != null ? user.getProfileType().name() : "");
            map.put("status", user.getStatus() != null ? user.getStatus().name() : "PENDING");
            map.put("profileAudioUrl", user.getProfileAudioUrl() != null ? user.getProfileAudioUrl() : "");
            return ResponseEntity.ok((Object) map);
        }).orElse(ResponseEntity.notFound().build());
    }

    /**
     * PUT /api/profile — actualiza phone, age, bio del usuario autenticado.
     */
    @PutMapping
    @PreAuthorize("hasAnyAuthority('ROLE_ALUMNO', 'ROLE_ADMIN', 'ROLE_PROFESOR')")
    public ResponseEntity<?> updateMyProfile(Authentication auth,
                                              @RequestBody Map<String, Object> updates) {
        String email = auth.getName();
        return userRepository.findByEmailActive(email).map(user -> {
            if (updates.containsKey("phone")) {
                String phone = (String) updates.get("phone");
                if (phone != null && !phone.isBlank()) {
                    // Extraer solo dígitos y validar longitud 10-11 (569XXXXXXXX)
                    String digits = phone.replaceAll("[^0-9]", "");
                    if (digits.length() >= 8 && digits.length() <= 15) {
                        user.setPhone(digits);
                    } else {
                        return ResponseEntity.badRequest()
                                .body(Map.of("error", "Número de teléfono inválido"));
                    }
                } else {
                    // Permitir borrar el teléfono
                    user.setPhone(null);
                }
            }
            if (updates.containsKey("age")) {
                Object ageObj = updates.get("age");
                if (ageObj instanceof Number) {
                    user.setAge(((Number) ageObj).intValue());
                }
            }
            if (updates.containsKey("bio")) {
                user.setBio((String) updates.get("bio"));
            }
            if (updates.containsKey("name")) {
                String name = (String) updates.get("name");
                if (name != null && !name.isBlank()) user.setName(name);
            }
            if (updates.containsKey("profileAudioUrl")) {
                user.setProfileAudioUrl((String) updates.get("profileAudioUrl"));
            }
            User saved = userRepository.save(user);
            return ResponseEntity.ok(Map.of(
                    "id", saved.getId(),
                    "name", saved.getName() != null ? saved.getName() : "",
                    "email", saved.getEmail() != null ? saved.getEmail() : "",
                    "phone", saved.getPhone() != null ? saved.getPhone() : "",
                    "age", saved.getAge() != null ? saved.getAge() : 0,
                    "bio", saved.getBio() != null ? saved.getBio() : "",
                    "profileImageUrl", saved.getProfileImageUrl() != null ? saved.getProfileImageUrl() : "",
                    "profileAudioUrl", saved.getProfileAudioUrl() != null ? saved.getProfileAudioUrl() : ""
            ));
        }).orElse(ResponseEntity.notFound().build());
    }

    /**
     * POST /api/profile/avatar — sube foto de perfil a Supabase.
     */
    @PostMapping("/avatar")
    @PreAuthorize("hasAnyAuthority('ROLE_ALUMNO', 'ROLE_ADMIN', 'ROLE_PROFESOR')")
    public ResponseEntity<?> uploadAvatar(Authentication auth,
                                           @RequestParam("file") MultipartFile file) {
        String email = auth.getName();
        User user = userRepository.findByEmailActive(email).orElse(null);
        if (user == null) return ResponseEntity.notFound().build();

        String contentType = file.getContentType() != null ? file.getContentType() : "";
        if (!contentType.startsWith("image/")) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "Solo se permiten imágenes (JPG, PNG, WEBP)"));
        }
        if (file.getSize() > 5 * 1024 * 1024) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "La imagen no puede superar 5MB"));
        }

        try {
            String storagePath = supabaseStorageService.uploadAvatar("user-avatars", user.getId(), file, "jpg");
            String baseUrl = supabaseStorageService.buildPublicUrl("user-avatars", storagePath);
            String publicUrl = baseUrl + "?v=" + System.currentTimeMillis();
            user.setProfileImageUrl(publicUrl);
            userRepository.save(user);
            return ResponseEntity.ok(Map.of("profileImageUrl", publicUrl));
        } catch (IOException e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Error al subir la imagen: " + e.getMessage()));
        }
    }
}

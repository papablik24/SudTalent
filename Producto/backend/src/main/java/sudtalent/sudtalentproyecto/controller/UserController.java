package sudtalent.sudtalentproyecto.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import sudtalent.sudtalentproyecto.model.User;
import sudtalent.sudtalentproyecto.model.Alumno;
import sudtalent.sudtalentproyecto.model.ConvocatoriaFavorita;
import sudtalent.sudtalentproyecto.model.Notificacion;
import sudtalent.sudtalentproyecto.service.SoftDeleteService;
import sudtalent.sudtalentproyecto.repository.UserRepository;
import sudtalent.sudtalentproyecto.repository.WhitelistNumberRepository;
import sudtalent.sudtalentproyecto.repository.AlumnoRepository;
import sudtalent.sudtalentproyecto.repository.PostulacionRepository;
import sudtalent.sudtalentproyecto.repository.AudicionRepository;
import sudtalent.sudtalentproyecto.repository.VoiceAudioRepository;
import sudtalent.sudtalentproyecto.repository.CursoRepository;
import sudtalent.sudtalentproyecto.repository.ConvocatoriaFavoritaRepository;
import sudtalent.sudtalentproyecto.repository.NotificacionRepository;
import org.springframework.dao.DataIntegrityViolationException;
import lombok.RequiredArgsConstructor;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserRepository userRepository;
    private final SoftDeleteService softDeleteService;
    private final WhitelistNumberRepository whitelistRepository;
    private final AlumnoRepository alumnoRepository;
    private final PostulacionRepository postulacionRepository;
    private final AudicionRepository audicionRepository;
    private final VoiceAudioRepository voiceAudioRepository;
    private final CursoRepository cursoRepository;
    private final ConvocatoriaFavoritaRepository favoritaRepository;
    private final NotificacionRepository notificacionRepository;

    // ─── Admin endpoints ──────────────────────────────────────────
    
    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> getUser(@PathVariable UUID id) {
        return userRepository.findByIdActive(id).map(u -> {
            var map = new java.util.HashMap<String, Object>();
            map.put("id", u.getId());
            map.put("name", u.getName() != null ? u.getName() : "");
            map.put("email", u.getEmail() != null ? u.getEmail() : "");
            map.put("phone", u.getPhone() != null ? u.getPhone() : "");
            map.put("role", u.getRole().name());
            map.put("status", u.getStatus() != null ? u.getStatus().name() : "PENDING");
            map.put("active", u.isActive());
            map.put("onboarded", u.isOnboarded());
            map.put("profileType", u.getProfileType() != null ? u.getProfileType().name() : "");
            map.put("profileAudioUrl", u.getProfileAudioUrl() != null ? u.getProfileAudioUrl() : "");
            return ResponseEntity.ok((Object) map);
        }).orElse(ResponseEntity.notFound().build());
    }
    
    @GetMapping
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public ResponseEntity<?> getAllUsers() {
        var users = userRepository.findAllActive().stream().map(u -> {
            var map = new java.util.HashMap<String, Object>();
            map.put("id", u.getId());
            map.put("name", u.getName() != null ? u.getName() : "");
            map.put("email", u.getEmail() != null ? u.getEmail() : "");
            map.put("phone", u.getPhone() != null ? u.getPhone() : "");
            map.put("role", u.getRole().name());
            map.put("status", u.getStatus() != null ? u.getStatus().name() : "PENDING");
            map.put("active", u.isActive());
            map.put("onboarded", u.isOnboarded());
            map.put("profileImageUrl", u.getProfileImageUrl() != null ? u.getProfileImageUrl() : "");
            map.put("age", u.getAge() != null ? u.getAge() : 0);
            map.put("bio", u.getBio() != null ? u.getBio() : "");
            map.put("profileType", u.getProfileType() != null ? u.getProfileType().name() : "");
            map.put("createdAt", u.getCreatedAt());
            map.put("profileAudioUrl", u.getProfileAudioUrl() != null ? u.getProfileAudioUrl() : "");
            map.put("specialties", u.getSpecialties() != null ? u.getSpecialties() : "");
            return map;
        }).toList();
        return ResponseEntity.ok(users);
    }

    /** Actualizar estado/campos de un usuario (usado por el admin) */
    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public ResponseEntity<?> updateUser(@PathVariable UUID id, @RequestBody Map<String, Object> updates) {
        return userRepository.findByIdActive(id).map(user -> {
            if (updates.containsKey("status")) {
                try { user.setStatus(User.ProfileStatus.valueOf((String) updates.get("status"))); }
                catch (IllegalArgumentException ignored) {}
            }
            if (updates.containsKey("name")) {
                String name = (String) updates.get("name");
                if (name != null && !name.isBlank()) user.setName(name.trim());
            }
            if (updates.containsKey("active")) user.setActive((Boolean) updates.get("active"));
            if (updates.containsKey("profileAudioUrl")) {
                user.setProfileAudioUrl((String) updates.get("profileAudioUrl"));
            }
            if (updates.containsKey("specialties")) {
                user.setSpecialties((String) updates.get("specialties"));
            }
            if (updates.containsKey("phone")) {                String phone = (String) updates.get("phone");
                if (phone != null) {
                    String digits = phone.replaceAll("[^0-9]", "");
                    // Normalizar a formato chileno: siempre 56XXXXXXXXX
                    if (digits.startsWith("56") && digits.length() == 11) {
                        // ya está completo: 56951485319
                        user.setPhone(digits);
                    } else if (digits.startsWith("9") && digits.length() == 9) {
                        // 9XXXXXXXX → 569XXXXXXXX
                        user.setPhone("56" + digits);
                    } else if (digits.length() == 8) {
                        // XXXXXXXX → 569XXXXXXXX
                        user.setPhone("569" + digits);
                    } else if (!digits.isEmpty()) {
                        // Cualquier otro formato con dígitos válidos
                        user.setPhone(digits);
                    }
                }
            }
            try {
                User saved = userRepository.saveAndFlush(user);
                System.out.println("✅ Usuario actualizado: " + saved.getId() + " phone=" + saved.getPhone());
                return ResponseEntity.ok(Map.of(
                    "id", saved.getId(),
                    "name", saved.getName() != null ? saved.getName() : "",
                    "phone", saved.getPhone() != null ? saved.getPhone() : "",
                    "status", saved.getStatus() != null ? saved.getStatus().name() : "PENDING",
                    "active", saved.isActive(),
                    "specialties", saved.getSpecialties() != null ? saved.getSpecialties() : ""
                ));
            } catch (Exception e) {
                System.err.println("❌ Error al guardar usuario: " + e.getMessage());
                return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
            }
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    @org.springframework.transaction.annotation.Transactional
    public ResponseEntity<?> deleteUser(@PathVariable UUID id) {
        return userRepository.findById(id).map(user -> {
            try {
                // Verificar si tiene dependencias críticas
                boolean isAlumno = alumnoRepository.existsById(id);
                boolean hasPostulaciones = isAlumno && postulacionRepository.countAllByAlumnoId(id) > 0;
                boolean hasAudiciones = isAlumno && audicionRepository.countAllByAlumnoId(id) > 0;
                boolean hasVoiceAudios = voiceAudioRepository.countAllByUserId(id) > 0;
                boolean hasCursos = isAlumno && !cursoRepository.findByAlumnoId(id).isEmpty();

                if (hasPostulaciones || hasAudiciones || hasVoiceAudios || hasCursos) {
                    return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of(
                        "error", "CONSTRAINTS_VIOLATION",
                        "message", "No se pudo eliminar el usuario porque tiene registros asociados. Puedes desactivarlo en su lugar."
                    ));
                }

                // 1. Buscar y eliminar registros en whitelist vinculados a este usuario
                whitelistRepository.findAll().stream()
                    .filter(w -> {
                        if (w.getUser() != null && id.equals(w.getUser().getId())) {
                            return true;
                        }
                        if (user.getPhone() != null && w.getPhone() != null) {
                            String cleanPhone = user.getPhone().replaceAll("[^0-9]", "");
                            String wClean = w.getPhone().replaceAll("[^0-9]", "");
                            if (!cleanPhone.isEmpty() && !wClean.isEmpty()) {
                                if (cleanPhone.equals(wClean)) {
                                    return true;
                                }
                                if (cleanPhone.length() >= 8 && wClean.length() >= 8) {
                                    String last8_1 = cleanPhone.substring(cleanPhone.length() - 8);
                                    String last8_2 = wClean.substring(wClean.length() - 8);
                                    if (last8_1.equals(last8_2)) {
                                        return true;
                                    }
                                }
                            }
                        }
                        if (user.getEmail() != null && w.getEmail() != null) {
                            if (user.getEmail().equalsIgnoreCase(w.getEmail())) {
                                return true;
                            }
                        }
                        return false;
                    })
                    .forEach(w -> {
                        whitelistRepository.delete(w);
                        whitelistRepository.flush();
                    });

                // 2. Eliminar notificaciones
                notificacionRepository.deleteAll(notificacionRepository.findByUsuarioIdOrderByFechaCreacionDesc(id));

                // 3. Eliminar favoritos
                favoritaRepository.deleteAll(favoritaRepository.findByUsuarioId(id));

                // 4. Intentar hacer delete de alumnos/user
                if (isAlumno) {
                    Alumno alumno = alumnoRepository.findById(id).orElseThrow();
                    alumnoRepository.delete(alumno);
                    alumnoRepository.flush();
                }
                userRepository.delete(user);
                userRepository.flush(); // Forzar ejecución SQL para capturar excepciones de integridad

                return ResponseEntity.ok(Map.of("message", "Usuario eliminado"));
            } catch (DataIntegrityViolationException e) {
                return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of(
                    "error", "CONSTRAINTS_VIOLATION",
                    "message", "No se pudo eliminar el usuario porque tiene registros asociados. Puedes desactivarlo en su lugar."
                ));
            } catch (Exception e) {
                return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
            }
        }).orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}/restore")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public ResponseEntity<?> restoreUser(@PathVariable UUID id) {
        try {
            softDeleteService.restoreUser(id);
            return ResponseEntity.ok(Map.of("message", "Usuario restaurado"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }
}
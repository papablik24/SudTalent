package sudtalent.sudtalentproyecto.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import sudtalent.sudtalentproyecto.model.User;
import sudtalent.sudtalentproyecto.service.SoftDeleteService;
import sudtalent.sudtalentproyecto.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserRepository userRepository;
    private final SoftDeleteService softDeleteService;

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
            if (updates.containsKey("phone")) {
                String phone = (String) updates.get("phone");
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
                    "active", saved.isActive()
                ));
            } catch (Exception e) {
                System.err.println("❌ Error al guardar usuario: " + e.getMessage());
                return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
            }
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public ResponseEntity<?> deleteUser(@PathVariable UUID id) {
        try {
            softDeleteService.softDeleteUser(id);
            return ResponseEntity.ok(Map.of("message", "Usuario eliminado"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
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
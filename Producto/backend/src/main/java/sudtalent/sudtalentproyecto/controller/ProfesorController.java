package sudtalent.sudtalentproyecto.controller;

import sudtalent.sudtalentproyecto.model.Profesor;
import sudtalent.sudtalentproyecto.model.User;
import sudtalent.sudtalentproyecto.repository.ProfesorRepository;
import sudtalent.sudtalentproyecto.repository.UserRepository;
import sudtalent.sudtalentproyecto.service.SoftDeleteService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/profesores")
@RequiredArgsConstructor
public class ProfesorController {

    private final ProfesorRepository profesorRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final SoftDeleteService softDeleteService;

    /**
     * GET /api/profesores — Lista todos los profesores con datos del usuario
     */
    @GetMapping
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public ResponseEntity<?> getAllProfesores() {
        List<Profesor> profesores = profesorRepository.findAll();

        List<Map<String, Object>> result = profesores.stream()
            .filter(p -> p.getDeletedAt() == null)
            .map(this::toMap)
            .collect(Collectors.toList());

        return ResponseEntity.ok(result);
    }

    /**
     * GET /api/profesores/{id}
     */
    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public ResponseEntity<?> getProfesorById(@PathVariable UUID id) {
        return profesorRepository.findById(id)
            .filter(p -> p.getDeletedAt() == null)
            .map(p -> ResponseEntity.ok((Object) toMap(p)))
            .orElse(ResponseEntity.notFound().build());
    }

    /**
     * POST /api/profesores — Crea usuario con rol PROFESOR + entrada en tabla profesores
     * Body: { name, email, phone, especialidad }
     */
    @PostMapping
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    @Transactional
    public ResponseEntity<?> createProfesor(@RequestBody Map<String, String> body) {
        try {
            String name = body.getOrDefault("name", "").trim();
            String email = body.getOrDefault("email", "").trim().toLowerCase();
            String rawPhone = body.getOrDefault("phone", "").trim();
            String especialidad = body.getOrDefault("especialidad", "General").trim();

            String password = body.getOrDefault("password", "").trim();

            if (name.isEmpty() || email.isEmpty()) {
                return ResponseEntity.badRequest()
                    .body(Map.of("error", "Nombre y email son obligatorios"));
            }

            if (password.isEmpty()) {
                return ResponseEntity.badRequest()
                    .body(Map.of("error", "La contraseña temporal es obligatoria"));
            }

            if (password.length() < 6) {
                return ResponseEntity.badRequest()
                    .body(Map.of("error", "La contraseña temporal debe tener al menos 6 caracteres"));
            }

            // Sanitizar teléfono: quitar todo lo que no sea dígito
            String phone = rawPhone.replaceAll("[^0-9]", "");

            // Verificar email duplicado
            if (userRepository.findByEmailActive(email).isPresent()) {
                return ResponseEntity.badRequest()
                    .body(Map.of("error", "Ya existe un usuario con ese email"));
            }

            // Verificar teléfono duplicado (si se provee)
            if (!phone.isEmpty() && userRepository.findByPhoneActive(phone).isPresent()) {
                return ResponseEntity.badRequest()
                    .body(Map.of("error", "Ya existe un usuario con ese teléfono"));
            }

            // Validar formato del teléfono si se provee
            if (!phone.isEmpty() && (phone.length() < 8 || phone.length() > 15)) {
                return ResponseEntity.badRequest()
                    .body(Map.of("error", "El teléfono debe tener entre 8 y 15 dígitos"));
            }

            // Crear User con rol PROFESOR
            User user = User.builder()
                .name(name)
                .email(email)
                .password(passwordEncoder.encode(password))
                .phone(phone.isEmpty() ? null : phone)
                .role(User.Role.PROFESOR)
                .onboarded(true)
                .status(User.ProfileStatus.APPROVED)
                .active(true)
                .build();
            user = userRepository.saveAndFlush(user);

            // Crear entrada Profesor
            Profesor profesor = Profesor.builder()
                .usuarioId(user.getId())
                .especialidad(especialidad)
                .build();
            profesor = profesorRepository.saveAndFlush(profesor);

            // Recargar para tener la relación usuario populada
            profesor = profesorRepository.findById(profesor.getUsuarioId()).orElse(profesor);

            System.out.println("✅ Profesor creado: " + name + " (" + email + ")");
            return ResponseEntity.status(HttpStatus.CREATED).body(toMap(profesor));

        } catch (org.springframework.dao.DataIntegrityViolationException e) {
            String msg = e.getMostSpecificCause().getMessage();
            if (msg != null && msg.contains("email")) {
                return ResponseEntity.badRequest()
                    .body(Map.of("error", "Ya existe un usuario con ese email"));
            }
            if (msg != null && msg.contains("phone")) {
                return ResponseEntity.badRequest()
                    .body(Map.of("error", "Ya existe un usuario con ese teléfono"));
            }
            System.err.println("❌ Error de integridad creando profesor: " + msg);
            return ResponseEntity.badRequest()
                .body(Map.of("error", "Error de datos: " + (msg != null ? msg : "restricción de base de datos")));

        } catch (jakarta.validation.ConstraintViolationException e) {
            String violations = e.getConstraintViolations().stream()
                .map(v -> v.getPropertyPath() + ": " + v.getMessage())
                .collect(Collectors.joining(", "));
            System.err.println("❌ Validación fallida: " + violations);
            return ResponseEntity.badRequest()
                .body(Map.of("error", "Datos inválidos: " + violations));

        } catch (Exception e) {
            System.err.println("❌ Error inesperado creando profesor: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "Error al crear profesor: " + e.getMessage()));
        }
    }

    /**
     * PUT /api/profesores/{id} — Actualiza datos del usuario y especialidad
     * Body: { name?, email?, phone?, especialidad?, active? }
     */
    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    @Transactional
    public ResponseEntity<?> updateProfesor(@PathVariable UUID id, @RequestBody Map<String, Object> body) {
        try {
            Optional<Profesor> opt = profesorRepository.findById(id);
            if (opt.isEmpty() || opt.get().getDeletedAt() != null) {
                return ResponseEntity.notFound().build();
            }

            Profesor profesor = opt.get();
            User user = profesor.getUsuario();

            if (user == null) {
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Usuario del profesor no encontrado"));
            }

            // Actualizar campos del usuario
            if (body.containsKey("name")) {
                user.setName((String) body.get("name"));
            }
            if (body.containsKey("email")) {
                String newEmail = ((String) body.get("email")).trim();
                var existing = userRepository.findByEmailActive(newEmail);
                if (existing.isPresent() && !existing.get().getId().equals(user.getId())) {
                    return ResponseEntity.badRequest()
                        .body(Map.of("error", "Email ya está en uso por otro usuario"));
                }
                user.setEmail(newEmail);
            }
            if (body.containsKey("phone")) {
                String rawPhone = ((String) body.get("phone")).trim();
                // Sanitizar: solo dígitos
                String newPhone = rawPhone.replaceAll("[^0-9]", "");
                if (!newPhone.isEmpty()) {
                    if (newPhone.length() < 8 || newPhone.length() > 15) {
                        return ResponseEntity.badRequest()
                            .body(Map.of("error", "El teléfono debe tener entre 8 y 15 dígitos"));
                    }
                    var existing = userRepository.findByPhoneActive(newPhone);
                    if (existing.isPresent() && !existing.get().getId().equals(user.getId())) {
                        return ResponseEntity.badRequest()
                            .body(Map.of("error", "Teléfono ya está en uso por otro usuario"));
                    }
                    user.setPhone(newPhone);
                } else {
                    user.setPhone(null);
                }
            }
            if (body.containsKey("active")) {
                user.setActive((Boolean) body.get("active"));
            }

            user.setUpdatedAt(LocalDateTime.now());
            userRepository.saveAndFlush(user);

            // Actualizar especialidad
            if (body.containsKey("especialidad")) {
                profesor.setEspecialidad((String) body.get("especialidad"));
            }
            profesor.setUpdatedAt(LocalDateTime.now());
            profesorRepository.saveAndFlush(profesor);

            // Recargar
            profesor = profesorRepository.findById(id).orElse(profesor);

            System.out.println("✅ Profesor actualizado: " + user.getName());
            return ResponseEntity.ok(toMap(profesor));

        } catch (org.springframework.dao.DataIntegrityViolationException e) {
            String msg = e.getMostSpecificCause().getMessage();
            return ResponseEntity.badRequest()
                .body(Map.of("error", "Error de datos: " + (msg != null ? msg : "restricción de base de datos")));
        } catch (Exception e) {
            System.err.println("❌ Error actualizando profesor: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "Error al actualizar: " + e.getMessage()));
        }
    }

    /**
     * DELETE /api/profesores/{id} — Soft delete del profesor y usuario
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    @Transactional
    public ResponseEntity<?> deleteProfesor(@PathVariable UUID id) {
        Optional<Profesor> opt = profesorRepository.findById(id);
        if (opt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Profesor profesor = opt.get();
        profesor.setDeletedAt(LocalDateTime.now());
        profesorRepository.save(profesor);

        // Soft delete del usuario también
        User user = profesor.getUsuario();
        if (user != null) {
            user.softDelete();
            userRepository.save(user);
        }

        System.out.println("✅ Profesor eliminado (soft): " + id);
        return ResponseEntity.ok(Map.of("message", "Profesor eliminado correctamente"));
    }

    // ── Helper ─────────────────────────────────────────────────────────

    private Map<String, Object> toMap(Profesor p) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", p.getUsuarioId());
        map.put("especialidad", p.getEspecialidad());
        map.put("createdAt", p.getCreatedAt());
        map.put("updatedAt", p.getUpdatedAt());

        User u = p.getUsuario();
        if (u == null && p.getUsuarioId() != null) {
            u = userRepository.findById(p.getUsuarioId()).orElse(null);
        }

        if (u != null) {
            map.put("name", u.getName() != null ? u.getName() : "");
            map.put("email", u.getEmail() != null ? u.getEmail() : "");
            map.put("phone", u.getPhone() != null ? u.getPhone() : "");
            map.put("active", u.isActive());
            map.put("role", u.getRole().name());
        } else {
            map.put("name", "");
            map.put("email", "");
            map.put("phone", "");
            map.put("active", true);
            map.put("role", "PROFESOR");
        }
        return map;
    }
}
package sudtalent.sudtalentproyecto.controller;

import sudtalent.sudtalentproyecto.model.Profesor;
import sudtalent.sudtalentproyecto.model.User;
import sudtalent.sudtalentproyecto.model.Curso;
import sudtalent.sudtalentproyecto.repository.ProfesorRepository;
import sudtalent.sudtalentproyecto.repository.UserRepository;
import sudtalent.sudtalentproyecto.repository.CursoRepository;
import sudtalent.sudtalentproyecto.dto.ProfesorAlumnoDTO;
import sudtalent.sudtalentproyecto.service.SoftDeleteService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
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
    private final CursoRepository cursoRepository;

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
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_PROFESOR')")
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
            String cursosAsignados = body.getOrDefault("cursosAsignados", "").trim();
            String password = body.getOrDefault("password", "").trim();

            if (name.isEmpty() || email.isEmpty()) {
                return ResponseEntity.badRequest()
                    .body(Map.of("error", "Nombre y email son obligatorios"));
            }

            // Buscar si ya existe un User con ese email (activo o inactivo)
            Optional<User> existingUserOpt = userRepository.findByEmail(email);

            User user;
            if (existingUserOpt.isPresent()) {
                user = existingUserOpt.get();

                // Revisar si ya tiene Profesor asociado
                Optional<Profesor> existingProfesorOpt = profesorRepository.findById(user.getId());
                if (existingProfesorOpt.isPresent()) {
                    Profesor p = existingProfesorOpt.get();
                    if (p.getDeletedAt() == null) {
                        return ResponseEntity.badRequest()
                            .body(Map.of("error", "Este profesor ya está registrado"));
                    } else {
                        // Si estaba soft-deleted, lo restauramos
                        p.setDeletedAt(null);
                        p.setEspecialidad(especialidad);
                        p.setCursosAsignados(cursosAsignados);
                        p.setUpdatedAt(LocalDateTime.now());
                        profesorRepository.save(p);
                    }
                } else {
                    // Si existe User pero NO tiene Profesor asociado:
                    // Crear entrada Profesor
                    Profesor nuevoProfesor = Profesor.builder()
                        .usuarioId(user.getId())
                        .especialidad(especialidad)
                        .cursosAsignados(cursosAsignados)
                        .build();
                    profesorRepository.save(nuevoProfesor);
                }

                // Reutilizar ese User y actualizar sus datos
                user.setRole(User.Role.PROFESOR);
                user.setActive(true);
                user.setDeletedAt(null); // Restaurar si estaba soft-deleted
                user.setStatus(User.ProfileStatus.APPROVED);
                user.setName(name);

                // Sanitizar y verificar teléfono
                String phone = rawPhone.replaceAll("[^0-9]", "");
                if (!phone.isEmpty()) {
                    if (phone.length() < 8 || phone.length() > 15) {
                        return ResponseEntity.badRequest()
                            .body(Map.of("error", "El teléfono debe tener entre 8 y 15 dígitos"));
                    }
                    var userWithPhone = userRepository.findByPhoneActive(phone);
                    if (userWithPhone.isPresent() && !userWithPhone.get().getId().equals(user.getId())) {
                        return ResponseEntity.badRequest()
                            .body(Map.of("error", "Ya existe un usuario con ese teléfono"));
                    }
                    user.setPhone(phone);
                } else {
                    user.setPhone(null);
                }

                // Si se ingresó contraseña temporal, actualizarla
                if (!password.isEmpty()) {
                    if (password.length() < 6) {
                        return ResponseEntity.badRequest()
                            .body(Map.of("error", "La contraseña temporal debe tener al menos 6 caracteres"));
                    }
                    user.setPassword(passwordEncoder.encode(password));
                }

                user.setUpdatedAt(LocalDateTime.now());
                user = userRepository.saveAndFlush(user);

            } else {
                // Si NO existe User: mantener el flujo actual de creación completa
                if (password.isEmpty()) {
                    return ResponseEntity.badRequest()
                        .body(Map.of("error", "La contraseña temporal es obligatoria"));
                }
                if (password.length() < 6) {
                    return ResponseEntity.badRequest()
                        .body(Map.of("error", "La contraseña temporal debe tener al menos 6 caracteres"));
                }

                // Sanitizar y validar teléfono
                String phone = rawPhone.replaceAll("[^0-9]", "");
                if (!phone.isEmpty()) {
                    if (phone.length() < 8 || phone.length() > 15) {
                        return ResponseEntity.badRequest()
                            .body(Map.of("error", "El teléfono debe tener entre 8 y 15 dígitos"));
                    }
                    if (userRepository.findByPhoneActive(phone).isPresent()) {
                        return ResponseEntity.badRequest()
                            .body(Map.of("error", "Ya existe un usuario con ese teléfono"));
                    }
                }

                user = User.builder()
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

                Profesor nuevoProfesor = Profesor.builder()
                    .usuarioId(user.getId())
                    .especialidad(especialidad)
                    .cursosAsignados(cursosAsignados)
                    .build();
                profesorRepository.saveAndFlush(nuevoProfesor);
            }

            // Recargar para tener la relación usuario populada
            Profesor profesorResult = profesorRepository.findById(user.getId())
                .orElseThrow(() -> new RuntimeException("Error al recuperar el profesor creado/vinculado"));

            System.out.println("✅ Profesor creado/vinculado: " + name + " (" + email + ")");
            return ResponseEntity.status(HttpStatus.CREATED).body(toMap(profesorResult));

        } catch (org.springframework.dao.DataIntegrityViolationException e) {
            String msg = e.getMostSpecificCause().getMessage();
            String errorMsg = "Error de datos: restricción de base de datos";
            if (msg != null && msg.contains("email")) {
                errorMsg = "Ya existe un usuario con ese email";
            } else if (msg != null && msg.contains("phone")) {
                errorMsg = "Ya existe un usuario con ese teléfono";
            }
            System.err.println("❌ Error de integridad creando profesor: " + msg);
            throw new RuntimeException(errorMsg);

        } catch (jakarta.validation.ConstraintViolationException e) {
            String violations = e.getConstraintViolations().stream()
                .map(v -> v.getPropertyPath() + ": " + v.getMessage())
                .collect(Collectors.joining(", "));
            System.err.println("❌ Validación fallida: " + violations);
            throw new RuntimeException("Datos inválidos: " + violations);

        } catch (Exception e) {
            System.err.println("❌ Error inesperado creando profesor: " + e.getMessage());
            e.printStackTrace();
            throw new RuntimeException("Error al crear profesor: " + e.getMessage());
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
            if (body.containsKey("cursosAsignados")) {
                profesor.setCursosAsignados((String) body.get("cursosAsignados"));
            }
            profesor.setUpdatedAt(LocalDateTime.now());
            profesorRepository.saveAndFlush(profesor);

            // Recargar
            profesor = profesorRepository.findById(id).orElse(profesor);

            System.out.println("✅ Profesor actualizado: " + user.getName());
            return ResponseEntity.ok(toMap(profesor));

        } catch (org.springframework.dao.DataIntegrityViolationException e) {
            String msg = e.getMostSpecificCause().getMessage();
            String errorMsg = "Error de datos: restricción de base de datos";
            if (msg != null && msg.contains("email")) {
                errorMsg = "Ya existe un usuario con ese email";
            } else if (msg != null && msg.contains("phone")) {
                errorMsg = "Ya existe un usuario con ese teléfono";
            }
            System.err.println("❌ Error de integridad actualizando profesor: " + msg);
            throw new RuntimeException(errorMsg);
        } catch (Exception e) {
            System.err.println("❌ Error actualizando profesor: " + e.getMessage());
            throw new RuntimeException("Error al actualizar: " + e.getMessage());
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

            // Limpiar la asignación de este profesor en todos sus cursos
            List<Curso> cursosAsignados = cursoRepository.findByProfesorId(user.getId());
            for (Curso curso : cursosAsignados) {
                curso.setProfesor(null);
                curso.setUpdatedAt(LocalDateTime.now());
                cursoRepository.save(curso);
            }
        }

        System.out.println("✅ Profesor eliminado (soft): " + id);
        return ResponseEntity.ok(Map.of("message", "Profesor eliminado correctamente"));
    }

    /**
     * GET /api/profesores/me/alumnos — Obtiene los alumnos inscritos en los cursos del profesor autenticado
     */
    @GetMapping("/me/alumnos")
    @PreAuthorize("hasAnyAuthority('ROLE_PROFESOR', 'PROFESOR')")
    public ResponseEntity<List<ProfesorAlumnoDTO>> getMyAlumnos(Authentication auth) {
        UUID profesorId = getAuthenticatedUserId(auth);
        
        // 1. Obtener cursos del profesor
        List<Curso> cursos = cursoRepository.findByProfesorId(profesorId);
        
        // 2. Extraer todos los IDs únicos de alumnos
        Set<UUID> studentIds = cursos.stream()
                .flatMap(c -> c.getAlumnos().stream())
                .map(Curso.CursoAlumno::getAlumnoId)
                .collect(Collectors.toSet());
                
        if (studentIds.isEmpty()) {
            return ResponseEntity.ok(Collections.emptyList());
        }
        
        // 3. Obtener los perfiles completos de los alumnos
        List<User> students = userRepository.findAllById(studentIds);
        Map<UUID, User> studentMap = students.stream()
                .collect(Collectors.toMap(User::getId, s -> s));
                
        // 4. Mapear a ProfesorAlumnoDTO con los cursos comunes
        List<ProfesorAlumnoDTO> result = new ArrayList<>();
        for (UUID studentId : studentIds) {
            User s = studentMap.get(studentId);
            if (s == null) continue;
            
            List<ProfesorAlumnoDTO.CursoResumenDTO> sharedCourses = cursos.stream()
                    .filter(c -> c.getAlumnos().stream().anyMatch(a -> a.getAlumnoId().equals(studentId)))
                    .map(c -> ProfesorAlumnoDTO.CursoResumenDTO.builder()
                            .id(c.getId())
                            .titulo(c.getTitulo())
                            .cursoKey(c.getCursoKey())
                            .build())
                    .collect(Collectors.toList());
                    
            result.add(ProfesorAlumnoDTO.builder()
                    .id(s.getId())
                    .name(s.getName())
                    .email(s.getEmail())
                    .phone(s.getPhone())
                    .profileType(s.getProfileType() != null ? s.getProfileType().name() : null)
                    .status(s.getStatus() != null ? s.getStatus().name() : null)
                    .age(s.getAge())
                    .childName(s.getChildName())
                    .childAge(s.getChildAge())
                    .profileImageUrl(s.getProfileImageUrl())
                    .cursos(sharedCourses)
                    .build());
        }
        
        return ResponseEntity.ok(result);
    }

    private UUID getAuthenticatedUserId(Authentication auth) {
        String email = auth.getName();
        User user = userRepository.findByEmailActive(email)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
        return user.getId();
    }

    // ── Helper ─────────────────────────────────────────────────────────

    private Map<String, Object> toMap(Profesor p) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", p.getUsuarioId());
        map.put("especialidad", p.getEspecialidad());
        map.put("cursosAsignados", p.getCursosAsignados() != null ? p.getCursosAsignados() : "");
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
# 🔄 Migración de Controllers y DTOs - UUID Compatibility

## ⚠️ Problemas Identificados

| Componente | Problema | Ejemplos |
|-----------|----------|----------|
| **DTOs** | Usan `Long id` | `AuthDTOs.UserData` |
| **Controllers** | `@PathVariable Long id` | `UserController`, `AlumnoController`, `PostulacionController` |
| **Services** | Métodos con `Long id` parámetros | `UserService.getUserById(Long id)` |
| **Repositories** | Heredan `JpaRepository<T, Long>` | Todos los repositories |

---

## 🔧 Solución: Actualizar en 3 capas

### PASO 1: Actualizar DTOs (5 minutos)

**Archivo:** `AuthDTOs.java`

```java
package sudtalent.sudtalentproyecto.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.UUID;

public class AuthDTOs {

    public record LoginRequest(
            @Email @NotBlank String email,
            @NotBlank String password
    ) {}

    public record RegisterRequest(
            @NotBlank String name,
            @Email @NotBlank String email,
            @NotBlank String password
    ) {}

    public record PhoneLoginRequest(
            @NotBlank String phone
    ) {}

    public record PhoneRegisterRequest(
            @NotBlank String phone,
            String name,
            String email
    ) {}

    public record OnboardRequest(
            String name,
            String email,
            String profileType,
            String childName,
            Integer childAge,
            Integer age,
            String specialties,
            String bio
    ) {}

    // ✅ CAMBIO: UUID en lugar de Long
    public record UserData(
            UUID id,  // ← CAMBIO
            String name,
            String email,
            String phone,
            String role,
            boolean active,
            boolean onboarded,
            String profileType,
            String status
    ) {}

    public record AuthResponse(
            @JsonProperty("user")
            UserData user,
            @JsonProperty("requiresOnboarding")
            boolean requiresOnboarding,
            @JsonProperty("token")
            String token
    ) {}

    public record MessageResponse(String message) {}
}
```

---

### PASO 2: Actualizar AuthController (10 minutos)

**Archivo:** `AuthController.java`

```java
package sudtalent.sudtalentproyecto.controller;

import sudtalent.sudtalentproyecto.dto.AuthDTOs.*;
import sudtalent.sudtalentproyecto.model.User;
import sudtalent.sudtalentproyecto.repository.UserRepository;
import sudtalent.sudtalentproyecto.service.AuthService;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final UserRepository userRepository;

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest request,
                                   HttpServletResponse response) {
        try {
            return ResponseEntity.ok(authService.login(request, response));
        } catch (BadCredentialsException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(Map.of("message", "Correo o contraseña incorrectos."));
        } catch (DisabledException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(Map.of("message", "Tu cuenta ha sido desactivada. Contacta con soporte."));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("message", "Error al iniciar sesión: " + e.getMessage()));
        }
    }

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request,
                                                  HttpServletResponse response) {
        return ResponseEntity.ok(authService.register(request, response));
    }

    @PostMapping("/phone")
    public ResponseEntity<?> phoneAuth(@Valid @RequestBody PhoneRegisterRequest request,
                                       HttpServletResponse response) {
        try {
            return ResponseEntity.ok(authService.loginOrRegisterByPhone(request, response));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(Map.of("message", e.getMessage()));
        } catch (DisabledException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(Map.of("message", "Tu cuenta ha sido desactivada. Contacta con soporte."));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("message", "Error al iniciar sesión: " + e.getMessage()));
        }
    }

    @PostMapping("/onboard")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<AuthResponse> onboard(@AuthenticationPrincipal UserDetails userDetails,
                                                 @Valid @RequestBody OnboardRequest request) {
        User user = userRepository.findByEmail(userDetails.getUsername()).orElseThrow();
        return ResponseEntity.ok(authService.onboard(user.getId(), request));
    }

    @PostMapping("/logout")
    public ResponseEntity<MessageResponse> logout(HttpServletResponse response) {
        authService.logout(response);
        return ResponseEntity.ok(new MessageResponse("Sesión cerrada correctamente"));
    }

    @GetMapping("/me")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<AuthResponse> me(@AuthenticationPrincipal UserDetails userDetails) {
        User user = userRepository.findByEmail(userDetails.getUsername()).orElseThrow();
        
        UserData userData = new UserData(
                user.getId(),  // ← Ahora es UUID
                user.getName(),
                user.getEmail(),
                user.getPhone(),
                user.getRole().name(),
                user.isActive(),
                user.isOnboarded(),
                user.getProfileType() != null ? user.getProfileType().name() : null,
                user.getStatus() != null ? user.getStatus().name() : "PENDING"
        );
        return ResponseEntity.ok(new AuthResponse(userData, !user.isOnboarded(), null));
    }
}
```

---

### PASO 3: Actualizar UserService (15 minutos)

**Archivo:** `UserService.java`

```java
package sudtalent.sudtalentproyecto.service;

import sudtalent.sudtalentproyecto.model.User;
import sudtalent.sudtalentproyecto.repository.UserRepository;
import sudtalent.sudtalentproyecto.service.SoftDeleteService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class UserService {
    private final UserRepository userRepository;
    private final SoftDeleteService softDeleteService;
    private final PasswordEncoder passwordEncoder;
    
    public User createUser(User user) {
        if(userRepository.existsByEmail(user.getEmail())) {
            throw new IllegalArgumentException("El email ya está registrado");
        }
        user.setPassword(passwordEncoder.encode(user.getPassword()));
        user.setActive(true);
        return userRepository.save(user);
    }
    
    public List<User> getAllUsers() {
        return userRepository.findAllActive();  // ← Usa soft delete
    }
    
    // ✅ CAMBIO: UUID en lugar de Long
    public User getUserById(UUID id) {
        return userRepository.findByIdActive(id)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
    }
    
    public User updateUser(UUID id, User userUpdate) {
        User user = getUserById(id);
        if(userUpdate.getName() != null) user.setName(userUpdate.getName());
        if(userUpdate.getEmail() != null && !userUpdate.getEmail().equals(user.getEmail())) {
            if(userRepository.existsByEmail(userUpdate.getEmail())) {
                throw new IllegalArgumentException("El email ya está registrado");
            }
            user.setEmail(userUpdate.getEmail());
        }
        if(userUpdate.getPassword() != null && !userUpdate.getPassword().isEmpty()) {
            user.setPassword(passwordEncoder.encode(userUpdate.getPassword()));
        }
        if(userUpdate.getRole() != null) user.setRole(userUpdate.getRole());
        user.setActive(userUpdate.isActive());
        return userRepository.save(user);
    }
    
    // ✅ CAMBIO: Soft delete en lugar de hard delete
    public void deleteUser(UUID id) {
        if(!userRepository.existsById(id)) {
            throw new RuntimeException("Usuario no encontrado");
        }
        softDeleteService.softDeleteUser(id);
    }
    
    public User deactivateUser(UUID id) {
        User user = getUserById(id);
        user.setActive(false);
        return userRepository.save(user);
    }
}
```

---

### PASO 4: Actualizar UserController (10 minutos)

**Archivo:** `UserController.java`

```java
package sudtalent.sudtalentproyecto.controller;

import sudtalent.sudtalentproyecto.model.User;
import sudtalent.sudtalentproyecto.service.UserService;
import sudtalent.sudtalentproyecto.service.SoftDeleteService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {
    private final UserService userService;
    private final SoftDeleteService softDeleteService;
    
    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<Map<String, Object>>> getAllUsers() {
        List<Map<String, Object>> users = userService.getAllUsers().stream()
            .map(this::toSafeMap)
            .collect(Collectors.toList());
        return ResponseEntity.ok(users);
    }
    
    // ✅ CAMBIO: UUID en lugar de Long
    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()") 
    public ResponseEntity<Map<String, Object>> getUserById(@PathVariable UUID id) {
        return ResponseEntity.ok(toSafeMap(userService.getUserById(id)));
    }
    
    @PostMapping
    public ResponseEntity<User> createUser(@Valid @RequestBody User user) {
        return ResponseEntity.status(HttpStatus.CREATED).body(userService.createUser(user));
    }
    
    // ✅ CAMBIO: UUID en lugar de Long
    @PutMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<User> updateUser(@PathVariable UUID id, @Valid @RequestBody User userUpdate) {
        return ResponseEntity.ok(userService.updateUser(id, userUpdate));
    }
    
    // ✅ CAMBIO: Soft delete y UUID
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> deleteUser(@PathVariable UUID id) {
        try {
            softDeleteService.softDeleteUser(id);
            return ResponseEntity.ok(Map.of("message", "Usuario eliminado correctamente"));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(Map.of("error", "Usuario no encontrado"));
        }
    }

    // ✅ NUEVO: Endpoint para restaurar usuarios eliminados
    @PutMapping("/{id}/restore")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> restoreUser(@PathVariable UUID id) {
        try {
            User restored = softDeleteService.restoreUser(id);
            return ResponseEntity.ok(toSafeMap(restored));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(Map.of("error", "Usuario no encontrado"));
        }
    }

    @PostMapping("/{id}/deactivate")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<User> deactivateUser(@PathVariable UUID id) {
        return ResponseEntity.ok(userService.deactivateUser(id));
    }

    private Map<String, Object> toSafeMap(User u) {
        return Map.ofEntries(
            Map.entry("id", u.getId().toString()),  // ← Convertir UUID a String en JSON
            Map.entry("name", u.getName() != null ? u.getName() : ""),
            Map.entry("email", u.getEmail() != null ? u.getEmail() : ""),
            Map.entry("phone", u.getPhone() != null ? u.getPhone() : ""),
            Map.entry("role", u.getRole().name()),
            Map.entry("active", u.isActive()),
            Map.entry("onboarded", u.isOnboarded()),
            Map.entry("profileType", u.getProfileType() != null ? u.getProfileType().name() : ""),
            Map.entry("status", u.getStatus() != null ? u.getStatus().name() : "PENDING"),
            Map.entry("specialties", u.getSpecialties() != null ? u.getSpecialties() : ""),
            Map.entry("bio", u.getBio() != null ? u.getBio() : ""),
            Map.entry("createdAt", u.getCreatedAt().toString()),
            Map.entry("deletedAt", u.getDeletedAt() != null ? u.getDeletedAt().toString() : null)
        );
    }
}
```

---

### PASO 5: Actualizar AlumnoService y AlumnoController (15 minutos)

**Archivo:** `AlumnoService.java`

```java
package sudtalent.sudtalentproyecto.service;

import sudtalent.sudtalentproyecto.model.Alumno;
import sudtalent.sudtalentproyecto.repository.AlumnoRepository;
import sudtalent.sudtalentproyecto.service.SoftDeleteService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class AlumnoService {
    private final AlumnoRepository alumnoRepository;
    private final SoftDeleteService softDeleteService;
    
    public Alumno createAlumno(Alumno alumno) {
        return alumnoRepository.save(alumno);
    }
    
    public List<Alumno> getAllAlumnos() {
        return alumnoRepository.findAllActive();  // ← Soft delete
    }
    
    // ✅ CAMBIO: UUID
    public Alumno getAlumnoById(UUID id) {
        return alumnoRepository.findByIdActive(id)
                .orElseThrow(() -> new RuntimeException("Alumno no encontrado"));
    }
    
    // ✅ CAMBIO: UUID
    public Alumno updateAlumno(UUID id, Alumno alumnoUpdate) {
        Alumno alumno = getAlumnoById(id);
        if(alumnoUpdate.getFechaNacimiento() != null) {
            alumno.setFechaNacimiento(alumnoUpdate.getFechaNacimiento());
        }
        return alumnoRepository.save(alumno);
    }
    
    // ✅ CAMBIO: Soft delete
    public void deleteAlumno(UUID id) {
        softDeleteService.softDeleteAlumno(id);
    }
}
```

**Archivo:** `AlumnoController.java`

```java
package sudtalent.sudtalentproyecto.controller;

import sudtalent.sudtalentproyecto.model.Alumno;
import sudtalent.sudtalentproyecto.service.AlumnoService;
import sudtalent.sudtalentproyecto.service.SoftDeleteService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/alumnos")
@RequiredArgsConstructor
public class AlumnoController {
    private final AlumnoService alumnoService;
    private final SoftDeleteService softDeleteService;
    
    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<Alumno>> getAllAlumnos() {
        return ResponseEntity.ok(alumnoService.getAllAlumnos());
    }
    
    // ✅ CAMBIO: UUID
    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Alumno> getAlumnoById(@PathVariable UUID id) {
        return ResponseEntity.ok(alumnoService.getAlumnoById(id));
    }
    
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Alumno> createAlumno(@Valid @RequestBody Alumno alumno) {
        return ResponseEntity.status(HttpStatus.CREATED).body(alumnoService.createAlumno(alumno));
    }
    
    // ✅ CAMBIO: UUID
    @PutMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Alumno> updateAlumno(@PathVariable UUID id, @Valid @RequestBody Alumno alumnoUpdate) {
        return ResponseEntity.ok(alumnoService.updateAlumno(id, alumnoUpdate));
    }
    
    // ✅ CAMBIO: Soft delete
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> deleteAlumno(@PathVariable UUID id) {
        try {
            softDeleteService.softDeleteAlumno(id);
            return ResponseEntity.ok(Map.of("message", "Alumno eliminado correctamente"));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(Map.of("error", "Alumno no encontrado"));
        }
    }
}
```

---

### PASO 6: Actualizar PostulacionService y PostulacionController (15 minutos)

**Archivo:** `PostulacionService.java`

```java
package sudtalent.sudtalentproyecto.service;

import sudtalent.sudtalentproyecto.model.Postulacion;
import sudtalent.sudtalentproyecto.repository.PostulacionRepository;
import sudtalent.sudtalentproyecto.service.SoftDeleteService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class PostulacionService {
    private final PostulacionRepository postulacionRepository;
    private final SoftDeleteService softDeleteService;
    
    public Postulacion createPostulacion(Postulacion postulacion) {
        return postulacionRepository.save(postulacion);
    }
    
    public List<Postulacion> getAllPostulaciones() {
        return postulacionRepository.findAllActive();
    }
    
    // ✅ CAMBIO: UUID
    public Postulacion getPostulacionById(UUID id) {
        return postulacionRepository.findByIdActive(id)
                .orElseThrow(() -> new RuntimeException("Postulación no encontrada"));
    }
    
    // ✅ CAMBIO: UUID
    public List<Postulacion> getPostulacionesByAlumno(UUID alumnoId) {
        return postulacionRepository.findByAlumnoId(alumnoId);
    }
    
    // ✅ CAMBIO: UUID
    public List<Postulacion> getPostulacionesByConvocatoria(UUID convocatoriaId) {
        return postulacionRepository.findByConvocatoriaId(convocatoriaId);
    }
    
    // ✅ CAMBIO: UUID
    public Postulacion updatePostulacion(UUID id, Postulacion postulacionUpdate) {
        Postulacion postulacion = getPostulacionById(id);
        if(postulacionUpdate.getFechaPostulacion() != null) {
            postulacion.setFechaPostulacion(postulacionUpdate.getFechaPostulacion());
        }
        return postulacionRepository.save(postulacion);
    }
    
    // ✅ CAMBIO: Soft delete
    public void deletePostulacion(UUID id) {
        softDeleteService.softDeletePostulacion(id);
    }
}
```

**Archivo:** `PostulacionController.java`

```java
package sudtalent.sudtalentproyecto.controller;

import sudtalent.sudtalentproyecto.model.Postulacion;
import sudtalent.sudtalentproyecto.service.PostulacionService;
import sudtalent.sudtalentproyecto.service.SoftDeleteService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/postulaciones")
@RequiredArgsConstructor
public class PostulacionController {
    private final PostulacionService postulacionService;
    private final SoftDeleteService softDeleteService;
    
    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<Postulacion>> getAllPostulaciones() {
        return ResponseEntity.ok(postulacionService.getAllPostulaciones());
    }
    
    // ✅ CAMBIO: UUID
    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Postulacion> getPostulacionById(@PathVariable UUID id) {
        return ResponseEntity.ok(postulacionService.getPostulacionById(id));
    }
    
    // ✅ CAMBIO: UUID
    @GetMapping("/alumno/{alumnoId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<Postulacion>> getPostulacionesByAlumno(@PathVariable UUID alumnoId) {
        return ResponseEntity.ok(postulacionService.getPostulacionesByAlumno(alumnoId));
    }
    
    // ✅ CAMBIO: UUID
    @GetMapping("/convocatoria/{convocatoriaId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<Postulacion>> getPostulacionesByConvocatoria(@PathVariable UUID convocatoriaId) {
        return ResponseEntity.ok(postulacionService.getPostulacionesByConvocatoria(convocatoriaId));
    }
    
    @PostMapping
    @PreAuthorize("hasRole('ALUMNO')")
    public ResponseEntity<Postulacion> createPostulacion(@Valid @RequestBody Postulacion postulacion) {
        return ResponseEntity.status(HttpStatus.CREATED).body(postulacionService.createPostulacion(postulacion));
    }
    
    // ✅ CAMBIO: UUID
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ALUMNO')")
    public ResponseEntity<Postulacion> updatePostulacion(@PathVariable UUID id, @Valid @RequestBody Postulacion postulacionUpdate) {
        return ResponseEntity.ok(postulacionService.updatePostulacion(id, postulacionUpdate));
    }
    
    // ✅ CAMBIO: Soft delete
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> deletePostulacion(@PathVariable UUID id) {
        try {
            softDeleteService.softDeletePostulacion(id);
            return ResponseEntity.ok(Map.of("message", "Postulación eliminada correctamente"));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(Map.of("error", "Postulación no encontrada"));
        }
    }
}
```

---

### PASO 7: Actualizar Repositories (30 segundos)

```java
// Ejemplo: UserRepository
package sudtalent.sudtalentproyecto.repository;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import sudtalent.sudtalentproyecto.model.User;

@Repository
public interface UserRepository extends SoftDeleteRepository<User, UUID> {  // ← CAMBIO UUID
    
    @Query("SELECT u FROM User u WHERE u.email = ?1 AND u.deletedAt IS NULL")
    Optional<User> findByEmailActive(String email);
    
    @Query("SELECT u FROM User u WHERE u.phone = ?1 AND u.deletedAt IS NULL")
    Optional<User> findByPhoneActive(String phone);
    
    boolean existsByEmail(String email);
}
```

**Actualizar base de SoftDeleteRepository:**

```java
package sudtalent.sudtalentproyecto.repository;

import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.NoRepositoryBean;

@NoRepositoryBean
public interface SoftDeleteRepository<T, ID> extends JpaRepository<T, UUID> {  // ← CAMBIO
    
    @Query("SELECT e FROM #{#entityName} e WHERE e.deletedAt IS NULL")
    java.util.List<T> findAllActive();
    
    @Query("SELECT e FROM #{#entityName} e WHERE e.id = ?1 AND e.deletedAt IS NULL")
    java.util.Optional<T> findByIdActive(UUID id);  // ← CAMBIO
}
```

---

## 📋 Checklist de Actualización

### Controllers (9 archivos)
- [ ] AuthController
- [ ] UserController
- [ ] AlumnoController
- [ ] ProfesorController
- [ ] ConvocatoriaController
- [ ] PostulacionController
- [ ] AdministradorController
- [ ] ProfileController
- [ ] WhitelistController

### Services (9 archivos)
- [ ] AuthService
- [ ] UserService
- [ ] AlumnoService
- [ ] ProfesorService
- [ ] ConvocatoriaService
- [ ] PostulacionService
- [ ] AdministradorService
- [ ] ProfileService
- [ ] WhitelistService

### DTOs (1 archivo)
- [ ] AuthDTOs.java

### Repositories (9 interfaces)
- [ ] SoftDeleteRepository (base)
- [ ] UserRepository
- [ ] AlumnoRepository
- [ ] ProfesorRepository
- [ ] ConvocatoriaRepository
- [ ] PostulacionRepository
- [ ] AdministradorRepository
- [ ] ProfileRepository
- [ ] WhitelistNumberRepository

---

## ⏱️ Tiempo Estimado

| Tarea | Tiempo |
|-------|--------|
| Actualizar DTOs | 5 min |
| Actualizar 9 Controllers | 45 min |
| Actualizar 9 Services | 60 min |
| Actualizar Repositories | 15 min |
| **Total** | **~2 horas** |

---

## 🧪 Testing Post-Cambios

```bash
# 1. Compilar
mvn clean compile

# 2. Test unitarios
mvn test

# 3. Verificar tipos
mvn spring-boot:run
```

---

## 🚨 Errores Comunes

| Error | Causa | Solución |
|-------|-------|----------|
| `incompatible types: Long vs UUID` | No actualizó parámetro | Cambiar `Long id` → `UUID id` |
| `cannot find symbol: UUID` | Falta import | `import java.util.UUID;` |
| `No converter found` | JSON no serializa UUID | Usar `toString()` o `@JsonSerialize` |
| `type UUID of id field not compatible` | Entity aún es Long | Verificar que `@GeneratedValue(strategy = GenerationType.UUID)` |

---

## 📝 Orden Recomendado de Actualización

1. **DTOs first** (más rápido, sin dependencias)
2. **Entities** (ya hechas en plan anterior)
3. **Repositories** (base para todo)
4. **Services** (usan repositories)
5. **Controllers** (usan services)
6. **Test y compile**
7. **Deploy**

---

## ✅ Validación Final

Después de actualizar todo:

```bash
# Compile check
mvn clean compile -q

# Run tests
mvn test -q

# Check UUID in responses
curl http://localhost:8080/api/users | jq '.[] | .id'
# Output debe ser UUID, no 1, 2, 3...
```


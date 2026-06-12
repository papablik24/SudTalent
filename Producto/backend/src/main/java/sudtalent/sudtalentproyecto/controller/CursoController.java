package sudtalent.sudtalentproyecto.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import sudtalent.sudtalentproyecto.dto.CursoDTO;
import sudtalent.sudtalentproyecto.model.User;
import sudtalent.sudtalentproyecto.repository.UserRepository;
import sudtalent.sudtalentproyecto.service.CursoService;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/cursos")
@RequiredArgsConstructor
public class CursoController {

    private final CursoService cursoService;
    private final UserRepository userRepository;

    // ── GET: todos los cursos ─────────────────────────────────────
    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<CursoDTO>> getAllCursos() {
        return ResponseEntity.ok(cursoService.getAllCursos());
    }

    // ── GET: cursos del alumno autenticado ────────────────────────
    @GetMapping("/mis-cursos")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<CursoDTO>> getMisCursos(Authentication auth) {
        UUID alumnoId = getAuthenticatedUserId(auth);
        return ResponseEntity.ok(cursoService.getCursosByAlumno(alumnoId));
    }

    // ── GET: curso por id ─────────────────────────────────────────
    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<CursoDTO> getCursoById(@PathVariable UUID id) {
        return ResponseEntity.ok(cursoService.getCursoById(id));
    }

    // ── PUT: asignar profesor (solo admin) ────────────────────────
    @PutMapping("/{id}/profesor")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public ResponseEntity<CursoDTO> assignProfesor(
            @PathVariable UUID id,
            @RequestBody Map<String, String> body) {
        String profesorIdStr = body.get("profesorId");
        UUID profesorId = (profesorIdStr == null || profesorIdStr.isBlank())
                ? null
                : UUID.fromString(profesorIdStr);
        return ResponseEntity.ok(cursoService.assignProfesor(id, profesorId));
    }

    // ── POST: inscribirse en un curso (alumno) ────────────────────
    @PostMapping("/{id}/enroll")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<CursoDTO> enroll(@PathVariable UUID id, Authentication auth) {
        UUID alumnoId = getAuthenticatedUserId(auth);
        return ResponseEntity.ok(cursoService.enroll(id, alumnoId));
    }

    // ── DELETE: desinscribirse de un curso (alumno) ───────────────
    @DeleteMapping("/{id}/enroll")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<CursoDTO> unenroll(@PathVariable UUID id, Authentication auth) {
        UUID alumnoId = getAuthenticatedUserId(auth);
        return ResponseEntity.ok(cursoService.unenroll(id, alumnoId));
    }

    // ── Admin: ver alumnos de un curso ────────────────────────────
    @GetMapping("/{id}/alumnos")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public ResponseEntity<List<CursoDTO.AlumnoResumenDTO>> getAlumnosByCurso(@PathVariable UUID id) {
        CursoDTO curso = cursoService.getCursoById(id);
        return ResponseEntity.ok(curso.getAlumnos());
    }

    @GetMapping("/profesor/{profesorId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<CursoDTO>> getCursosByProfesor(@PathVariable UUID profesorId) {
        return ResponseEntity.ok(cursoService.getCursosByProfesor(profesorId));
    }

    @PutMapping("/asignar/{profesorId}")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public ResponseEntity<Void> asignarCursos(@PathVariable UUID profesorId, @RequestBody List<UUID> cursoIds) {
        cursoService.asignarCursosAProfesor(profesorId, cursoIds);
        return ResponseEntity.noContent().build();
    }

    // ── Helpers ───────────────────────────────────────────────────
    private UUID getAuthenticatedUserId(Authentication auth) {
        String email = auth.getName();
        User user = userRepository.findByEmailActive(email)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
        return user.getId();
    }
}

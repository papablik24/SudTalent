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
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
package sudtalent.sudtalentproyecto.controller;

import sudtalent.sudtalentproyecto.model.Postulacion;
import sudtalent.sudtalentproyecto.service.PostulacionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;
import java.util.List;

@RestController
@RequestMapping("/api/postulaciones")
@RequiredArgsConstructor
public class PostulacionController {
    private final PostulacionService postulacionService;
    
    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<Postulacion>> getAllPostulaciones() {
        return ResponseEntity.ok(postulacionService.getAllPostulaciones());
    }
    
    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Postulacion> getPostulacionById(@PathVariable Long id) {
        return ResponseEntity.ok(postulacionService.getPostulacionById(id));
    }
    
    @GetMapping("/alumno/{alumnoId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<Postulacion>> getPostulacionesByAlumno(@PathVariable Long alumnoId) {
        return ResponseEntity.ok(postulacionService.getPostulacionesByAlumno(alumnoId));
    }
    
    @GetMapping("/convocatoria/{convocatoriaId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<Postulacion>> getPostulacionesByConvocatoria(@PathVariable Long convocatoriaId) {
        return ResponseEntity.ok(postulacionService.getPostulacionesByConvocatoria(convocatoriaId));
    }
    
    @PostMapping
    @PreAuthorize("hasRole('ALUMNO')")
    public ResponseEntity<Postulacion> createPostulacion(@Valid @RequestBody Postulacion postulacion) {
        return ResponseEntity.status(HttpStatus.CREATED).body(postulacionService.createPostulacion(postulacion));
    }
    
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ALUMNO')")
    public ResponseEntity<Postulacion> updatePostulacion(@PathVariable Long id, @Valid @RequestBody Postulacion postulacionUpdate) {
        return ResponseEntity.ok(postulacionService.updatePostulacion(id, postulacionUpdate));
    }
    
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deletePostulacion(@PathVariable Long id) {
        postulacionService.deletePostulacion(id);
        return ResponseEntity.noContent().build();
    }
}
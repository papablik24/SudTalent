package sudtalent.sudtalentproyecto.controller;

import sudtalent.sudtalentproyecto.model.Convocatoria;
import sudtalent.sudtalentproyecto.service.ConvocatoriaService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;
import java.util.List;

@RestController
@RequestMapping("/api/convocatorias")
@RequiredArgsConstructor
public class ConvocatoriaController {
    private final ConvocatoriaService convocatoriaService;
    
    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<Convocatoria>> getAllConvocatorias() {
        return ResponseEntity.ok(convocatoriaService.getAllConvocatorias());
    }
    
    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Convocatoria> getConvocatoriaById(@PathVariable Long id) {
        return ResponseEntity.ok(convocatoriaService.getConvocatoriaById(id));
    }
    
    @GetMapping("/profesor/{profesorId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<Convocatoria>> getConvocatoriasByProfesor(@PathVariable Long profesorId) {
        return ResponseEntity.ok(convocatoriaService.getConvocatoriasByProfesor(profesorId));
    }
    
    @GetMapping("/estado/{estado}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<Convocatoria>> getConvocatoriasByEstado(@PathVariable String estado) {
        return ResponseEntity.ok(convocatoriaService.getConvocatoriasByEstado(estado));
    }
    
    @PostMapping
    @PreAuthorize("hasRole('PROFESOR')")
    public ResponseEntity<Convocatoria> createConvocatoria(@Valid @RequestBody Convocatoria convocatoria) {
        return ResponseEntity.status(HttpStatus.CREATED).body(convocatoriaService.createConvocatoria(convocatoria));
    }
    
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('PROFESOR')")
    public ResponseEntity<Convocatoria> updateConvocatoria(@PathVariable Long id, @Valid @RequestBody Convocatoria convocatoriaUpdate) {
        return ResponseEntity.ok(convocatoriaService.updateConvocatoria(id, convocatoriaUpdate));
    }
    
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('PROFESOR')")
    public ResponseEntity<Void> deleteConvocatoria(@PathVariable Long id) {
        convocatoriaService.deleteConvocatoria(id);
        return ResponseEntity.noContent().build();
    }
}
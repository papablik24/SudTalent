package sudtalent.sudtalentproyecto.controller;

import sudtalent.sudtalentproyecto.dto.ConvocatoriaDTO;
import sudtalent.sudtalentproyecto.dto.ConvocatoriaRequestDTO;
import sudtalent.sudtalentproyecto.service.ConvocatoriaService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/convocatorias")
@RequiredArgsConstructor
public class ConvocatoriaController {

    private final ConvocatoriaService convocatoriaService;

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<ConvocatoriaDTO>> getAllConvocatorias() {
        return ResponseEntity.ok(convocatoriaService.getAllConvocatorias());
    }

    /** Devuelve solo las convocatorias en estado ACTIVA — usada por la vista de alumnos */
    @GetMapping("/activas")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<ConvocatoriaDTO>> getConvocatoriasActivas() {
        return ResponseEntity.ok(convocatoriaService.getConvocatoriasActivas());
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ConvocatoriaDTO> getConvocatoriaById(@PathVariable UUID id) {
        return ResponseEntity.ok(convocatoriaService.getConvocatoriaById(id));
    }

    @GetMapping("/profesor/{profesorId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<ConvocatoriaDTO>> getConvocatoriasByProfesor(@PathVariable UUID profesorId) {
        return ResponseEntity.ok(convocatoriaService.getConvocatoriasByProfesor(profesorId));
    }

    @GetMapping("/estado/{estado}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<ConvocatoriaDTO>> getConvocatoriasByEstado(@PathVariable String estado) {
        return ResponseEntity.ok(convocatoriaService.getConvocatoriasByEstado(estado));
    }

    @PostMapping
    @PreAuthorize("hasAnyAuthority('ROLE_PROFESOR', 'ROLE_ADMIN')")
    public ResponseEntity<ConvocatoriaDTO> createConvocatoria(@Valid @RequestBody ConvocatoriaRequestDTO request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(convocatoriaService.createConvocatoria(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('ROLE_PROFESOR', 'ROLE_ADMIN')")
    public ResponseEntity<ConvocatoriaDTO> updateConvocatoria(
            @PathVariable UUID id,
            @Valid @RequestBody ConvocatoriaRequestDTO request) {
        return ResponseEntity.ok(convocatoriaService.updateConvocatoria(id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('ROLE_PROFESOR', 'ROLE_ADMIN')")
    public ResponseEntity<Void> deleteConvocatoria(@PathVariable UUID id) {
        convocatoriaService.deleteConvocatoria(id);
        return ResponseEntity.noContent().build();
    }
}

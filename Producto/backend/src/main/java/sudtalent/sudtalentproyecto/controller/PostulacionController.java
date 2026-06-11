package sudtalent.sudtalentproyecto.controller;

import sudtalent.sudtalentproyecto.dto.PostulacionDTO;
import sudtalent.sudtalentproyecto.dto.PostulacionRequestDTO;
import sudtalent.sudtalentproyecto.service.PostulacionService;
import sudtalent.sudtalentproyecto.service.SoftDeleteService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
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
    public ResponseEntity<List<PostulacionDTO>> getAllPostulaciones() {
        return ResponseEntity.ok(postulacionService.getAllPostulaciones());
    }
    
    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<PostulacionDTO> getPostulacionById(@PathVariable UUID id) {
        return ResponseEntity.ok(postulacionService.getPostulacionById(id));
    }
    
    @GetMapping("/alumno/{alumnoId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<PostulacionDTO>> getPostulacionesByAlumno(@PathVariable UUID alumnoId) {
        return ResponseEntity.ok(postulacionService.getPostulacionesByAlumno(alumnoId));
    }
    
    @GetMapping("/convocatoria/{convocatoriaId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<PostulacionDTO>> getPostulacionesByConvocatoria(@PathVariable UUID convocatoriaId) {
        return ResponseEntity.ok(postulacionService.getPostulacionesByConvocatoria(convocatoriaId));
    }

    /** Crear postulación usando DTO — acepta alumnoId o lo extrae del JWT */
    @PostMapping
    @PreAuthorize("hasAnyAuthority('ROLE_ALUMNO', 'ROLE_ADMIN')")
    public ResponseEntity<PostulacionDTO> createPostulacion(
            @Valid @RequestBody PostulacionRequestDTO request,
            Authentication authentication) {
        PostulacionDTO created = postulacionService.createPostulacion(request, authentication);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }
    
    /** Actualizar estado / mensaje / demo de postulación */
    @PutMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<PostulacionDTO> updatePostulacion(
            @PathVariable UUID id,
            @RequestBody Map<String, String> body,
            Authentication authentication) {
        String estado = body.get("estado");
        String mensaje = body.get("mensaje");
        String voiceAudioIdStr = body.get("voiceAudioId");
        UUID voiceAudioId = null;
        if (voiceAudioIdStr != null && !voiceAudioIdStr.trim().isEmpty() && !voiceAudioIdStr.equals("undefined")) {
            voiceAudioId = UUID.fromString(voiceAudioIdStr);
        }
        return ResponseEntity.ok(postulacionService.updatePostulacion(id, estado, mensaje, voiceAudioId, authentication));
    }
    
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
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
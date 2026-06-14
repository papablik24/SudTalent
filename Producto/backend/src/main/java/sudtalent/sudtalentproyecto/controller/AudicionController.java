package sudtalent.sudtalentproyecto.controller;

import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import lombok.RequiredArgsConstructor;
import sudtalent.sudtalentproyecto.dto.AudicionDTO;
import sudtalent.sudtalentproyecto.dto.AudicionRequestDTO;
import sudtalent.sudtalentproyecto.dto.AudicionEvaluacionRequestDTO;
import sudtalent.sudtalentproyecto.service.AudicionService;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class AudicionController {

    private final AudicionService audicionService;

    // ── ADMIN ENDPOINTS ──────────────────────────────────────────────────

    @GetMapping("/audiciones")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ADMIN')")
    public ResponseEntity<List<AudicionDTO>> getAllAudiciones() {
        return ResponseEntity.ok(audicionService.listarTodas());
    }

    @PostMapping("/audiciones")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ADMIN')")
    public ResponseEntity<AudicionDTO> programarAudicion(
            @RequestBody AudicionRequestDTO request) {
        AudicionDTO created = audicionService.programarAudicion(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/audiciones/{id}/cancelar")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ADMIN')")
    public ResponseEntity<AudicionDTO> cancelarAudicion(
            @PathVariable UUID id) {
        return ResponseEntity.ok(audicionService.cancelarAudicion(id));
    }

    // ── PROFESOR ENDPOINTS ───────────────────────────────────────────────

    @GetMapping("/profesores/me/audiciones")
    @PreAuthorize("hasAnyAuthority('ROLE_PROFESOR', 'PROFESOR')")
    public ResponseEntity<List<AudicionDTO>> getMisAudiciones(
            Authentication authentication) {
        return ResponseEntity.ok(audicionService.listarPorProfesorLogueado(authentication));
    }

    @PutMapping("/profesores/me/audiciones/{id}/evaluacion")
    @PreAuthorize("hasAnyAuthority('ROLE_PROFESOR', 'PROFESOR')")
    public ResponseEntity<AudicionDTO> evaluarAudicion(
            @PathVariable UUID id,
            @RequestBody AudicionEvaluacionRequestDTO request,
            Authentication authentication) {
        return ResponseEntity.ok(audicionService.evaluarAudicion(id, request, authentication));
    }
}

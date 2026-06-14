package sudtalent.sudtalentproyecto.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import sudtalent.sudtalentproyecto.dto.AgendaEventoDTO;
import sudtalent.sudtalentproyecto.dto.AgendaEventoRequestDTO;
import sudtalent.sudtalentproyecto.model.User;
import sudtalent.sudtalentproyecto.repository.UserRepository;
import sudtalent.sudtalentproyecto.service.AgendaEventoService;

import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@Validated
public class AgendaEventoController {

    private final AgendaEventoService agendaEventoService;
    private final UserRepository userRepository;

    @GetMapping("/profesores/me/agenda")
    @PreAuthorize("hasAuthority('ROLE_PROFESOR')")
    public ResponseEntity<List<AgendaEventoDTO>> getMyAgenda(Authentication auth) {
        UUID profesorId = getAuthenticatedUserId(auth);
        return ResponseEntity.ok(agendaEventoService.getAgendaByProfesor(profesorId));
    }

    @PostMapping("/profesores/me/agenda")
    @PreAuthorize("hasAuthority('ROLE_PROFESOR')")
    public ResponseEntity<AgendaEventoDTO> createEvento(
            @Valid @RequestBody AgendaEventoRequestDTO request,
            Authentication auth) {
        UUID profesorId = getAuthenticatedUserId(auth);
        AgendaEventoDTO created = agendaEventoService.createEvento(
                profesorId,
                request.getCursoId(),
                request.getTitulo(),
                request.getDescripcion(),
                request.getFecha(),
                request.getHora(),
                request.getLink()
        );
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/profesores/me/agenda/{id}")
    @PreAuthorize("hasAuthority('ROLE_PROFESOR')")
    public ResponseEntity<AgendaEventoDTO> updateEvento(
            @PathVariable UUID id,
            @Valid @RequestBody AgendaEventoRequestDTO request,
            Authentication auth) {
        UUID profesorId = getAuthenticatedUserId(auth);
        AgendaEventoDTO updated = agendaEventoService.updateEvento(
                profesorId,
                id,
                request.getCursoId(),
                request.getTitulo(),
                request.getDescripcion(),
                request.getFecha(),
                request.getHora(),
                request.getLink()
        );
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/profesores/me/agenda/{id}")
    @PreAuthorize("hasAuthority('ROLE_PROFESOR')")
    public ResponseEntity<Void> deleteEvento(
            @PathVariable UUID id,
            Authentication auth) {
        UUID profesorId = getAuthenticatedUserId(auth);
        agendaEventoService.deleteEvento(profesorId, id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/cursos/{cursoId}/agenda")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<AgendaEventoDTO>> getCursoAgenda(
            @PathVariable UUID cursoId,
            Authentication auth) {
        User user = getAuthenticatedUser(auth);
        List<AgendaEventoDTO> agenda = agendaEventoService.getAgendaByCurso(cursoId, user.getId(), user.getRole());
        return ResponseEntity.ok(agenda);
    }

    private User getAuthenticatedUser(Authentication auth) {
        return userRepository.findByEmailActive(auth.getName())
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
    }

    private UUID getAuthenticatedUserId(Authentication auth) {
        return getAuthenticatedUser(auth).getId();
    }
}

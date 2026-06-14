package sudtalent.sudtalentproyecto.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import sudtalent.sudtalentproyecto.dto.NotificacionDTO;
import sudtalent.sudtalentproyecto.model.Notificacion;
import sudtalent.sudtalentproyecto.model.User;
import sudtalent.sudtalentproyecto.repository.UserRepository;
import sudtalent.sudtalentproyecto.service.NotificacionService;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/notificaciones")
@RequiredArgsConstructor
public class NotificacionController {

    private final NotificacionService notificacionService;
    private final UserRepository userRepository;

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<NotificacionDTO>> getMyNotifications(Authentication auth) {
        User user = getAuthenticatedUser(auth);
        List<NotificacionDTO> dtos = notificacionService.listarMisNotificaciones(user).stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
        return ResponseEntity.ok(dtos);
    }

    @GetMapping("/unread-count")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, Long>> getUnreadCount(Authentication auth) {
        User user = getAuthenticatedUser(auth);
        long count = notificacionService.contarNoLeidas(user);
        Map<String, Long> response = new HashMap<>();
        response.put("count", count);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}/leer")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Void> markAsRead(@PathVariable UUID id, Authentication auth) {
        User user = getAuthenticatedUser(auth);
        notificacionService.marcarComoLeida(id, user);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/leer-todas")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Void> markAllAsRead(Authentication auth) {
        User user = getAuthenticatedUser(auth);
        notificacionService.marcarTodasComoLeidas(user);
        return ResponseEntity.noContent().build();
    }

    private User getAuthenticatedUser(Authentication auth) {
        String email = auth.getName();
        return userRepository.findByEmailActive(email)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
    }

    private NotificacionDTO toDTO(Notificacion n) {
        return NotificacionDTO.builder()
                .id(n.getId())
                .titulo(n.getTitulo())
                .mensaje(n.getMensaje())
                .tipo(n.getTipo())
                .leido(n.isLeido())
                .fechaCreacion(n.getFechaCreacion())
                .referenciaId(n.getReferenciaId())
                .referenciaTipo(n.getReferenciaTipo())
                .build();
    }
}

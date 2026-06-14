package sudtalent.sudtalentproyecto.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import sudtalent.sudtalentproyecto.model.Notificacion;
import sudtalent.sudtalentproyecto.model.User;
import sudtalent.sudtalentproyecto.repository.NotificacionRepository;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class NotificacionService {

    private final NotificacionRepository notificacionRepository;

    public Notificacion crearNotificacion(User usuario, String titulo, String mensaje, String tipo, UUID referenciaId, String referenciaTipo) {
        if (usuario == null) {
            throw new IllegalArgumentException("El usuario destinatario no puede ser nulo");
        }
        Notificacion notificacion = Notificacion.builder()
                .usuario(usuario)
                .titulo(titulo)
                .mensaje(mensaje)
                .tipo(tipo)
                .referenciaId(referenciaId)
                .referenciaTipo(referenciaTipo)
                .leido(false)
                .fechaCreacion(LocalDateTime.now())
                .build();
        return notificacionRepository.save(notificacion);
    }

    public void crearNotificacionesParaUsuarios(Collection<User> usuarios, String titulo, String mensaje, String tipo, UUID referenciaId, String referenciaTipo) {
        if (usuarios == null || usuarios.isEmpty()) {
            return;
        }
        for (User user : usuarios) {
            crearNotificacion(user, titulo, mensaje, tipo, referenciaId, referenciaTipo);
        }
    }

    @Transactional(readOnly = true)
    public List<Notificacion> listarMisNotificaciones(User usuario) {
        if (usuario == null) {
            throw new IllegalArgumentException("Usuario no autenticado");
        }
        return notificacionRepository.findByUsuarioIdOrderByFechaCreacionDesc(usuario.getId());
    }

    @Transactional(readOnly = true)
    public long contarNoLeidas(User usuario) {
        if (usuario == null) {
            throw new IllegalArgumentException("Usuario no autenticado");
        }
        return notificacionRepository.countByUsuarioIdAndLeidoFalse(usuario.getId());
    }

    public void marcarComoLeida(UUID id, User usuario) {
        if (usuario == null) {
            throw new IllegalArgumentException("Usuario no autenticado");
        }
        Notificacion notificacion = notificacionRepository.findByIdAndUsuarioId(id, usuario.getId())
                .orElseThrow(() -> new RuntimeException("Notificación no encontrada o no pertenece al usuario"));
        notificacion.setLeido(true);
        notificacionRepository.save(notificacion);
    }

    public void marcarTodasComoLeidas(User usuario) {
        if (usuario == null) {
            throw new IllegalArgumentException("Usuario no autenticado");
        }
        List<Notificacion> noLeidas = notificacionRepository.findByUsuarioIdOrderByFechaCreacionDesc(usuario.getId());
        for (Notificacion notif : noLeidas) {
            if (!notif.isLeido()) {
                notif.setLeido(true);
            }
        }
        notificacionRepository.saveAll(noLeidas);
    }
}

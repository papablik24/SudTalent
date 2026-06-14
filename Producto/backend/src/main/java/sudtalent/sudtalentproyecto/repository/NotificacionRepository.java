package sudtalent.sudtalentproyecto.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import sudtalent.sudtalentproyecto.model.Notificacion;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface NotificacionRepository extends JpaRepository<Notificacion, UUID> {

    List<Notificacion> findByUsuarioIdOrderByFechaCreacionDesc(UUID usuarioId);

    long countByUsuarioIdAndLeidoFalse(UUID usuarioId);

    Optional<Notificacion> findByIdAndUsuarioId(UUID id, UUID usuarioId);
}

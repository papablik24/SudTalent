package sudtalent.sudtalentproyecto.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import sudtalent.sudtalentproyecto.model.AgendaEvento;
import java.util.List;
import java.util.UUID;

public interface AgendaEventoRepository extends JpaRepository<AgendaEvento, UUID> {

    List<AgendaEvento> findByProfesorIdOrderByFechaAscHoraAsc(UUID profesorId);

    List<AgendaEvento> findByCursoIdOrderByFechaAscHoraAsc(UUID cursoId);
}

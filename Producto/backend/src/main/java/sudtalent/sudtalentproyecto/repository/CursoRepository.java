package sudtalent.sudtalentproyecto.repository;

import sudtalent.sudtalentproyecto.model.Curso;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;
import java.util.List;

public interface CursoRepository extends JpaRepository<Curso, UUID> {
    List<Curso> findByProfesorUsuarioId(UUID profesorId);
}

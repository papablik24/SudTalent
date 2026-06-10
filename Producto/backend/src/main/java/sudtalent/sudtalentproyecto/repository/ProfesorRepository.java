package sudtalent.sudtalentproyecto.repository;

import sudtalent.sudtalentproyecto.model.Profesor;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;

public interface ProfesorRepository extends JpaRepository<Profesor, UUID>{
    // findById ya está heredado de JpaRepository
}
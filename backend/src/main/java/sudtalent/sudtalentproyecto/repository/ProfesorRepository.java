package sudtalent.sudtalentproyecto.repository;

import sudtalent.sudtalentproyecto.model.Profesor;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProfesorRepository extends JpaRepository<Profesor, Long>{
    // findById ya está heredado de JpaRepository
}
package sudtalent.sudtalentproyecto.repository;

import sudtalent.sudtalentproyecto.model.Alumno;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AlumnoRepository extends JpaRepository<Alumno, Long>{
    // findById ya está heredado de JpaRepository
}
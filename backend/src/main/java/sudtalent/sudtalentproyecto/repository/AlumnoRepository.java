package sudtalent.sudtalentproyecto.repository;

import sudtalent.sudtalentproyecto.model.Alumno;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface AlumnoRepository extends JpaRepository<Alumno, Long>{
}


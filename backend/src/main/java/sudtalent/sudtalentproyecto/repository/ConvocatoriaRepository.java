package sudtalent.sudtalentproyecto.repository;

import sudtalent.sudtalentproyecto.model.Convocatoria;
import sudtalent.sudtalentproyecto.model.Profesor;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ConvocatoriaRepository extends JpaRepository<Convocatoria, Long>{
    List<Convocatoria> findByProfesor(Profesor profesor);
    List<Convocatoria> findByEstado(String estado);
}
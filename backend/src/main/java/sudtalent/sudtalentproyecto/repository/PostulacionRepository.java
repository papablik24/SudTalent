package sudtalent.sudtalentproyecto.repository;

import sudtalent.sudtalentproyecto.model.Alumno;
import sudtalent.sudtalentproyecto.model.Convocatoria;
import sudtalent.sudtalentproyecto.model.Postulacion;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface PostulacionRepository extends JpaRepository<Postulacion, Long>{
    List<Postulacion> findByAlumno(Alumno alumno);
    List<Postulacion> findByConvocatoria(Convocatoria convocatoria);
}
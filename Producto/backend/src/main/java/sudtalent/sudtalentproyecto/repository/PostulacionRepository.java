package sudtalent.sudtalentproyecto.repository;

import sudtalent.sudtalentproyecto.model.Postulacion;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PostulacionRepository extends SoftDeleteRepository<Postulacion> {
    
    @Query("SELECT p FROM Postulacion p WHERE p.deletedAt IS NULL")
    List<Postulacion> findAllActive();
    
    @Query("SELECT p FROM Postulacion p WHERE p.id = ?1 AND p.deletedAt IS NULL")
    Optional<Postulacion> findByIdActive(UUID id);
    
    @Query("SELECT p FROM Postulacion p WHERE p.alumno.id = ?1 AND p.deletedAt IS NULL")
    List<Postulacion> findByAlumnoId(UUID alumnoId);
    
    @Query("SELECT p FROM Postulacion p WHERE p.convocatoria.id = ?1 AND p.deletedAt IS NULL")
    List<Postulacion> findByConvocatoriaId(UUID convocatoriaId);
}
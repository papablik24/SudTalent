package sudtalent.sudtalentproyecto.repository;

import sudtalent.sudtalentproyecto.model.Postulacion;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PostulacionRepository extends SoftDeleteRepository<Postulacion> {
    
    @Query("SELECT p FROM Postulacion p WHERE p.deletedAt IS NULL")
    List<Postulacion> findAllActive();
    
    @Query("SELECT p FROM Postulacion p WHERE p.id = ?1 AND p.deletedAt IS NULL")
    Optional<Postulacion> findByIdActive(UUID id);
    
    @Query("SELECT p FROM Postulacion p WHERE p.alumno.id = ?1 AND p.deletedAt IS NULL")
    List<Postulacion> findByAlumnoId(UUID alumnoId);
    
    @Query("SELECT p FROM Postulacion p WHERE p.convocatoria.id = ?1 AND p.deletedAt IS NULL")
    List<Postulacion> findByConvocatoriaId(UUID convocatoriaId);
    
    @Query("SELECT p.convocatoria.id, COUNT(p) FROM Postulacion p WHERE p.deletedAt IS NULL AND p.estado != 'CANCELADA' GROUP BY p.convocatoria.id")
    List<Object[]> countActivePostulacionesGroupedByConvocatoria();

    @Query("SELECT COUNT(p) FROM Postulacion p WHERE p.convocatoria.id = ?1 AND p.deletedAt IS NULL AND p.estado != 'CANCELADA'")
    long countActiveByConvocatoriaId(UUID convocatoriaId);

    @Query("SELECT COUNT(p) FROM Postulacion p WHERE p.alumno.id = ?1")
    long countAllByAlumnoId(UUID alumnoId);

    @Query("SELECT p FROM Postulacion p WHERE p.alumno.id = ?1 AND p.convocatoria.id = ?2")
    List<Postulacion> findByAlumnoIdAndConvocatoriaId(UUID alumnoId, UUID convocatoriaId);
}
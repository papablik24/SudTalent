package sudtalent.sudtalentproyecto.repository;

import sudtalent.sudtalentproyecto.model.Convocatoria;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.List;
import java.util.UUID;

public interface ConvocatoriaRepository extends SoftDeleteRepository<Convocatoria>{
    @Query("SELECT c FROM Convocatoria c WHERE c.profesor.usuarioId = ?1 AND c.deletedAt IS NULL")
    List<Convocatoria> findByProfesorId(UUID profesorId);
    
    @Query("SELECT c FROM Convocatoria c WHERE c.estado = ?1 AND c.deletedAt IS NULL")
    List<Convocatoria> findByEstado(String estado);
}
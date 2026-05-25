package sudtalent.sudtalentproyecto.repository;

import sudtalent.sudtalentproyecto.model.Convocatoria;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.List;
import java.util.UUID;

public interface ConvocatoriaRepository extends JpaRepository<Convocatoria, UUID>{
    @Query("SELECT c FROM Convocatoria c WHERE c.profesor.usuarioId = ?1")
    List<Convocatoria> findByProfesorId(UUID profesorId);
    
    List<Convocatoria> findByEstado(String estado);
}
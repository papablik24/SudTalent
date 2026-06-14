package sudtalent.sudtalentproyecto.repository;

import sudtalent.sudtalentproyecto.model.Audicion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.UUID;

public interface AudicionRepository extends JpaRepository<Audicion, UUID> {
    
    @Query("SELECT a FROM Audicion a WHERE a.profesor.usuarioId = ?1")
    List<Audicion> findByProfesorId(UUID profesorId);
    
    @Query("SELECT a FROM Audicion a WHERE a.postulacion.id = ?1")
    List<Audicion> findByPostulacionId(UUID postulacionId);
}

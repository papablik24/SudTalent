package sudtalent.sudtalentproyecto.repository;

import sudtalent.sudtalentproyecto.model.Alumno;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AlumnoRepository extends SoftDeleteRepository<Alumno> {
    
    @Query("SELECT a FROM Alumno a WHERE a.deletedAt IS NULL")
    List<Alumno> findAllActive();
    
    @Query("SELECT a FROM Alumno a WHERE a.id = ?1 AND a.deletedAt IS NULL")
    Optional<Alumno> findByIdActive(UUID id);

    @Query("SELECT a FROM Alumno a WHERE a.email = ?1 AND a.deletedAt IS NULL")
    Optional<Alumno> findByEmailActive(String email);
}


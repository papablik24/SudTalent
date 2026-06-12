package sudtalent.sudtalentproyecto.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import sudtalent.sudtalentproyecto.model.Curso;

import java.util.Optional;
import java.util.UUID;
import java.util.List;

public interface CursoRepository extends JpaRepository<Curso, UUID> {

    Optional<Curso> findByCursoKey(String cursoKey);

    @Query("SELECT c FROM Curso c LEFT JOIN FETCH c.profesor LEFT JOIN FETCH c.alumnos")
    List<Curso> findAllWithDetails();

    @Query("SELECT c FROM Curso c JOIN c.alumnos a WHERE a.alumnoId = :alumnoId")
    List<Curso> findByAlumnoId(UUID alumnoId);

    List<Curso> findByProfesorId(UUID profesorId);
}

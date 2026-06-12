package sudtalent.sudtalentproyecto.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import sudtalent.sudtalentproyecto.model.Anuncio;

import java.util.List;
import java.util.UUID;

public interface AnuncioRepository extends JpaRepository<Anuncio, UUID> {

    List<Anuncio> findByCursoIdOrderByCreatedAtDesc(UUID cursoId);
}

package sudtalent.sudtalentproyecto.repository;

import sudtalent.sudtalentproyecto.model.ConvocatoriaFavorita;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ConvocatoriaFavoritaRepository extends JpaRepository<ConvocatoriaFavorita, UUID> {
    
    List<ConvocatoriaFavorita> findByUsuarioId(UUID usuarioId);
    
    Optional<ConvocatoriaFavorita> findByUsuarioIdAndConvocatoriaId(UUID usuarioId, UUID convocatoriaId);
    
    void deleteByUsuarioIdAndConvocatoriaId(UUID usuarioId, UUID convocatoriaId);
}

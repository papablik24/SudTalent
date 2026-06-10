package sudtalent.sudtalentproyecto.repository;

import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.NoRepositoryBean;

@NoRepositoryBean
public interface SoftDeleteRepository<T> extends JpaRepository<T, UUID> {
    
    @Query("SELECT e FROM #{#entityName} e WHERE e.deletedAt IS NULL")
    java.util.List<T> findAllActive();
    
    @Query("SELECT e FROM #{#entityName} e WHERE e.id = ?1 AND e.deletedAt IS NULL")
    java.util.Optional<T> findByIdActive(UUID id);
}
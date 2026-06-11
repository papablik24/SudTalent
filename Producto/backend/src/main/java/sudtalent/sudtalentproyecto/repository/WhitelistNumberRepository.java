package sudtalent.sudtalentproyecto.repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import sudtalent.sudtalentproyecto.model.WhitelistNumber;


public interface WhitelistNumberRepository extends JpaRepository<WhitelistNumber, UUID> {
    Optional<WhitelistNumber> findByPhone(String phone);
    List<WhitelistNumber> findByStatus(WhitelistNumber.Status status);
    long countByStatus(WhitelistNumber.Status status);
    List<WhitelistNumber> findByCreatedAtBetween(LocalDateTime start, LocalDateTime end);

    /** Carga todos los registros junto con su usuario asociado en una sola query */
    @Query("SELECT w FROM WhitelistNumber w LEFT JOIN FETCH w.user")
    List<WhitelistNumber> findAllWithUser();
}

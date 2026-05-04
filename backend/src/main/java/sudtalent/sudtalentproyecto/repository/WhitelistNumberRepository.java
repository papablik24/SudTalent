package sudtalent.sudtalentproyecto.repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import sudtalent.sudtalentproyecto.model.WhitelistNumber;

@Repository
public interface WhitelistNumberRepository extends JpaRepository<WhitelistNumber, Long> {
    Optional<WhitelistNumber> findByPhone(String phone);
    List<WhitelistNumber> findByStatus(WhitelistNumber.Status status);
    long countByStatus(WhitelistNumber.Status status);
    List<WhitelistNumber> findByCreatedAtBetween(LocalDateTime start, LocalDateTime end);
}

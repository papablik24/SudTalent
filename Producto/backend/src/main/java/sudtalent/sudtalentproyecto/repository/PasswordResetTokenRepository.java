package sudtalent.sudtalentproyecto.repository;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import sudtalent.sudtalentproyecto.model.PasswordResetToken;

public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken, UUID> {

    Optional<PasswordResetToken> findTopByEmailAndUsedFalseOrderByCreatedAtDesc(String email);

    long countByEmailAndCreatedAtAfter(String email, LocalDateTime since);

    // Busca el token más antiguo dentro de la ventana de rate limiting (para calcular tiempo restante)
    Optional<PasswordResetToken> findTopByEmailAndCreatedAtAfterOrderByCreatedAtAsc(String email, LocalDateTime since);

    @Modifying
    @Query("UPDATE PasswordResetToken t SET t.used = true WHERE t.email = :email AND t.used = false")
    void invalidateAllActiveByEmail(@Param("email") String email);

    @Modifying
    @Query("DELETE FROM PasswordResetToken t WHERE t.expiresAt < :cutoff")
    void deleteExpiredBefore(@Param("cutoff") LocalDateTime cutoff);
}

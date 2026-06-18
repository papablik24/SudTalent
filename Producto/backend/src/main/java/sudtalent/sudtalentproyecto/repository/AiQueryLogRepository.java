package sudtalent.sudtalentproyecto.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import sudtalent.sudtalentproyecto.model.AiQueryLog;

import java.util.UUID;

public interface AiQueryLogRepository extends JpaRepository<AiQueryLog, UUID> {
}

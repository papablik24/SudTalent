package sudtalent.sudtalentproyecto.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import sudtalent.sudtalentproyecto.model.AiChatMessage;
import sudtalent.sudtalentproyecto.model.User;

import java.util.List;
import java.util.UUID;

public interface AiChatMessageRepository extends JpaRepository<AiChatMessage, UUID> {
    List<AiChatMessage> findByUsuarioOrderByCreatedAtAsc(User usuario);
    void deleteByUsuario(User usuario);
}

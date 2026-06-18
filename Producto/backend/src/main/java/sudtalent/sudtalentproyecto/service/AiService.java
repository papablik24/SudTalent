package sudtalent.sudtalentproyecto.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import sudtalent.sudtalentproyecto.model.AiChatMessage;
import sudtalent.sudtalentproyecto.model.AiQueryLog;
import sudtalent.sudtalentproyecto.model.User;
import sudtalent.sudtalentproyecto.repository.AiChatMessageRepository;
import sudtalent.sudtalentproyecto.repository.AiQueryLogRepository;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AiService {

    private final AiChatMessageRepository chatMessageRepository;
    private final AiQueryLogRepository queryLogRepository;

    @Transactional(readOnly = true)
    public List<AiChatMessage> getChatHistory(User usuario) {
        return chatMessageRepository.findByUsuarioOrderByCreatedAtAsc(usuario);
    }

    @Transactional
    public AiChatMessage saveChatMessage(User usuario, String role, String content, String contextSummary) {
        AiChatMessage message = AiChatMessage.builder()
                .usuario(usuario)
                .role(role)
                .content(content)
                .contextSummary(contextSummary)
                .build();
        return chatMessageRepository.save(message);
    }

    @Transactional
    public void clearChatHistory(User usuario) {
        chatMessageRepository.deleteByUsuario(usuario);
    }

    @Transactional
    public AiQueryLog logQuery(User usuario, String pregunta, String respuesta, String contextoUsado, String estado) {
        AiQueryLog log = AiQueryLog.builder()
                .usuario(usuario)
                .pregunta(pregunta)
                .respuesta(respuesta)
                .contextoUsado(contextoUsado)
                .estado(estado)
                .build();
        return queryLogRepository.save(log);
    }
}

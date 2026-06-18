package sudtalent.sudtalentproyecto.controller;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import sudtalent.sudtalentproyecto.model.AiChatMessage;
import sudtalent.sudtalentproyecto.model.User;
import sudtalent.sudtalentproyecto.repository.UserRepository;
import sudtalent.sudtalentproyecto.service.AiService;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
public class AiController {

    private final AiService aiService;
    private final UserRepository userRepository;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AiChatMessageDTO {
        private UUID id;
        private String role;
        private String content;
        private String conversationId;
        private String contextSummary;
        private LocalDateTime createdAt;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CreateAiChatMessageDTO {
        private String role;
        private String content;
        private String contextSummary;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class LogQueryDTO {
        private String pregunta;
        private String respuesta;
        private String contextoUsado;
        private String estado;
    }

    @GetMapping("/history/me")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<AiChatMessageDTO>> getMyHistory(Authentication auth) {
        User user = getAuthenticatedUser(auth);
        List<AiChatMessageDTO> history = aiService.getChatHistory(user).stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
        return ResponseEntity.ok(history);
    }

    @PostMapping("/history/me")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<AiChatMessageDTO> addMessage(@RequestBody CreateAiChatMessageDTO dto, Authentication auth) {
        User user = getAuthenticatedUser(auth);
        AiChatMessage msg = aiService.saveChatMessage(
                user,
                dto.getRole(),
                dto.getContent(),
                dto.getContextSummary()
        );
        return ResponseEntity.ok(toDTO(msg));
    }

    @DeleteMapping("/history/me")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Void> clearHistory(Authentication auth) {
        User user = getAuthenticatedUser(auth);
        aiService.clearChatHistory(user);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/log")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Void> logQuery(@RequestBody LogQueryDTO dto, Authentication auth) {
        User user = getAuthenticatedUser(auth);
        aiService.logQuery(
                user,
                dto.getPregunta(),
                dto.getRespuesta(),
                dto.getContextoUsado(),
                dto.getEstado()
        );
        return ResponseEntity.ok().build();
    }

    private User getAuthenticatedUser(Authentication auth) {
        String email = auth.getName();
        return userRepository.findByEmailActive(email)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
    }

    private AiChatMessageDTO toDTO(AiChatMessage msg) {
        return AiChatMessageDTO.builder()
                .id(msg.getId())
                .role(msg.getRole())
                .content(msg.getContent())
                .conversationId(msg.getConversationId())
                .contextSummary(msg.getContextSummary())
                .createdAt(msg.getCreatedAt())
                .build();
    }
}

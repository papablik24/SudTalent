package sudtalent.sudtalentproyecto.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "ai_chat_messages")
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class AiChatMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "uuid", updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "usuario_id", nullable = false)
    private User usuario;

    @Column(nullable = false, length = 20)
    private String role; // "user" | "model" | "system"

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    @Column(name = "conversation_id", nullable = false, length = 100)
    @Builder.Default
    private String conversationId = "default";

    @Column(name = "context_summary", columnDefinition = "TEXT")
    private String contextSummary;

    @Column(nullable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}

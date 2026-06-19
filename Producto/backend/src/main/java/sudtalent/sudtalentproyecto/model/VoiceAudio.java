package sudtalent.sudtalentproyecto.model;

import java.time.LocalDateTime;
import java.util.UUID;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "voice_audios")
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class VoiceAudio {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "uuid")
    private UUID id;

    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false, length = 1000)
    private String fileUrl;  // URL pública de Supabase Storage

    @Column(length = 500)
    private String storagePath;  // Ruta interna: audios/user-id/filename

    private Integer durationSeconds;

    private Double fileSizeMb;

    @Column(length = 20)
    @Builder.Default
    private String mediaType = "audio/mpeg";

    @Column(length = 20)
    @Builder.Default
    private String category = "profile";  // 'profile' o 'demo'

    @Column(name = "visual_genre", length = 50)
    private String visualGenre;

    @Column(name = "demo_category", length = 50)
    private String demoCategory;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Builder.Default
    private boolean isPublic = true;

    @Column(nullable = false, updatable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(nullable = false)
    @Builder.Default
    private LocalDateTime updatedAt = LocalDateTime.now();

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    // Métodos
    public void softDelete() {
        this.deletedAt = LocalDateTime.now();
    }

    public boolean isDeleted() {
        return deletedAt != null;
    }
}
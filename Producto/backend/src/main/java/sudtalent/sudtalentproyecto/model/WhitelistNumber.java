package sudtalent.sudtalentproyecto.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "whitelist_numbers")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WhitelistNumber {
    
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "uuid")
    private UUID id;

    @NotBlank
    @Pattern(regexp = "^[0-9]{8,15}$")
    @Column(nullable = false, unique = true, length = 20)
    private String phone;

    @Column(length = 255)
    private String name;

    @Column(length = 100)
    private String email;

    @Column(length = 50)
    @Builder.Default
    private String category = "NONE";

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private Status status = Status.PENDIENTE;

    @Column(nullable = false, updatable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(nullable = false)
    @Builder.Default
    private LocalDateTime updatedAt = LocalDateTime.now();

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "usuario_id", referencedColumnName = "id")
    private User user;

    public enum Status {
        ACTIVO, INACTIVO, PENDIENTE
    }
}
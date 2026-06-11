package sudtalent.sudtalentproyecto.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
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
    @Column(columnDefinition = "uuid", updatable = false, nullable = false)
    private UUID id;

    @NotBlank
    @Column(nullable = false, unique = true)
    private String phone;

    private String name;

    private String email;

    private String category;

    private String role; // Stored as string to match User.Role

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private Status status = Status.PENDIENTE;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    @Column(nullable = false, updatable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(nullable = false)
    @Builder.Default
    private LocalDateTime updatedAt = LocalDateTime.now();

    public enum Status {
        ACTIVO, INACTIVO, PENDIENTE
    }

    // Helper to get role as User.Role enum
    public User.Role getRoleEnum() {
        if (role == null) return null;
        try { return User.Role.valueOf(role); } catch (Exception e) { return null; }
    }

    // Helper used by WhitelistService to get role as User.Role
    public User.Role getRole() {
        return getRoleEnum();
    }

    // Helper used by WhitelistService to set role from User.Role
    public void setRole(User.Role r) {
        this.role = r != null ? r.name() : null;
    }
}
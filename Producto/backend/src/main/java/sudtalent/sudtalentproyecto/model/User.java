package sudtalent.sudtalentproyecto.model;

import java.time.LocalDateTime;
import java.util.UUID;

import jakarta.persistence.*;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.*;

@Entity
@Table(name = "users")
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
@Inheritance(strategy = InheritanceType.JOINED) 
public class User {
    
    // ✅ CAMBIO 1: UUID en lugar de IDENTITY
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "uuid")
    private UUID id;

    @Column(nullable = false, length = 100)
    @Builder.Default
    private String name = "";

    @Email
    @Column(unique = true, length = 150)
    private String email;

    @NotBlank
    @Column(nullable = false)
    private String password;

    @Pattern(regexp = "^[0-9]{8,15}$", message = "El teléfono debe contener entre 8 y 15 dígitos") 
    @Column(unique = true, length = 20)
    private String phone;

    @Enumerated(EnumType.STRING)
    @Column(length = 150)
    private Specialization specialization;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private Role role = Role.ALUMNO;

    @Column(nullable = false, updatable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(nullable = false)
    @Builder.Default
    private LocalDateTime updatedAt = LocalDateTime.now();

    // ✅ CAMBIO 2: Agregar soft delete
    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    @Column(nullable = false)
    @Builder.Default
    private boolean active = true;

    @Column(nullable = false)
    @Builder.Default
    private boolean onboarded = false;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private ProfileType profileType;

    @Column(length = 500)
    private String bio;

    @Column(length = 500)
    private String specialties;

    @Column(length = 100)
    private String childName;

    private Integer childAge;

    private Integer age;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    @Builder.Default
    private ProfileStatus status = ProfileStatus.PENDING;

    @ManyToOne
    @JoinColumn(name = "perfil_id")
    private Profile profile;

    public enum Role {
        ALUMNO, ADMIN, PROFESOR
    }

    public enum Specialization {
        LOCUCION, PODCASTING, DOBLAJE, KIDS, OTRO
    }

    public enum ProfileType {
        PERSONAL, PARENT
    }

    public enum ProfileStatus {
        PENDING, APPROVED, INACTIVE
    }

    // ✅ MÉTODO: Marcar como eliminado (soft delete)
    public void softDelete() {
        this.deletedAt = LocalDateTime.now();
        this.active = false;
    }

    // ✅ MÉTODO: Verificar si está eliminado
    public boolean isDeleted() {
        return deletedAt != null;
    }
}
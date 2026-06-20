package sudtalent.sudtalentproyecto.model;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Inheritance;
import jakarta.persistence.InheritanceType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
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
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

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
    private Role role = Role.ALUMNO; // Valor por defecto

    @Column(nullable = false, updatable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

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
        ALUMNO,
        ADMIN
    }

    public enum Specialization {
        LOCUCION,
        PODCASTING,
        DOBLAJE,
        KIDS,
        OTRO
    }

    public enum ProfileType {
        PERSONAL,
        PARENT
    }

    public enum ProfileStatus {
        PENDING,
        APPROVED,
        INACTIVE
    }
}

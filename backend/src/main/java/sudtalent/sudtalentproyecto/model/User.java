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
import jakarta.validation.constraints.NotNull;
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

    @NotBlank
    @Column(nullable = false, length = 100)
    private String name;

    @Email
    @NotBlank
    @Column(nullable = false, unique = true, length = 150)
    private String email;

    @NotBlank
    @Column(nullable = false)
    private String password;

    @Pattern(regexp = "^[0-9]{11}$", message = "El teléfono debe contener 11 dígitos") // @Pattern: Valida que el teléfono solo contenga números (expresión regular)
    @Column(nullable = false, unique = true, length = 11)
    private String phone;

    @NotNull(message = "La especialidad es obligatoria")
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 150)
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

    @ManyToOne
    @JoinColumn(name = "perfil_id", nullable = false)
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
}

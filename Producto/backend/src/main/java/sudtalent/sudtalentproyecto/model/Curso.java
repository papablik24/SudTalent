package sudtalent.sudtalentproyecto.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

@Entity
@Table(name = "cursos")
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class Curso {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "uuid", updatable = false, nullable = false)
    private UUID id;

    /** Identificador fijo del curso (e.g. "doblaje-presencial") — único */
    @Column(name = "curso_key", nullable = false, unique = true, length = 80)
    private String cursoKey;

    @Column(nullable = false, length = 200)
    private String titulo;

    @Column(columnDefinition = "TEXT")
    private String descripcion;

    /** PRESENCIAL | ONLINE | MIXTO */
    @Column(nullable = false, length = 20)
    @Builder.Default
    private String modalidad = "PRESENCIAL";

    /** Profesor asignado al curso (puede ser null) */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "profesor_id", nullable = true)
    private User profesor;

    /**
     * Tabla de inscripciones con datos desnormalizados del alumno.
     * Columnas: curso_id, alumno_id, nombre_alumno
     */
    @ElementCollection(fetch = FetchType.LAZY)
    @CollectionTable(
        name = "curso_alumnos",
        joinColumns = @JoinColumn(name = "curso_id")
    )
    @Builder.Default
    private Set<CursoAlumno> alumnos = new HashSet<>();

    @Column(nullable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(nullable = false)
    @Builder.Default
    private LocalDateTime updatedAt = LocalDateTime.now();

    // ── Value object para la tabla de unión ───────────────────────
    @Embeddable
    @Getter
    @Setter
    @EqualsAndHashCode(of = "alumnoId")
    public static class CursoAlumno {

        @Column(name = "alumno_id", columnDefinition = "uuid", nullable = false)
        private UUID alumnoId;

        @Column(name = "nombre_alumno", length = 200)
        private String nombreAlumno;

        @Column(name = "email_alumno", length = 200)
        private String emailAlumno;

        @Column(name = "profile_image_url", length = 500)
        private String profileImageUrl;

        @Column(name = "inscrito_at", nullable = false)
        private LocalDateTime inscritoAt;

        // Constructor requerido por JPA
        public CursoAlumno() {
            this.inscritoAt = LocalDateTime.now();
        }

        public CursoAlumno(UUID alumnoId, String nombreAlumno, String emailAlumno,
                           String profileImageUrl, LocalDateTime inscritoAt) {
            this.alumnoId = alumnoId;
            this.nombreAlumno = nombreAlumno;
            this.emailAlumno = emailAlumno;
            this.profileImageUrl = profileImageUrl;
            this.inscritoAt = inscritoAt != null ? inscritoAt : LocalDateTime.now();
        }
    }
}

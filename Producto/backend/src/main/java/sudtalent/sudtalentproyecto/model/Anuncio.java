package sudtalent.sudtalentproyecto.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Anuncio o cápsula educativa publicada por el profesor de un curso.
 * tipo: ANUNCIO | CAPSULA
 */
@Entity
@Table(name = "anuncios")
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class Anuncio {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "uuid", updatable = false, nullable = false)
    private UUID id;

    /** Referencia al curso al que pertenece */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "curso_id", nullable = false)
    private Curso curso;

    /** Autor del anuncio (el profesor) */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "autor_id", nullable = false)
    private User autor;

    /** ANUNCIO | CAPSULA */
    @Column(nullable = false, length = 20)
    @Builder.Default
    private String tipo = "ANUNCIO";

    @Column(nullable = false, length = 300)
    private String titulo;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String contenido;

    /**
     * URL opcional: enlace a video, PDF, audio, etc. (para cápsulas)
     */
    @Column(name = "url_recurso", length = 500)
    private String urlRecurso;

    @Column(nullable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(nullable = false)
    @Builder.Default
    private LocalDateTime updatedAt = LocalDateTime.now();
}

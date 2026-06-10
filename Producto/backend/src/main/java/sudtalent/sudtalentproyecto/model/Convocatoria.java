package sudtalent.sudtalentproyecto.model;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Set;
import java.util.UUID;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "convocatorias")
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class Convocatoria {
    
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "uuid")
    private UUID id;

    /** Título descriptivo de la convocatoria */
    @Column(nullable = false, length = 200)
    private String titulo;

    /** Descripción detallada */
    @Column(columnDefinition = "TEXT")
    private String descripcion;

    /** Categoría: Doblaje, Podcast, Locución, etc. */
    @Column(length = 50)
    private String categoria;

    /** Género visual: Acción, Drama, etc. (opcional) */
    @Column(name = "genero_visual", length = 50)
    private String generoVisual;

    /** Requisitos como lista serializada separada por '|' */
    @Column(columnDefinition = "TEXT")
    private String requisitos;

    /** Fecha límite de postulación */
    @Column(name = "fecha_limite")
    private LocalDate fechaLimite;

    // Campos legacy mantenidos por compatibilidad
    @Column
    private LocalDate fecha;
    
    @Column(length = 100)
    private String tipo;
    
    @Column(nullable = false)
    @Builder.Default
    private String estado = "ACTIVA";

    @Column(nullable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(nullable = false)
    @Builder.Default
    private LocalDateTime updatedAt = LocalDateTime.now();

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;
    
    @ManyToOne
    @JoinColumn(name = "profesor_id", nullable = true)
    private Profesor profesor;
    
    @OneToMany(mappedBy = "convocatoria", cascade = CascadeType.ALL)
    private Set<Postulacion> postulaciones;
}
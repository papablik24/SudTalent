package sudtalent.sudtalentproyecto.model;

import java.time.LocalDateTime;
import java.util.UUID;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "audiciones")
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class Audicion {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "uuid")
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "postulacion_id", nullable = false)
    private Postulacion postulacion;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "alumno_id", nullable = false)
    private User alumno;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "profesor_id", nullable = false)
    private Profesor profesor;

    @Column(nullable = false, length = 10)
    private String fecha; // YYYY-MM-DD

    @Column(nullable = false, length = 8)
    private String hora; // HH:mm

    @Column(nullable = false, length = 20)
    private String modalidad; // ONLINE / PRESENCIAL

    @Column(length = 250)
    private String lugar;

    @Column(length = 1000)
    private String link;

    /** Estado: PROGRAMADA, EVALUADA, CANCELADA */
    @Column(nullable = false, length = 20)
    @Builder.Default
    private String estado = "PROGRAMADA";

    private Integer puntaje;

    @Column(columnDefinition = "TEXT")
    private String observaciones;

    /** Resultado: PENDIENTE, APROBADA, RECHAZADA */
    @Column(nullable = false, length = 20)
    @Builder.Default
    private String resultado = "PENDIENTE";

    @Column(nullable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(nullable = false)
    @Builder.Default
    private LocalDateTime updatedAt = LocalDateTime.now();
}

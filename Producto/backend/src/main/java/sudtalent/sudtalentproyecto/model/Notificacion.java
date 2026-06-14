package sudtalent.sudtalentproyecto.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "notificaciones")
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class Notificacion {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "uuid", updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "usuario_id", nullable = false)
    private User usuario;

    @Column(nullable = false, length = 200)
    private String titulo;

    @Column(nullable = false, length = 1000)
    private String mensaje;

    @Column(nullable = false, length = 20)
    private String tipo; // POSTULACION | CURSO | AGENDA

    @Column(nullable = false)
    @Builder.Default
    private boolean leido = false;

    @Column(nullable = false)
    @Builder.Default
    private LocalDateTime fechaCreacion = LocalDateTime.now();

    @Column(name = "referencia_id", columnDefinition = "uuid")
    private UUID referenciaId;

    @Column(name = "referencia_tipo", length = 50)
    private String referenciaTipo;
}

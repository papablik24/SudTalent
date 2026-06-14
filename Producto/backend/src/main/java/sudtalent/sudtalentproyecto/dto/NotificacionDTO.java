package sudtalent.sudtalentproyecto.dto;

import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class NotificacionDTO {
    private UUID id;
    private String titulo;
    private String mensaje;
    private String tipo;
    private boolean leido;
    private LocalDateTime fechaCreacion;
    private UUID referenciaId;
    private String referenciaTipo;
}

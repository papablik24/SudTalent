package sudtalent.sudtalentproyecto.dto;

import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class AgendaEventoDTO {
    private UUID id;
    private UUID profesorId;
    private UUID cursoId;
    private String cursoTitulo;
    private String titulo;
    private String descripcion;
    private LocalDate fecha;
    private String hora;
    private String link;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}

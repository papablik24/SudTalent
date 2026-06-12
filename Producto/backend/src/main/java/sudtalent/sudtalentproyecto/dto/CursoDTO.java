package sudtalent.sudtalentproyecto.dto;

import java.time.LocalDateTime;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class CursoDTO {
    private UUID id;
    private String cursoKey;
    private String descripcion;
    private String modalidad;
    private String titulo;
    private UUID profesorId;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}

package sudtalent.sudtalentproyecto.dto;

import java.util.UUID;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * DTO para crear una nueva postulación.
 * El alumno se identifica por alumnoId (UUID del usuario autenticado).
 */
@Getter
@Setter
@NoArgsConstructor
public class PostulacionRequestDTO {

    @NotNull(message = "El ID de la convocatoria es obligatorio")
    private UUID convocatoriaId;

    /** Opcional: si no viene, el backend lo extrae del JWT */
    private UUID alumnoId;

    private String mensaje;
}

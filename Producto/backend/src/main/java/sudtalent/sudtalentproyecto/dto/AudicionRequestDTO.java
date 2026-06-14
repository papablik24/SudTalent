package sudtalent.sudtalentproyecto.dto;

import java.util.UUID;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class AudicionRequestDTO {
    private UUID postulacionId;
    private UUID profesorId;
    private String fecha;
    private String hora;
    private String modalidad; // ONLINE / PRESENCIAL
    private String lugar;
    private String link;
}

package sudtalent.sudtalentproyecto.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class AudicionEvaluacionRequestDTO {
    private Integer puntaje; // 1 a 100
    private String observaciones;
    private String resultado; // APROBADA / RECHAZADA
}

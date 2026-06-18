package sudtalent.sudtalentproyecto.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ImportSummaryDTO {
    private int agregados;
    private int omitidosDuplicados;
    private int invalidos;
    private int yaExistentes;
}

package sudtalent.sudtalentproyecto.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class WhitelistStatsDTO {
    private long totalAutorizados;  // Total ACTIVO
    private long ingresosHoy;       // Creados hoy
    private long nuevosSolicitudes; // Pendientes
}

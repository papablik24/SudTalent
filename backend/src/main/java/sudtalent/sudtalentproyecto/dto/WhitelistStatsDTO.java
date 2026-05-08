package sudtalent.sudtalentproyecto.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WhitelistStatsDTO {
    private long totalAutorizados;  // Total ACTIVO
    private long ingresosHoy;       // Creados hoy
    private long nuevosSolicitudes; // Pendientes
}

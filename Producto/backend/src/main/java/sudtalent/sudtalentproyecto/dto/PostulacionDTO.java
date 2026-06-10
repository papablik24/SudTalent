package sudtalent.sudtalentproyecto.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * DTO para Postulación
 * Enriquece los datos de la postulación con información del alumno y convocatoria
 */
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class PostulacionDTO {
    private UUID id;
    private UUID alumnoId;
    private UUID convocatoriaId;
    
    // Alumno info
    private String userName;
    private String userEmail;
    private String userPhone;
    
    // Convocatoria info
    private String convocatoriaTitulo;
    private String convocatoriaCategoria;
    
    // Postulacion info
    private LocalDate fechaPostulacion;
    private String estado; // PENDIENTE, EN_REVISION, ACEPTADA, RECHAZADA
    
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private LocalDateTime deletedAt;
}

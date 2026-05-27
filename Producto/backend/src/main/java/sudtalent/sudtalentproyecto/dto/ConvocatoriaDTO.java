package sudtalent.sudtalentproyecto.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * DTO de respuesta para Convocatoria.
 * Expone todos los campos que consume el frontend.
 */
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class ConvocatoriaDTO {
    private UUID id;
    private String titulo;
    private String descripcion;
    private String categoria;
    private String generoVisual;
    /** Lista de requisitos — serializada en DB como texto separado por '|' */
    private List<String> requisitos;
    private LocalDate fechaLimite;
    private String estado;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    /** ID del profesor que creó la convocatoria */
    private UUID createdBy;
}

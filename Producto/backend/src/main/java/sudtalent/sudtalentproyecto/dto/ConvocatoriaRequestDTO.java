package sudtalent.sudtalentproyecto.dto;

import java.time.LocalDate;
import java.util.List;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * DTO para crear o actualizar una convocatoria desde el frontend.
 */
@Getter
@Setter
@NoArgsConstructor
public class ConvocatoriaRequestDTO {

    @NotBlank(message = "El título es obligatorio")
    private String titulo;

    private String descripcion;

    @NotBlank(message = "La categoría es obligatoria")
    private String categoria;

    private String generoVisual;

    private List<String> requisitos;

    @NotNull(message = "La fecha límite es obligatoria")
    private LocalDate fechaLimite;

    @NotBlank(message = "El estado es obligatorio")
    private String estado;
}

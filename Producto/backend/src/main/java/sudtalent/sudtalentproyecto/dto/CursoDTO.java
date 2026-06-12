package sudtalent.sudtalentproyecto.dto;

import lombok.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class CursoDTO {
    private UUID id;
    private String cursoKey;
    private String titulo;
    private String descripcion;
    private String modalidad;

    /** ID del profesor asignado */
    private UUID profesorId;
    /** Nombre del profesor asignado */
    private String profesorNombre;

    /** Lista resumida de alumnos inscritos */
    private List<AlumnoResumenDTO> alumnos;
    private int totalAlumnos;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @Getter
    @Setter
    @AllArgsConstructor
    @NoArgsConstructor
    @Builder
    public static class AlumnoResumenDTO {
        private UUID id;
        private String nombre;
        private String email;
        private String profileImageUrl;
    }
}

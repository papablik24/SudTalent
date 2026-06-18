package sudtalent.sudtalentproyecto.dto;

import lombok.*;
import java.util.List;
import java.util.UUID;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class ProfesorAlumnoDTO {
    private UUID id;
    private String name;
    private String email;
    private String phone;
    private String profileType;
    private String status;
    private Integer age;
    private String childName;
    private Integer childAge;
    private String profileImageUrl;
    private List<CursoResumenDTO> cursos;

    @Getter
    @Setter
    @AllArgsConstructor
    @NoArgsConstructor
    @Builder
    public static class CursoResumenDTO {
        private UUID id;
        private String titulo;
        private String cursoKey;
    }
}

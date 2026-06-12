package sudtalent.sudtalentproyecto.dto;

import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class AnuncioDTO {
    private UUID id;
    private UUID cursoId;
    private UUID autorId;
    private String autorNombre;
    private String autorImageUrl;
    /** ANUNCIO | CAPSULA */
    private String tipo;
    private String titulo;
    private String contenido;
    private String urlRecurso;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}

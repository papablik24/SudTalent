package sudtalent.sudtalentproyecto.dto;

import java.time.LocalDateTime;
import java.util.UUID;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class AudicionDTO {
    private UUID id;
    private UUID postulacionId;
    private UUID alumnoId;
    private UUID profesorId;

    // Alumno Info
    private String alumnoNombre;
    private String alumnoEmail;
    private String alumnoTelefono;

    // Profesor Info
    private String profesorNombre;
    private String profesorEspecialidad;

    // Convocatoria Info
    private String convocatoriaTitulo;
    private String convocatoriaCategoria;

    // Audicion Info
    private String fecha;
    private String hora;
    private String modalidad; // ONLINE / PRESENCIAL
    private String lugar;
    private String link;
    private String estado; // PROGRAMADA, EVALUADA, CANCELADA
    private Integer puntaje;
    private String observaciones;
    private String resultado; // PENDIENTE, APROBADA, RECHAZADA

    // VoiceAudio Info
    private UUID voiceAudioId;
    private String voiceAudioTitle;
    private String voiceAudioUrl;
    
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}

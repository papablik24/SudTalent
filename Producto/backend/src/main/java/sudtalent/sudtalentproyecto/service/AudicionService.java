package sudtalent.sudtalentproyecto.service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import sudtalent.sudtalentproyecto.dto.AudicionDTO;
import sudtalent.sudtalentproyecto.dto.AudicionRequestDTO;
import sudtalent.sudtalentproyecto.dto.AudicionEvaluacionRequestDTO;
import sudtalent.sudtalentproyecto.model.Audicion;
import sudtalent.sudtalentproyecto.model.Postulacion;
import sudtalent.sudtalentproyecto.model.Profesor;
import sudtalent.sudtalentproyecto.model.User;
import sudtalent.sudtalentproyecto.model.Convocatoria;
import sudtalent.sudtalentproyecto.model.VoiceAudio;
import sudtalent.sudtalentproyecto.repository.AudicionRepository;
import sudtalent.sudtalentproyecto.repository.PostulacionRepository;
import sudtalent.sudtalentproyecto.repository.ProfesorRepository;
import sudtalent.sudtalentproyecto.repository.UserRepository;
import sudtalent.sudtalentproyecto.service.NotificacionService;

@Service
@RequiredArgsConstructor
@Transactional
public class AudicionService {

    private final AudicionRepository audicionRepository;
    private final PostulacionRepository postulacionRepository;
    private final UserRepository userRepository;
    private final ProfesorRepository profesorRepository;
    private final NotificacionService notificacionService;

    public AudicionDTO programarAudicion(AudicionRequestDTO request) {
        if (request.getPostulacionId() == null) {
            throw new RuntimeException("No se puede crear una audición sin postulación");
        }
        if (request.getProfesorId() == null) {
            throw new RuntimeException("No se puede crear una audición sin profesor");
        }
        if (request.getFecha() == null || request.getFecha().trim().isEmpty() ||
            request.getHora() == null || request.getHora().trim().isEmpty()) {
            throw new RuntimeException("No se puede crear una audición sin fecha y hora");
        }

        Postulacion postulacion = postulacionRepository.findByIdActive(request.getPostulacionId())
                .orElseThrow(() -> new RuntimeException("Postulación no encontrada"));

        Profesor profesor = profesorRepository.findById(request.getProfesorId())
                .orElseThrow(() -> new RuntimeException("Profesor no encontrado"));

        User alumno = postulacion.getAlumno();
        if (alumno == null) {
            throw new RuntimeException("La postulación no tiene un alumno asociado");
        }

        Audicion audicion = Audicion.builder()
                .postulacion(postulacion)
                .alumno(alumno)
                .profesor(profesor)
                .fecha(request.getFecha().trim())
                .hora(request.getHora().trim())
                .modalidad(request.getModalidad() != null ? request.getModalidad().trim() : "ONLINE")
                .lugar(request.getLugar() != null ? request.getLugar().trim() : null)
                .link(request.getLink() != null ? request.getLink().trim() : null)
                .estado("PROGRAMADA")
                .resultado("PENDIENTE")
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        return toDTO(audicionRepository.save(audicion));
    }

    public AudicionDTO cancelarAudicion(UUID id) {
        Audicion audicion = audicionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Audición no encontrada"));

        audicion.setEstado("CANCELADA");
        audicion.setUpdatedAt(LocalDateTime.now());
        return toDTO(audicionRepository.save(audicion));
    }

    public AudicionDTO evaluarAudicion(UUID id, AudicionEvaluacionRequestDTO request, Authentication authentication) {
        Audicion audicion = audicionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Audición no encontrada"));

        if ("CANCELADA".equals(audicion.getEstado())) {
            throw new RuntimeException("No se permite evaluar una audición cancelada");
        }

        if (audicion.getPostulacion() != null && "CANCELADA".equals(audicion.getPostulacion().getEstado())) {
            throw new RuntimeException("No se permite evaluar una audición de una postulación cancelada");
        }

        UUID authenticatedUserId = resolveUserId(authentication);
        if (!audicion.getProfesor().getUsuarioId().equals(authenticatedUserId)) {
            throw new org.springframework.security.access.AccessDeniedException("No tienes permisos para evaluar esta audición (no te pertenece)");
        }

        if (request.getPuntaje() == null || request.getPuntaje() < 1 || request.getPuntaje() > 100) {
            throw new RuntimeException("El puntaje debe estar entre 1 y 100");
        }

        String res = request.getResultado() != null ? request.getResultado().trim().toUpperCase() : "";
        if (!"APROBADA".equals(res) && !"RECHAZADA".equals(res)) {
            throw new RuntimeException("El resultado debe ser APROBADA o RECHAZADA");
        }

        audicion.setPuntaje(request.getPuntaje());
        audicion.setObservaciones(request.getObservaciones() != null ? request.getObservaciones().trim() : "");
        audicion.setResultado(res);
        audicion.setEstado("EVALUADA");
        audicion.setUpdatedAt(LocalDateTime.now());

        Audicion savedAudicion = audicionRepository.save(audicion);

        // Actualizar el estado de la postulación asociada
        Postulacion postulacion = savedAudicion.getPostulacion();
        if (postulacion != null) {
            String nuevoEstado = "APROBADA".equals(res) ? "ACEPTADA" : "RECHAZADA";
            postulacion.setEstado(nuevoEstado);
            postulacion.setUpdatedAt(LocalDateTime.now());
            postulacionRepository.save(postulacion);

            // Registrar notificación persistente en el sistema
            if (postulacion.getAlumno() != null) {
                try {
                    String convTitulo = postulacion.getConvocatoria() != null ? postulacion.getConvocatoria().getTitulo() : "Convocatoria";
                    notificacionService.crearNotificacion(
                            postulacion.getAlumno(),
                            "Estado de postulación actualizado",
                            "Tu postulación a '" + convTitulo + "' fue " + nuevoEstado + ".",
                            "POSTULACION",
                            postulacion.getId(),
                            "POSTULACION"
                    );
                } catch (Exception e) {
                    System.err.println("Error enviando notificación de postulación: " + e.getMessage());
                }
            }
        }

        return toDTO(savedAudicion);
    }

    @Transactional(readOnly = true)
    public List<AudicionDTO> listarTodas() {
        return audicionRepository.findAll().stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<AudicionDTO> listarPorProfesorLogueado(Authentication authentication) {
        UUID authenticatedUserId = resolveUserId(authentication);
        return audicionRepository.findByProfesorId(authenticatedUserId).stream()
                .filter(a -> !"CANCELADA".equals(a.getEstado()) 
                             && a.getPostulacion() != null 
                             && !"CANCELADA".equals(a.getPostulacion().getEstado()) 
                             && a.getPostulacion().getDeletedAt() == null)
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    private UUID resolveUserId(Authentication authentication) {
        if (authentication == null || authentication.getName() == null) {
            throw new RuntimeException("No se pudo determinar el usuario: sin autenticación");
        }
        String email = authentication.getName();
        return userRepository.findByEmailActive(email)
                .map(User::getId)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado: " + email));
    }

    private AudicionDTO toDTO(Audicion a) {
        User alumno = a.getAlumno();
        Profesor prof = a.getProfesor();
        User profUser = prof != null ? prof.getUsuario() : null;
        Postulacion post = a.getPostulacion();
        Convocatoria conv = post != null ? post.getConvocatoria() : null;
        VoiceAudio voiceAudio = post != null ? post.getVoiceAudio() : null;

        return AudicionDTO.builder()
                .id(a.getId())
                .postulacionId(post != null ? post.getId() : null)
                .alumnoId(alumno != null ? alumno.getId() : null)
                .profesorId(prof != null ? prof.getUsuarioId() : null)
                .alumnoNombre(alumno != null ? alumno.getName() : null)
                .alumnoEmail(alumno != null ? alumno.getEmail() : null)
                .alumnoTelefono(alumno != null ? alumno.getPhone() : null)
                .profesorNombre(profUser != null ? profUser.getName() : (prof != null ? "Profesor" : null))
                .profesorEspecialidad(prof != null ? prof.getEspecialidad() : null)
                .convocatoriaTitulo(conv != null ? conv.getTitulo() : null)
                .convocatoriaCategoria(conv != null ? conv.getCategoria() : null)
                .fecha(a.getFecha())
                .hora(a.getHora())
                .modalidad(a.getModalidad())
                .lugar(a.getLugar())
                .link(a.getLink())
                .estado(a.getEstado())
                .puntaje(a.getPuntaje())
                .observaciones(a.getObservaciones())
                .resultado(a.getResultado())
                .voiceAudioId(voiceAudio != null ? voiceAudio.getId() : null)
                .voiceAudioTitle(voiceAudio != null ? voiceAudio.getTitle() : null)
                .voiceAudioUrl(voiceAudio != null ? voiceAudio.getFileUrl() : null)
                .createdAt(a.getCreatedAt())
                .updatedAt(a.getUpdatedAt())
                .build();
    }
}

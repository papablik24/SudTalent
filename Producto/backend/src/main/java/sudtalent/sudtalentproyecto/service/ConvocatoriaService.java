package sudtalent.sudtalentproyecto.service;

import sudtalent.sudtalentproyecto.dto.ConvocatoriaDTO;
import sudtalent.sudtalentproyecto.dto.ConvocatoriaRequestDTO;
import sudtalent.sudtalentproyecto.model.Convocatoria;
import sudtalent.sudtalentproyecto.model.User;
import sudtalent.sudtalentproyecto.model.Postulacion;
import sudtalent.sudtalentproyecto.model.Audicion;
import sudtalent.sudtalentproyecto.repository.ConvocatoriaRepository;
import sudtalent.sudtalentproyecto.repository.UserRepository;
import sudtalent.sudtalentproyecto.repository.PostulacionRepository;
import sudtalent.sudtalentproyecto.repository.AudicionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class ConvocatoriaService {

    private final ConvocatoriaRepository convocatoriaRepository;
    private final UserRepository userRepository;
    private final NotificacionService notificacionService;
    private final PostulacionRepository postulacionRepository;
    private final AudicionRepository audicionRepository;

    // ── Create ───────────────────────────────────────────────────────────

    public ConvocatoriaDTO createConvocatoria(ConvocatoriaRequestDTO request) {
        Convocatoria conv = Convocatoria.builder()
                .titulo(request.getTitulo())
                .descripcion(request.getDescripcion())
                .categoria(request.getCategoria())
                .generoVisual(request.getGeneroVisual())
                .requisitos(serializeRequisitos(request.getRequisitos()))
                .fechaLimite(request.getFechaLimite())
                .estado(request.getEstado() != null ? request.getEstado() : "ACTIVA")
                .build();
        Convocatoria saved = convocatoriaRepository.save(conv);
        if ("ACTIVA".equals(saved.getEstado())) {
            notificarNuevaConvocatoria(saved);
        }
        return toDTO(saved);
    }

    // ── Read ─────────────────────────────────────────────────────────────

    public List<ConvocatoriaDTO> getAllConvocatorias() {
        return convocatoriaRepository.findAllActive().stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    public List<ConvocatoriaDTO> getConvocatoriasActivas() {
        return convocatoriaRepository.findByEstado("ACTIVA").stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    public ConvocatoriaDTO getConvocatoriaById(UUID id) {
        return toDTO(convocatoriaRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Convocatoria no encontrada")));
    }

    public List<ConvocatoriaDTO> getConvocatoriasByProfesor(UUID profesorId) {
        return convocatoriaRepository.findByProfesorId(profesorId).stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    public List<ConvocatoriaDTO> getConvocatoriasByEstado(String estado) {
        return convocatoriaRepository.findByEstado(estado).stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    // ── Update ───────────────────────────────────────────────────────────

    public ConvocatoriaDTO updateConvocatoria(UUID id, ConvocatoriaRequestDTO request) {
        Convocatoria conv = convocatoriaRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Convocatoria no encontrada"));

        String estadoAnterior = conv.getEstado();

        if (request.getTitulo() != null) conv.setTitulo(request.getTitulo());
        if (request.getDescripcion() != null) conv.setDescripcion(request.getDescripcion());
        if (request.getCategoria() != null) conv.setCategoria(request.getCategoria());
        if (request.getGeneroVisual() != null) conv.setGeneroVisual(request.getGeneroVisual());
        if (request.getRequisitos() != null) conv.setRequisitos(serializeRequisitos(request.getRequisitos()));
        if (request.getFechaLimite() != null) conv.setFechaLimite(request.getFechaLimite());
        if (request.getEstado() != null) conv.setEstado(request.getEstado());

        Convocatoria saved = convocatoriaRepository.save(conv);

        boolean sePublica = "ACTIVA".equals(saved.getEstado()) && !"ACTIVA".equals(estadoAnterior);
        if (sePublica) {
            notificarNuevaConvocatoria(saved);
        }

        return toDTO(saved);
    }

    private void notificarNuevaConvocatoria(Convocatoria conv) {
        try {
            List<User> alumnos = userRepository.findByRoleAndActiveTrueAndDeletedAtIsNullAndStatusNot(
                    User.Role.ALUMNO, 
                    User.ProfileStatus.INACTIVE
            );
            if (alumnos != null && !alumnos.isEmpty()) {
                String titulo = "Nueva convocatoria disponible";
                String mensaje = "Nueva convocatoria disponible: " + conv.getTitulo();
                notificacionService.crearNotificacionesParaUsuarios(
                        alumnos,
                        titulo,
                        mensaje,
                        "CONVOCATORIA",
                        conv.getId(),
                        "CONVOCATORIA"
                );
            }
        } catch (Exception e) {
            System.err.println("Error enviando notificaciones para nueva convocatoria: " + e.getMessage());
        }
    }

    public void deleteConvocatoria(UUID id) {
        Convocatoria conv = convocatoriaRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Convocatoria no encontrada"));
        
        List<Postulacion> postulaciones = postulacionRepository.findByConvocatoriaId(id);
        if (postulaciones != null) {
            for (Postulacion p : postulaciones) {
                // Postulaciones en estados no finales se cancelan (pero no se les pone deletedAt para que sigan visibles en historial)
                if (!"ACEPTADA".equals(p.getEstado()) && !"RECHAZADA".equals(p.getEstado()) && !"CANCELADA".equals(p.getEstado())) {
                    p.setEstado("CANCELADA");
                    p.setUpdatedAt(LocalDateTime.now());
                    postulacionRepository.save(p);
                    
                    // Cancelar audiciones asociadas que no estén evaluadas
                    List<Audicion> audiciones = audicionRepository.findByPostulacionId(p.getId());
                    if (audiciones != null) {
                        for (Audicion a : audiciones) {
                            if (!"EVALUADA".equals(a.getEstado()) && !"CANCELADA".equals(a.getEstado())) {
                                a.setEstado("CANCELADA");
                                a.setUpdatedAt(LocalDateTime.now());
                                audicionRepository.save(a);
                            }
                        }
                    }
                    
                    // Notificar al alumno
                    if (p.getAlumno() != null) {
                        try {
                            String mensajeNotif = "La convocatoria '" + conv.getTitulo() + "' fue eliminada. Tu postulación fue cancelada.";
                            notificacionService.crearNotificacion(
                                    p.getAlumno(),
                                    "Convocatoria eliminada",
                                    mensajeNotif,
                                    "POSTULACION",
                                    p.getId(),
                                    "POSTULACION"
                            );
                        } catch (Exception e) {
                            System.err.println("Error enviando notificación por eliminación de convocatoria: " + e.getMessage());
                        }
                    }
                }
            }
        }
        
        // Soft delete de la convocatoria
        conv.setDeletedAt(LocalDateTime.now());
        conv.setUpdatedAt(LocalDateTime.now());
        convocatoriaRepository.save(conv);
    }

    // ── Helpers ──────────────────────────────────────────────────────────

    /** Serializa lista a texto separado por '|' para almacenar en una columna TEXT */
    private String serializeRequisitos(List<String> requisitos) {
        if (requisitos == null || requisitos.isEmpty()) return "";
        return String.join("|", requisitos);
    }

    /** Deserializa texto separado por '|' a lista */
    private List<String> deserializeRequisitos(String requisitos) {
        if (requisitos == null || requisitos.isBlank()) return Collections.emptyList();
        return Arrays.asList(requisitos.split("\\|"));
    }

    private ConvocatoriaDTO toDTO(Convocatoria c) {
        return ConvocatoriaDTO.builder()
                .id(c.getId())
                .titulo(c.getTitulo())
                .descripcion(c.getDescripcion())
                .categoria(c.getCategoria())
                .generoVisual(c.getGeneroVisual())
                .requisitos(deserializeRequisitos(c.getRequisitos()))
                .fechaLimite(c.getFechaLimite())
                .estado(c.getEstado())
                .createdAt(c.getCreatedAt())
                .updatedAt(c.getUpdatedAt())
                .createdBy(c.getProfesor() != null ? c.getProfesor().getUsuarioId() : null)
                .build();
    }
}

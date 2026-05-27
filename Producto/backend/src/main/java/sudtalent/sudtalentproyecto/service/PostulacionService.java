package sudtalent.sudtalentproyecto.service;

import sudtalent.sudtalentproyecto.dto.PostulacionDTO;
import sudtalent.sudtalentproyecto.dto.PostulacionRequestDTO;
import sudtalent.sudtalentproyecto.model.Alumno;
import sudtalent.sudtalentproyecto.model.Convocatoria;
import sudtalent.sudtalentproyecto.model.Postulacion;
import sudtalent.sudtalentproyecto.repository.AlumnoRepository;
import sudtalent.sudtalentproyecto.repository.ConvocatoriaRepository;
import sudtalent.sudtalentproyecto.repository.PostulacionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class PostulacionService {

    private final PostulacionRepository postulacionRepository;
    private final AlumnoRepository alumnoRepository;
    private final ConvocatoriaRepository convocatoriaRepository;
    private final SoftDeleteService softDeleteService;

    // ── Create ───────────────────────────────────────────────────────────

    /**
     * Crea una postulación a partir del DTO.
     * El alumnoId puede venir en el body o extraerse del JWT (email como principal).
     */
    public PostulacionDTO createPostulacion(PostulacionRequestDTO request, Authentication authentication) {
        // Resolver alumno
        Alumno alumno = resolveAlumno(request.getAlumnoId(), authentication);

        // Resolver convocatoria
        Convocatoria convocatoria = convocatoriaRepository.findById(request.getConvocatoriaId())
                .orElseThrow(() -> new RuntimeException("Convocatoria no encontrada: " + request.getConvocatoriaId()));

        // Verificar que no exista una postulación activa duplicada
        boolean yaPostulo = postulacionRepository.findByAlumnoId(alumno.getId())
                .stream()
                .anyMatch(p -> p.getConvocatoria().getId().equals(convocatoria.getId()));
        if (yaPostulo) {
            throw new RuntimeException("Ya existe una postulación activa para esta convocatoria");
        }

        Postulacion postulacion = Postulacion.builder()
                .alumno(alumno)
                .convocatoria(convocatoria)
                .fechaPostulacion(LocalDate.now())
                .estado("PENDIENTE")
                .mensaje(request.getMensaje())
                .build();

        return toDTO(postulacionRepository.save(postulacion));
    }

    // ── Read ─────────────────────────────────────────────────────────────

    public List<PostulacionDTO> getAllPostulaciones() {
        return postulacionRepository.findAllActive().stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    public PostulacionDTO getPostulacionById(UUID id) {
        Postulacion postulacion = postulacionRepository.findByIdActive(id)
                .orElseThrow(() -> new RuntimeException("Postulación no encontrada"));
        return toDTO(postulacion);
    }

    public List<PostulacionDTO> getPostulacionesByAlumno(UUID alumnoId) {
        return postulacionRepository.findByAlumnoId(alumnoId).stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    public List<PostulacionDTO> getPostulacionesByConvocatoria(UUID convocatoriaId) {
        return postulacionRepository.findByConvocatoriaId(convocatoriaId).stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    // ── Update ───────────────────────────────────────────────────────────

    public PostulacionDTO updateEstado(UUID id, String nuevoEstado) {
        Postulacion postulacion = postulacionRepository.findByIdActive(id)
                .orElseThrow(() -> new RuntimeException("Postulación no encontrada"));
        postulacion.setEstado(nuevoEstado);
        return toDTO(postulacionRepository.save(postulacion));
    }

    // ── Delete ───────────────────────────────────────────────────────────

    public void deletePostulacion(UUID id) {
        softDeleteService.softDeletePostulacion(id);
    }

    // ── Helpers ──────────────────────────────────────────────────────────

    /**
     * Resuelve el Alumno: primero intenta alumnoId del body,
     * si no viene usa el email del JWT para buscarlo.
     */
    private Alumno resolveAlumno(UUID alumnoId, Authentication authentication) {
        if (alumnoId != null) {
            return alumnoRepository.findByIdActive(alumnoId)
                    .orElseThrow(() -> new RuntimeException("Alumno no encontrado: " + alumnoId));
        }
        // Extraer desde el JWT (el principal es el email del usuario)
        if (authentication == null || authentication.getName() == null) {
            throw new RuntimeException("No se pudo determinar el alumno: sin autenticación");
        }
        String email = authentication.getName();
        // Buscar al usuario por email y castear a Alumno
        return alumnoRepository.findAll().stream()
                .filter(a -> email.equals(a.getEmail()) && a.getDeletedAt() == null)
                .findFirst()
                .orElseThrow(() -> new RuntimeException("Alumno no encontrado para el usuario: " + email));
    }

    /**
     * Convierte Postulacion → PostulacionDTO con datos enriquecidos.
     * Alumno hereda de User: usa getName(), getEmail(), getPhone().
     * Convocatoria usa getTitulo() y getCategoria().
     */
    private PostulacionDTO toDTO(Postulacion p) {
        Alumno alumno = p.getAlumno();
        Convocatoria conv = p.getConvocatoria();

        return PostulacionDTO.builder()
                .id(p.getId())
                .alumnoId(alumno != null ? alumno.getId() : null)
                .convocatoriaId(conv != null ? conv.getId() : null)
                // Alumno hereda getName() / getEmail() / getPhone() de User
                .userName(alumno != null ? alumno.getName() : null)
                .userEmail(alumno != null ? alumno.getEmail() : null)
                .userPhone(alumno != null ? alumno.getPhone() : null)
                // Convocatoria campos nuevos
                .convocatoriaTitulo(conv != null ? conv.getTitulo() : null)
                .convocatoriaCategoria(conv != null ? conv.getCategoria() : null)
                // Postulacion
                .fechaPostulacion(p.getFechaPostulacion())
                .estado(p.getEstado())
                .createdAt(p.getCreatedAt())
                .updatedAt(p.getUpdatedAt())
                .deletedAt(p.getDeletedAt())
                .build();
    }
}

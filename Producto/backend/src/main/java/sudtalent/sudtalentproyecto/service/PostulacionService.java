package sudtalent.sudtalentproyecto.service;

import sudtalent.sudtalentproyecto.dto.PostulacionDTO;
import sudtalent.sudtalentproyecto.dto.PostulacionRequestDTO;
import sudtalent.sudtalentproyecto.model.Convocatoria;
import sudtalent.sudtalentproyecto.model.Postulacion;
import sudtalent.sudtalentproyecto.model.User;
import sudtalent.sudtalentproyecto.repository.PostulacionRepository;
import sudtalent.sudtalentproyecto.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class PostulacionService {

    private final PostulacionRepository postulacionRepository;
    private final SoftDeleteService softDeleteService;
    private final UserRepository userRepository;

    @PersistenceContext
    private EntityManager entityManager;

    // ── Create ───────────────────────────────────────────────────────────

    public PostulacionDTO createPostulacion(PostulacionRequestDTO request, Authentication authentication) {
        UUID userUUID = resolveUserId(request.getAlumnoId(), authentication);

        // Verificar duplicado
        boolean yaPostulo = postulacionRepository.findByAlumnoId(userUUID)
                .stream()
                .anyMatch(p -> p.getConvocatoria().getId().equals(request.getConvocatoriaId()));
        if (yaPostulo) {
            throw new RuntimeException("Ya existe una postulación activa para esta convocatoria");
        }

        // Usar getReference para evitar cargar entidades completas
        User userRef = entityManager.getReference(User.class, userUUID);
        Convocatoria convRef = entityManager.getReference(Convocatoria.class, request.getConvocatoriaId());

        Postulacion postulacion = Postulacion.builder()
                .alumno(userRef)
                .convocatoria(convRef)
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
     * Resuelve el UUID del usuario desde el JWT o el body.
     * Directo de UserRepository — no usa AlumnoRepository.
     */
    private UUID resolveUserId(UUID alumnoId, Authentication authentication) {
        if (alumnoId != null && userRepository.findByIdActive(alumnoId).isPresent()) {
            return alumnoId;
        }
        if (authentication == null || authentication.getName() == null) {
            throw new RuntimeException("No se pudo determinar el usuario: sin autenticación");
        }
        String email = authentication.getName();
        return userRepository.findByEmailActive(email)
                .map(User::getId)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado: " + email));
    }

    private PostulacionDTO toDTO(Postulacion p) {
        User user = p.getAlumno();
        Convocatoria conv = p.getConvocatoria();

        return PostulacionDTO.builder()
                .id(p.getId())
                .alumnoId(user != null ? user.getId() : null)
                .convocatoriaId(conv != null ? conv.getId() : null)
                .userName(user != null ? user.getName() : null)
                .userEmail(user != null ? user.getEmail() : null)
                .userPhone(user != null ? user.getPhone() : null)
                .convocatoriaTitulo(conv != null ? conv.getTitulo() : null)
                .convocatoriaCategoria(conv != null ? conv.getCategoria() : null)
                .fechaPostulacion(p.getFechaPostulacion())
                .estado(p.getEstado())
                .createdAt(p.getCreatedAt())
                .updatedAt(p.getUpdatedAt())
                .deletedAt(p.getDeletedAt())
                .build();
    }
}

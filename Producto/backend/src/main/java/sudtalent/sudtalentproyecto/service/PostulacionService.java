package sudtalent.sudtalentproyecto.service;

import sudtalent.sudtalentproyecto.dto.PostulacionDTO;
import sudtalent.sudtalentproyecto.dto.PostulacionRequestDTO;
import sudtalent.sudtalentproyecto.model.Convocatoria;
import sudtalent.sudtalentproyecto.model.Postulacion;
import sudtalent.sudtalentproyecto.model.User;
import sudtalent.sudtalentproyecto.model.VoiceAudio;
import sudtalent.sudtalentproyecto.model.Audicion;
import sudtalent.sudtalentproyecto.repository.PostulacionRepository;
import sudtalent.sudtalentproyecto.repository.UserRepository;
import sudtalent.sudtalentproyecto.repository.AudicionRepository;
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
    private final AudicionRepository audicionRepository;
    private final SoftDeleteService softDeleteService;
    private final UserRepository userRepository;
    private final NotificacionService notificacionService;

    @PersistenceContext
    private EntityManager entityManager;

    // ── Create ───────────────────────────────────────────────────────────

    public PostulacionDTO createPostulacion(PostulacionRequestDTO request, Authentication authentication) {
        // 1. Validar usuario autenticado
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new RuntimeException("Usuario no autenticado");
        }
        
        UUID userUUID = resolveUserId(request.getAlumnoId(), authentication);
        User userObj = userRepository.findByIdActive(userUUID)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));

        // 2. Validar que sea alumno
        if (userObj.getRole() != User.Role.ALUMNO) {
            throw new RuntimeException("Solo los alumnos pueden postular a convocatorias");
        }

        // 3. Asegurar fila en alumnos (herencia JOINED)
        try {
            entityManager.createNativeQuery(
                "INSERT INTO alumnos (usuario_id, fecha_nacimiento, created_at, updated_at) " +
                "VALUES (:id, NULL, NOW(), NOW()) ON CONFLICT (usuario_id) DO NOTHING"
            ).setParameter("id", userUUID).executeUpdate();
            entityManager.flush();
            System.out.println("✅ Asegurada fila en alumnos para: " + userUUID);
        } catch (Exception e) {
            System.err.println("Error asegurando fila en alumnos: " + e.getMessage());
        }

        // 4. Validar convocatoria (existe, activa, no vencida)
        Convocatoria convCheck = entityManager.find(Convocatoria.class, request.getConvocatoriaId());
        if (convCheck == null) {
            throw new RuntimeException("Convocatoria no encontrada");
        }
        if (!"ACTIVA".equals(convCheck.getEstado())) {
            throw new RuntimeException("Esta convocatoria no está activa");
        }
        if (convCheck.getFechaLimite() != null && LocalDate.now().isAfter(convCheck.getFechaLimite())) {
            throw new RuntimeException("El plazo de postulación para esta convocatoria ha vencido");
        }

        // 5. Validar demo seleccionada y que pertenezca al alumno
        if (request.getVoiceAudioId() == null) {
            throw new RuntimeException("Debes seleccionar una demo para postular");
        }
        VoiceAudio audioRef = entityManager.find(VoiceAudio.class, request.getVoiceAudioId());
        if (audioRef == null || audioRef.isDeleted() || !audioRef.getUser().getId().equals(userUUID)) {
            throw new RuntimeException("El audio seleccionado no pertenece al usuario o no es válido");
        }

        // 6. Validar que no exista una postulación activa previa para esa convocatoria
        List<Postulacion> existingList = postulacionRepository.findByAlumnoIdAndConvocatoriaId(userUUID, request.getConvocatoriaId());
        if (existingList != null && !existingList.isEmpty()) {
            // Un duplicado activo es aquel que no está eliminado y NO está en estado CANCELADA
            Postulacion activePostulation = existingList.stream()
                .filter(p -> p.getDeletedAt() == null && !"CANCELADA".equals(p.getEstado()))
                .findFirst()
                .orElse(null);
            
            if (activePostulation != null) {
                throw new RuntimeException("Ya existe una postulación activa para esta convocatoria");
            }
            
            // Si la postulación existente está cancelada (y no eliminada), la reactivamos
            Postulacion existingCancelled = existingList.stream()
                .filter(p -> p.getDeletedAt() == null && "CANCELADA".equals(p.getEstado()))
                .findFirst()
                .orElse(null);

            if (existingCancelled != null) {
                // Cancelar de forma definitiva cualquier audición vieja que pudiera estar colgada
                List<Audicion> oldAuds = audicionRepository.findByPostulacionId(existingCancelled.getId());
                if (oldAuds != null) {
                    for (Audicion aud : oldAuds) {
                        if (!"CANCELADA".equals(aud.getEstado())) {
                            aud.setEstado("CANCELADA");
                            aud.setUpdatedAt(java.time.LocalDateTime.now());
                            audicionRepository.save(aud);
                        }
                    }
                }

                existingCancelled.setDeletedAt(null);
                existingCancelled.setEstado("PENDIENTE");
                existingCancelled.setFechaPostulacion(LocalDate.now());
                existingCancelled.setUpdatedAt(java.time.LocalDateTime.now());
                if (request.getMensaje() != null) {
                    existingCancelled.setMensaje(request.getMensaje());
                } else {
                    existingCancelled.setMensaje(null);
                }
                existingCancelled.setVoiceAudio(audioRef);
                Postulacion reactivated = postulacionRepository.save(existingCancelled);
                
                // Notificar a todos los administradores
                try {
                    List<User> admins = userRepository.findByRoleAndDeletedAtIsNull(User.Role.ADMIN);
                    if (admins != null && !admins.isEmpty()) {
                        String nombreAlumno = userObj.getName();
                        String tituloConv = convCheck.getTitulo();
                        String tituloNotif = "Nueva postulación recibida";
                        String mensajeNotif = nombreAlumno + " postuló a la convocatoria '" + tituloConv + "'.";
                        notificacionService.crearNotificacionesParaUsuarios(
                                admins,
                                tituloNotif,
                                mensajeNotif,
                                "POSTULACION",
                                reactivated.getId(),
                                "POSTULACION"
                        );
                    }
                } catch (Exception e) {
                    System.err.println("Error enviando notificaciones a administradores al reactivar: " + e.getMessage());
                }
                
                return toDTO(reactivated);
            }
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
                .voiceAudio(audioRef)
                .build();

        Postulacion saved = postulacionRepository.save(postulacion);

        // Notificar a todos los administradores
        try {
            List<User> admins = userRepository.findByRoleAndDeletedAtIsNull(User.Role.ADMIN);
            if (admins != null && !admins.isEmpty()) {
                String nombreAlumno = userObj.getName();
                String tituloConv = convCheck.getTitulo();
                String tituloNotif = "Nueva postulación recibida";
                String mensajeNotif = nombreAlumno + " postuló a la convocatoria '" + tituloConv + "'.";
                notificacionService.crearNotificacionesParaUsuarios(
                        admins,
                        tituloNotif,
                        mensajeNotif,
                        "POSTULACION",
                        saved.getId(),
                        "POSTULACION"
                );
            }
        } catch (Exception e) {
            System.err.println("Error enviando notificaciones a administradores: " + e.getMessage());
        }

        return toDTO(saved);
    }

    // ── Read ─────────────────────────────────────────────────────────────

    private java.util.Map<UUID, List<Audicion>> getAuditionsMapForPostulaciones(List<Postulacion> postulaciones) {
        if (postulaciones == null || postulaciones.isEmpty()) {
            return java.util.Collections.emptyMap();
        }
        List<UUID> postIds = postulaciones.stream().map(Postulacion::getId).collect(Collectors.toList());
        List<Audicion> auditions = audicionRepository.findByPostulacionIds(postIds);
        if (auditions == null) {
            return java.util.Collections.emptyMap();
        }
        return auditions.stream().collect(Collectors.groupingBy(a -> a.getPostulacion().getId()));
    }

    public List<PostulacionDTO> getAllPostulaciones() {
        List<Postulacion> postulaciones = postulacionRepository.findAllActive();
        java.util.Map<UUID, List<Audicion>> auditionsMap = getAuditionsMapForPostulaciones(postulaciones);
        return postulaciones.stream()
                .map(p -> toDTO(p, auditionsMap))
                .collect(Collectors.toList());
    }

    public PostulacionDTO getPostulacionById(UUID id) {
        Postulacion postulacion = postulacionRepository.findByIdActive(id)
                .orElseThrow(() -> new RuntimeException("Postulación no encontrada"));
        return toDTO(postulacion);
    }

    public List<PostulacionDTO> getPostulacionesByAlumno(UUID alumnoId) {
        List<Postulacion> postulaciones = postulacionRepository.findByAlumnoId(alumnoId);
        java.util.Map<UUID, List<Audicion>> auditionsMap = getAuditionsMapForPostulaciones(postulaciones);
        return postulaciones.stream()
                .map(p -> toDTO(p, auditionsMap))
                .collect(Collectors.toList());
    }

    public List<PostulacionDTO> getPostulacionesByConvocatoria(UUID convocatoriaId) {
        List<Postulacion> postulaciones = postulacionRepository.findByConvocatoriaId(convocatoriaId);
        java.util.Map<UUID, List<Audicion>> auditionsMap = getAuditionsMapForPostulaciones(postulaciones);
        return postulaciones.stream()
                .map(p -> toDTO(p, auditionsMap))
                .collect(Collectors.toList());
    }

    // ── Update ───────────────────────────────────────────────────────────

    public PostulacionDTO updatePostulacion(UUID id, String nuevoEstado, String nuevoMensaje, UUID nuevoVoiceAudioId, Authentication authentication) {
        Postulacion postulacion = postulacionRepository.findByIdActive(id)
                .orElseThrow(() -> new RuntimeException("Postulación no encontrada"));
        
        // Determinar el usuario autenticado
        UUID authenticatedUserId = resolveUserId(null, authentication);
        
        // Obtener el rol del usuario autenticado
        boolean isAdmin = authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN") || a.getAuthority().equals("ADMIN"));
        boolean isProfesor = authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_PROFESOR") || a.getAuthority().equals("PROFESOR"));
        
        // Si el usuario es ALUMNO, validar propiedad y estado
        if (!isAdmin && !isProfesor) {
            // El alumno debe ser el dueño de la postulación
            if (postulacion.getAlumno() == null || !postulacion.getAlumno().getId().equals(authenticatedUserId)) {
                throw new org.springframework.security.access.AccessDeniedException("No tienes permisos para editar esta postulación");
            }
            
            // Verificar si la postulación tiene audiciones evaluadas
            List<Audicion> audiciones = entityManager.createQuery(
                    "SELECT a FROM Audicion a WHERE a.postulacion.id = :postulacionId", Audicion.class)
                    .setParameter("postulacionId", id)
                    .getResultList();
            boolean tieneAudicionEvaluada = audiciones.stream()
                    .anyMatch(a -> "EVALUADA".equals(a.getEstado()));
            if (tieneAudicionEvaluada) {
                throw new RuntimeException("No se puede cancelar ni editar una postulación que ya tiene una audición evaluada");
            }

            boolean isCanceling = "CANCELADA".equals(nuevoEstado);
            if (isCanceling) {
                // Para cancelar, el estado actual debe ser PENDIENTE o EN_REVISION
                String currentEstado = postulacion.getEstado();
                if (!"PENDIENTE".equals(currentEstado) && !"EN_REVISION".equals(currentEstado)) {
                    throw new RuntimeException("Solo se pueden cancelar postulaciones en estado PENDIENTE o EN_REVISION");
                }
            } else {
                // Si está editando (mensaje o demo), la postulación debe estar en estado PENDIENTE o EN_REVISION
                String currentEstado = postulacion.getEstado();
                if (!"PENDIENTE".equals(currentEstado) && !"EN_REVISION".equals(currentEstado)) {
                    throw new RuntimeException("Solo se pueden editar postulaciones en estado PENDIENTE o EN_REVISION");
                }
                // El alumno no puede cambiar el estado de la postulación a otra cosa
                if (nuevoEstado != null && !nuevoEstado.equals(postulacion.getEstado())) {
                    throw new org.springframework.security.access.AccessDeniedException("No tienes permisos para cambiar el estado de la postulación");
                }
            }
        }

        boolean estadoCambiado = false;
        String estadoAnterior = postulacion.getEstado();
        if (nuevoEstado != null && !nuevoEstado.equals(estadoAnterior)) {
            postulacion.setEstado(nuevoEstado);
            estadoCambiado = true;

            if ("CANCELADA".equals(nuevoEstado)) {
                // Cancelar también todas las audiciones no evaluadas asociadas a esta postulación
                List<Audicion> audiciones = audicionRepository.findByPostulacionId(id);
                if (audiciones != null) {
                    for (Audicion aud : audiciones) {
                        if (!"EVALUADA".equals(aud.getEstado())) {
                            aud.setEstado("CANCELADA");
                            aud.setUpdatedAt(java.time.LocalDateTime.now());
                            audicionRepository.save(aud);
                        }
                    }
                }
            }
        }
        if (nuevoMensaje != null) {
            postulacion.setMensaje(nuevoMensaje);
        }
        if (nuevoVoiceAudioId != null) {
            VoiceAudio audioRef = entityManager.find(VoiceAudio.class, nuevoVoiceAudioId);
            if (audioRef == null || audioRef.isDeleted() || !audioRef.getUser().getId().equals(postulacion.getAlumno().getId())) {
                throw new RuntimeException("El audio seleccionado no pertenece al usuario o no es válido");
            }
            postulacion.setVoiceAudio(audioRef);
        }

        Postulacion saved = postulacionRepository.save(postulacion);
        if (estadoCambiado && saved.getAlumno() != null) {
            try {
                String convTitulo = saved.getConvocatoria() != null ? saved.getConvocatoria().getTitulo() : "Convocatoria";
                notificacionService.crearNotificacion(
                        saved.getAlumno(),
                        "Estado de postulación actualizado",
                        "Tu postulación a '" + convTitulo + "' cambió a: " + nuevoEstado + ".",
                        "POSTULACION",
                        saved.getId(),
                        "POSTULACION"
                );
            } catch (Exception e) {
                System.err.println("Error enviando notificación de postulación: " + e.getMessage());
            }
        }
        return toDTO(saved);
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
        return toDTO(p, null);
    }

    private PostulacionDTO toDTO(Postulacion p, java.util.Map<UUID, List<Audicion>> auditionsMap) {
        User user = p.getAlumno();
        Convocatoria conv = p.getConvocatoria();
        VoiceAudio audio = p.getVoiceAudio();

        PostulacionDTO.PostulacionDTOBuilder builder = PostulacionDTO.builder()
                .id(p.getId())
                .alumnoId(user != null ? user.getId() : null)
                .convocatoriaId(conv != null ? conv.getId() : null)
                .userName(user != null ? user.getName() : null)
                .userEmail(user != null ? user.getEmail() : null)
                .userPhone(user != null ? user.getPhone() : null)
                .alumnoSpecialties(user != null ? user.getSpecialties() : null)
                .convocatoriaTitulo(conv != null ? conv.getTitulo() : null)
                .convocatoriaCategoria(conv != null ? conv.getCategoria() : null)
                .convocatoriaDeleted(conv != null && conv.getDeletedAt() != null)
                .fechaPostulacion(p.getFechaPostulacion())
                .estado(p.getEstado())
                .mensaje(p.getMensaje())
                .voiceAudioId(audio != null ? audio.getId() : null)
                .voiceAudioTitle(audio != null ? audio.getTitle() : null)
                .voiceAudioUrl(audio != null ? audio.getFileUrl() : null)
                .createdAt(p.getCreatedAt())
                .updatedAt(p.getUpdatedAt())
                .deletedAt(p.getDeletedAt());

        if (audicionRepository != null) {
            List<Audicion> auds = null;
            if (auditionsMap != null) {
                auds = auditionsMap.get(p.getId());
            } else {
                auds = audicionRepository.findByPostulacionId(p.getId());
            }
            if (auds != null && !auds.isEmpty()) {
                // Priorizar evaluadas, luego programadas, luego canceladas u otras
                Audicion mainAud = auds.stream()
                        .filter(a -> "EVALUADA".equals(a.getEstado()))
                        .findFirst()
                        .orElse(
                            auds.stream()
                                .filter(a -> "PROGRAMADA".equals(a.getEstado()))
                                .findFirst()
                                .orElse(auds.get(0))
                        );

                builder.audicionId(mainAud.getId())
                       .audicionPuntaje(mainAud.getPuntaje())
                       .audicionObservaciones(mainAud.getObservaciones())
                       .audicionFecha(mainAud.getFecha())
                       .audicionHora(mainAud.getHora())
                       .audicionModalidad(mainAud.getModalidad())
                       .audicionLugar(mainAud.getLugar())
                       .audicionLink(mainAud.getLink())
                       .audicionEstado(mainAud.getEstado())
                       .audicionResultado(mainAud.getResultado())
                       .audicionProfesorNombre(mainAud.getProfesor() != null && mainAud.getProfesor().getUsuario() != null 
                                               ? mainAud.getProfesor().getUsuario().getName() 
                                               : (mainAud.getProfesor() != null ? "Profesor" : null));
            }
        }

        return builder.build();
    }
}

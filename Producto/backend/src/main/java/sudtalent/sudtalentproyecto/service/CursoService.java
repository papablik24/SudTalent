package sudtalent.sudtalentproyecto.service;

import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import sudtalent.sudtalentproyecto.dto.CursoDTO;
import sudtalent.sudtalentproyecto.model.Curso;
import sudtalent.sudtalentproyecto.model.User;
import sudtalent.sudtalentproyecto.repository.CursoRepository;
import sudtalent.sudtalentproyecto.repository.UserRepository;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class CursoService {

    private final CursoRepository cursoRepository;
    private final UserRepository userRepository;

    // ── Catálogo fijo de cursos ──────────────────────────────────────
    private static final List<String[]> CATALOGO = List.of(
        new String[]{"doblaje-presencial",  "Interpretación para Doblaje de Voz",          "PRESENCIAL", "Técnicas de actuación vocal para doblaje en estudio presencial."},
        new String[]{"doblaje-online",      "Interpretación para Doblaje de Voz",          "ONLINE",     "Versión online del curso de interpretación para doblaje."},
        new String[]{"doblaje-musical",     "Doblaje Musical",                             "PRESENCIAL", "Técnicas especializadas en doblaje de canciones y musicales."},
        new String[]{"locucion-presencial", "Locución Publicitaria y Corporativa",          "PRESENCIAL", "Locución para spots publicitarios, institucionales y corporativos."},
        new String[]{"canto",               "Canto: Estudio y Performance",               "PRESENCIAL", "Técnica vocal, estudio y performance en escena."},
        new String[]{"intensivo-360",       "Curso Intensivo 360 Doblaje",                "ONLINE",     "Formación intensiva online que cubre todos los aspectos del doblaje."},
        new String[]{"doblaje-advance",     "Doblaje Advance",                            "ONLINE",     "Nivel avanzado para profesionales que buscan perfeccionar su técnica."},
        new String[]{"opening-lab",         "Opening Lab: Actuación Frente a Cámara",    "PRESENCIAL", "Laboratorio de actuación frente a cámara para actores de voz."}
    );

    /**
     * Inicializa los cursos del catálogo si no existen en BD.
     * Se ejecuta al arrancar la aplicación.
     */
    @PostConstruct
    public void initializeCatalog() {
        for (String[] entry : CATALOGO) {
            String key = entry[0];
            if (cursoRepository.findByCursoKey(key).isEmpty()) {
                Curso curso = Curso.builder()
                        .cursoKey(key)
                        .titulo(entry[1])
                        .modalidad(entry[2])
                        .descripcion(entry[3])
                        .build();
                cursoRepository.save(curso);
                System.out.println("✅ Curso inicializado: " + key);
            }
        }
    }

    // ── Admin: asignar profesor ──────────────────────────────────────

    public CursoDTO assignProfesor(UUID cursoId, UUID profesorId) {
        Curso curso = cursoRepository.findById(cursoId)
                .orElseThrow(() -> new RuntimeException("Curso no encontrado"));

        if (profesorId == null) {
            curso.setProfesor(null);
        } else {
            User profesor = userRepository.findById(profesorId)
                    .orElseThrow(() -> new RuntimeException("Profesor no encontrado"));
            curso.setProfesor(profesor);
        }
        curso.setUpdatedAt(LocalDateTime.now());
        return toDTO(cursoRepository.save(curso));
    }

    // ── Alumno: enrolarse / desinscribirse ───────────────────────────

    public CursoDTO enroll(UUID cursoId, UUID alumnoId) {
        Curso curso = cursoRepository.findById(cursoId)
                .orElseThrow(() -> new RuntimeException("Curso no encontrado"));
        User alumno = userRepository.findById(alumnoId)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));

        if (curso.getAlumnos().stream().anyMatch(a -> a.getAlumnoId().equals(alumnoId))) {
            throw new IllegalStateException("Ya estás inscrito en este curso");
        }

        Curso.CursoAlumno entrada = new Curso.CursoAlumno(
                alumno.getId(),
                alumno.getName(),
                alumno.getEmail(),
                alumno.getProfileImageUrl(),
                java.time.LocalDateTime.now()
        );

        curso.getAlumnos().add(entrada);
        curso.setUpdatedAt(java.time.LocalDateTime.now());
        return toDTO(cursoRepository.save(curso));
    }

    public CursoDTO unenroll(UUID cursoId, UUID alumnoId) {
        Curso curso = cursoRepository.findById(cursoId)
                .orElseThrow(() -> new RuntimeException("Curso no encontrado"));
        curso.getAlumnos().removeIf(a -> a.getAlumnoId().equals(alumnoId));
        curso.setUpdatedAt(java.time.LocalDateTime.now());
        return toDTO(cursoRepository.save(curso));
    }

    // ── Consultas ────────────────────────────────────────────────────

    public List<CursoDTO> getAllCursos() {
        return cursoRepository.findAllWithDetails().stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    public CursoDTO getCursoById(UUID id) {
        return toDTO(cursoRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Curso no encontrado")));
    }

    public List<CursoDTO> getCursosByAlumno(UUID alumnoId) {
        return cursoRepository.findByAlumnoId(alumnoId).stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    public List<CursoDTO> getCursosByProfesor(UUID profesorId) {
        return cursoRepository.findByProfesorId(profesorId).stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    @Transactional
    public void asignarCursosAProfesor(UUID profesorId, List<UUID> cursoIds) {
        User profesor = userRepository.findById(profesorId)
                .orElseThrow(() -> new RuntimeException("Profesor no encontrado"));

        List<Curso> todosLosCursos = cursoRepository.findAll();

        for (Curso curso : todosLosCursos) {
            boolean debeEstarAsignado = cursoIds.contains(curso.getId());
            boolean estaAsignadoAEsteProfesor = curso.getProfesor() != null && curso.getProfesor().getId().equals(profesorId);

            if (debeEstarAsignado && !estaAsignadoAEsteProfesor) {
                curso.setProfesor(profesor);
                cursoRepository.save(curso);
            } else if (!debeEstarAsignado && estaAsignadoAEsteProfesor) {
                curso.setProfesor(null);
                cursoRepository.save(curso);
            }
        }
    }

    // ── Mapper ───────────────────────────────────────────────────────

    private CursoDTO toDTO(Curso c) {
        List<CursoDTO.AlumnoResumenDTO> alumnos = c.getAlumnos().stream()
                .map(a -> CursoDTO.AlumnoResumenDTO.builder()
                        .id(a.getAlumnoId())
                        .nombre(a.getNombreAlumno())
                        .email(a.getEmailAlumno())
                        .profileImageUrl(a.getProfileImageUrl())
                        .build())
                .collect(Collectors.toList());

        return CursoDTO.builder()
                .id(c.getId())
                .cursoKey(c.getCursoKey())
                .titulo(c.getTitulo())
                .descripcion(c.getDescripcion())
                .modalidad(c.getModalidad())
                .profesorId(c.getProfesor() != null ? c.getProfesor().getId() : null)
                .profesorNombre(c.getProfesor() != null ? c.getProfesor().getName() : null)
                .alumnos(alumnos)
                .totalAlumnos(alumnos.size())
                .createdAt(c.getCreatedAt())
                .updatedAt(c.getUpdatedAt())
                .build();
    }
}

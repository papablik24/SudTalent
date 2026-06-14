package sudtalent.sudtalentproyecto.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import sudtalent.sudtalentproyecto.dto.AgendaEventoDTO;
import sudtalent.sudtalentproyecto.model.AgendaEvento;
import sudtalent.sudtalentproyecto.model.Curso;
import sudtalent.sudtalentproyecto.model.User;
import sudtalent.sudtalentproyecto.repository.AgendaEventoRepository;
import sudtalent.sudtalentproyecto.repository.CursoRepository;
import sudtalent.sudtalentproyecto.repository.UserRepository;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class AgendaEventoService {

    private final AgendaEventoRepository agendaEventoRepository;
    private final CursoRepository cursoRepository;
    private final UserRepository userRepository;

    public List<AgendaEventoDTO> getAgendaByProfesor(UUID profesorId) {
        return agendaEventoRepository.findByProfesorIdOrderByFechaAscHoraAsc(profesorId)
                .stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    public List<AgendaEventoDTO> getAgendaByCurso(UUID cursoId, UUID userId, User.Role role) {
        Curso curso = cursoRepository.findById(cursoId)
                .orElseThrow(() -> new RuntimeException("Curso no encontrado"));

        if (role == User.Role.ADMIN) {
            // ADMIN puede ver agenda de cualquier curso.
        } else if (role == User.Role.PROFESOR) {
            // PROFESOR puede ver agenda de sus cursos asignados.
            if (curso.getProfesor() == null || !curso.getProfesor().getId().equals(userId)) {
                throw new SecurityException("No tienes permiso para ver la agenda de este curso");
            }
        } else if (role == User.Role.ALUMNO) {
            // ALUMNO/USER solo puede ver agenda de cursos donde está inscrito.
            boolean isEnrolled = curso.getAlumnos().stream()
                    .anyMatch(a -> a.getAlumnoId().equals(userId));
            if (!isEnrolled) {
                throw new SecurityException("No tienes permiso para ver la agenda de este curso (no estás inscrito)");
            }
        } else {
            throw new SecurityException("Rol no autorizado");
        }

        return agendaEventoRepository.findByCursoIdOrderByFechaAscHoraAsc(cursoId)
                .stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    public AgendaEventoDTO createEvento(UUID profesorId, UUID cursoId, String titulo, String descripcion, LocalDate fecha, String hora, String link) {
        User profesor = userRepository.findById(profesorId)
                .orElseThrow(() -> new RuntimeException("Profesor no encontrado"));

        Curso curso = cursoRepository.findById(cursoId)
                .orElseThrow(() -> new RuntimeException("Curso no encontrado"));

        // Validar que el curso pertenezca al profesor autenticado
        if (curso.getProfesor() == null || !curso.getProfesor().getId().equals(profesorId)) {
            throw new SecurityException("No puedes agendar eventos en un curso que no tienes asignado");
        }

        if (titulo == null || titulo.isBlank()) {
            throw new IllegalArgumentException("El título es obligatorio");
        }
        if (fecha == null) {
            throw new IllegalArgumentException("La fecha es obligatoria");
        }
        if (hora == null || hora.isBlank()) {
            throw new IllegalArgumentException("La hora es obligatoria");
        }

        AgendaEvento evento = AgendaEvento.builder()
                .profesor(profesor)
                .curso(curso)
                .titulo(titulo.trim())
                .descripcion(descripcion != null ? descripcion.trim() : null)
                .fecha(fecha)
                .hora(hora.trim())
                .link(link != null && !link.isBlank() ? link.trim() : null)
                .build();

        return toDTO(agendaEventoRepository.save(evento));
    }

    public AgendaEventoDTO updateEvento(UUID profesorId, UUID eventoId, UUID cursoId, String titulo, String descripcion, LocalDate fecha, String hora, String link) {
        AgendaEvento evento = agendaEventoRepository.findById(eventoId)
                .orElseThrow(() -> new RuntimeException("Evento de agenda no encontrado"));

        // Validar que el evento pertenezca al profesor autenticado
        if (!evento.getProfesor().getId().equals(profesorId)) {
            throw new SecurityException("No tienes permiso para editar este evento de la agenda");
        }

        Curso curso = cursoRepository.findById(cursoId)
                .orElseThrow(() -> new RuntimeException("Curso no encontrado"));

        // Validar que el curso pertenezca al profesor autenticado
        if (curso.getProfesor() == null || !curso.getProfesor().getId().equals(profesorId)) {
            throw new SecurityException("No puedes asignar este evento a un curso que no tienes asignado");
        }

        if (titulo == null || titulo.isBlank()) {
            throw new IllegalArgumentException("El título es obligatorio");
        }
        if (fecha == null) {
            throw new IllegalArgumentException("La fecha es obligatoria");
        }
        if (hora == null || hora.isBlank()) {
            throw new IllegalArgumentException("La hora es obligatoria");
        }

        evento.setCurso(curso);
        evento.setTitulo(titulo.trim());
        evento.setDescripcion(descripcion != null ? descripcion.trim() : null);
        evento.setFecha(fecha);
        evento.setHora(hora.trim());
        evento.setLink(link != null && !link.isBlank() ? link.trim() : null);
        evento.setUpdatedAt(LocalDateTime.now());

        return toDTO(agendaEventoRepository.save(evento));
    }

    public void deleteEvento(UUID profesorId, UUID eventoId) {
        AgendaEvento evento = agendaEventoRepository.findById(eventoId)
                .orElseThrow(() -> new RuntimeException("Evento de agenda no encontrado"));

        // Validar que el evento pertenezca al profesor autenticado
        if (!evento.getProfesor().getId().equals(profesorId)) {
            throw new SecurityException("No tienes permiso para eliminar este evento de la agenda");
        }

        agendaEventoRepository.delete(evento);
    }

    private AgendaEventoDTO toDTO(AgendaEvento e) {
        return AgendaEventoDTO.builder()
                .id(e.getId())
                .profesorId(e.getProfesor().getId())
                .cursoId(e.getCurso().getId())
                .cursoTitulo(e.getCurso().getTitulo())
                .titulo(e.getTitulo())
                .descripcion(e.getDescripcion())
                .fecha(e.getFecha())
                .hora(e.getHora())
                .link(e.getLink())
                .createdAt(e.getCreatedAt())
                .updatedAt(e.getUpdatedAt())
                .build();
    }
}

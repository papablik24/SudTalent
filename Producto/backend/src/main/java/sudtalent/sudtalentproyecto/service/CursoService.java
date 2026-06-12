package sudtalent.sudtalentproyecto.service;

import sudtalent.sudtalentproyecto.dto.CursoDTO;
import sudtalent.sudtalentproyecto.model.Curso;
import sudtalent.sudtalentproyecto.repository.CursoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CursoService {

    private final CursoRepository cursoRepository;

    public List<CursoDTO> getAllCursos() {
        return cursoRepository.findAll().stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    public List<CursoDTO> getCursosByProfesor(UUID profesorId) {
        return cursoRepository.findByProfesorUsuarioId(profesorId).stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    private CursoDTO toDTO(Curso c) {
        if (c == null) return null;
        return CursoDTO.builder()
                .id(c.getId())
                .cursoKey(c.getCursoKey())
                .descripcion(c.getDescripcion())
                .modalidad(c.getModalidad())
                .titulo(c.getTitulo())
                .profesorId(c.getProfesor() != null ? c.getProfesor().getUsuarioId() : null)
                .createdAt(c.getCreatedAt())
                .updatedAt(c.getUpdatedAt())
                .build();
    }
}

package sudtalent.sudtalentproyecto.service;

import sudtalent.sudtalentproyecto.dto.ConvocatoriaDTO;
import sudtalent.sudtalentproyecto.dto.ConvocatoriaRequestDTO;
import sudtalent.sudtalentproyecto.model.Convocatoria;
import sudtalent.sudtalentproyecto.repository.ConvocatoriaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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
        return toDTO(convocatoriaRepository.save(conv));
    }

    // ── Read ─────────────────────────────────────────────────────────────

    public List<ConvocatoriaDTO> getAllConvocatorias() {
        return convocatoriaRepository.findAll().stream()
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

        if (request.getTitulo() != null) conv.setTitulo(request.getTitulo());
        if (request.getDescripcion() != null) conv.setDescripcion(request.getDescripcion());
        if (request.getCategoria() != null) conv.setCategoria(request.getCategoria());
        if (request.getGeneroVisual() != null) conv.setGeneroVisual(request.getGeneroVisual());
        if (request.getRequisitos() != null) conv.setRequisitos(serializeRequisitos(request.getRequisitos()));
        if (request.getFechaLimite() != null) conv.setFechaLimite(request.getFechaLimite());
        if (request.getEstado() != null) conv.setEstado(request.getEstado());

        return toDTO(convocatoriaRepository.save(conv));
    }

    // ── Delete ───────────────────────────────────────────────────────────

    public void deleteConvocatoria(UUID id) {
        convocatoriaRepository.deleteById(id);
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

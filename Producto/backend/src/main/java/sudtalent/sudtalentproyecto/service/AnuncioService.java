package sudtalent.sudtalentproyecto.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import sudtalent.sudtalentproyecto.dto.AnuncioDTO;
import sudtalent.sudtalentproyecto.model.Anuncio;
import sudtalent.sudtalentproyecto.model.Curso;
import sudtalent.sudtalentproyecto.model.User;
import sudtalent.sudtalentproyecto.repository.AnuncioRepository;
import sudtalent.sudtalentproyecto.repository.CursoRepository;
import sudtalent.sudtalentproyecto.repository.UserRepository;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class AnuncioService {

    private final AnuncioRepository anuncioRepository;
    private final CursoRepository cursoRepository;
    private final UserRepository userRepository;

    public List<AnuncioDTO> getAnunciosByCurso(UUID cursoId) {
        return anuncioRepository.findByCursoIdOrderByCreatedAtDesc(cursoId)
                .stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    public AnuncioDTO createAnuncio(UUID cursoId, UUID autorId, Map<String, String> body) {
        Curso curso = cursoRepository.findById(cursoId)
                .orElseThrow(() -> new RuntimeException("Curso no encontrado"));
        User autor = userRepository.findById(autorId)
                .orElseThrow(() -> new RuntimeException("Autor no encontrado"));

        String tipo = body.getOrDefault("tipo", "ANUNCIO");
        String titulo = body.get("titulo");
        String contenido = body.get("contenido");
        String urlRecurso = body.get("urlRecurso");

        if (titulo == null || titulo.isBlank()) throw new IllegalArgumentException("El título es obligatorio");
        if (contenido == null || contenido.isBlank()) throw new IllegalArgumentException("El contenido es obligatorio");

        Anuncio anuncio = Anuncio.builder()
                .curso(curso)
                .autor(autor)
                .tipo(tipo)
                .titulo(titulo.trim())
                .contenido(contenido.trim())
                .urlRecurso(urlRecurso != null && !urlRecurso.isBlank() ? urlRecurso.trim() : null)
                .build();

        return toDTO(anuncioRepository.save(anuncio));
    }

    public void deleteAnuncio(UUID anuncioId, UUID autorId) {
        Anuncio anuncio = anuncioRepository.findById(anuncioId)
                .orElseThrow(() -> new RuntimeException("Anuncio no encontrado"));
        User executor = userRepository.findById(autorId)
                .orElseThrow(() -> new RuntimeException("Usuario ejecutor no encontrado"));
        // Solo el autor o admin puede eliminar
        if (!anuncio.getAutor().getId().toString().equals(autorId.toString()) && executor.getRole() != User.Role.ADMIN) {
            throw new SecurityException("No tienes permiso para eliminar este anuncio");
        }
        anuncioRepository.deleteById(anuncioId);
    }

    public AnuncioDTO updateAnuncio(UUID anuncioId, UUID autorId, Map<String, String> body) {
        Anuncio anuncio = anuncioRepository.findById(anuncioId)
                .orElseThrow(() -> new RuntimeException("Anuncio no encontrado"));
        User executor = userRepository.findById(autorId)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
        // Solo el autor o admin puede editar
        if (!anuncio.getAutor().getId().toString().equals(autorId.toString()) && executor.getRole() != User.Role.ADMIN) {
            throw new SecurityException("No tienes permiso para editar este anuncio");
        }

        String tipo = body.get("tipo");
        String titulo = body.get("titulo");
        String contenido = body.get("contenido");
        String urlRecurso = body.get("urlRecurso");

        if (titulo == null || titulo.isBlank()) throw new IllegalArgumentException("El título es obligatorio");
        if (contenido == null || contenido.isBlank()) throw new IllegalArgumentException("El contenido es obligatorio");

        if (tipo != null && !tipo.isBlank()) {
            anuncio.setTipo(tipo.trim());
        }
        anuncio.setTitulo(titulo.trim());
        anuncio.setContenido(contenido.trim());
        anuncio.setUrlRecurso(urlRecurso != null && !urlRecurso.isBlank() ? urlRecurso.trim() : null);
        anuncio.setUpdatedAt(java.time.LocalDateTime.now());

        return toDTO(anuncioRepository.save(anuncio));
    }

    private AnuncioDTO toDTO(Anuncio a) {
        return AnuncioDTO.builder()
                .id(a.getId())
                .cursoId(a.getCurso().getId())
                .autorId(a.getAutor().getId())
                .autorNombre(a.getAutor().getName())
                .autorImageUrl(a.getAutor().getProfileImageUrl())
                .tipo(a.getTipo())
                .titulo(a.getTitulo())
                .contenido(a.getContenido())
                .urlRecurso(a.getUrlRecurso())
                .createdAt(a.getCreatedAt())
                .updatedAt(a.getUpdatedAt())
                .build();
    }
}

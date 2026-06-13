package sudtalent.sudtalentproyecto.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import sudtalent.sudtalentproyecto.dto.AnuncioDTO;
import sudtalent.sudtalentproyecto.model.User;
import sudtalent.sudtalentproyecto.repository.UserRepository;
import sudtalent.sudtalentproyecto.service.AnuncioService;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/anuncios/curso")
@RequiredArgsConstructor
public class AnuncioController {

    private final AnuncioService anuncioService;
    private final UserRepository userRepository;

    /** Todos pueden ver los anuncios de un curso al que tienen acceso */
    @GetMapping("/{cursoId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<AnuncioDTO>> getAnuncios(@PathVariable UUID cursoId) {
        return ResponseEntity.ok(anuncioService.getAnunciosByCurso(cursoId));
    }

    /** Solo profesor o admin pueden publicar */
    @PostMapping("/{cursoId}")
    @PreAuthorize("hasAnyAuthority('ROLE_PROFESOR', 'ROLE_ADMIN')")
    public ResponseEntity<AnuncioDTO> createAnuncio(
            @PathVariable UUID cursoId,
            @RequestBody Map<String, String> body,
            Authentication auth) {
        UUID autorId = getAuthenticatedUserId(auth);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(anuncioService.createAnuncio(cursoId, autorId, body));
    }

    /** Solo el autor o admin pueden eliminar */
    @DeleteMapping("/{cursoId}/{anuncioId}")
    @PreAuthorize("hasAnyAuthority('ROLE_PROFESOR', 'ROLE_ADMIN')")
    public ResponseEntity<Void> deleteAnuncio(
            @PathVariable UUID cursoId,
            @PathVariable UUID anuncioId,
            Authentication auth) {
        UUID autorId = getAuthenticatedUserId(auth);
        anuncioService.deleteAnuncio(anuncioId, autorId);
        return ResponseEntity.noContent().build();
    }

    /** Solo el autor o admin pueden editar */
    @PutMapping("/{cursoId}/{anuncioId}")
    @PreAuthorize("hasAnyAuthority('ROLE_PROFESOR', 'ROLE_ADMIN')")
    public ResponseEntity<AnuncioDTO> updateAnuncio(
            @PathVariable UUID cursoId,
            @PathVariable UUID anuncioId,
            @RequestBody Map<String, String> body,
            Authentication auth) {
        UUID autorId = getAuthenticatedUserId(auth);
        return ResponseEntity.ok(anuncioService.updateAnuncio(anuncioId, autorId, body));
    }

    private UUID getAuthenticatedUserId(Authentication auth) {
        User user = userRepository.findByEmailActive(auth.getName())
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
        return user.getId();
    }
}

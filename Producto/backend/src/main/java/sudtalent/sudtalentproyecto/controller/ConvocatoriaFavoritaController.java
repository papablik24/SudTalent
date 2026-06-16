package sudtalent.sudtalentproyecto.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import sudtalent.sudtalentproyecto.service.ConvocatoriaFavoritaService;

import java.util.List;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
public class ConvocatoriaFavoritaController {

    private final ConvocatoriaFavoritaService favoritaService;

    @GetMapping("/api/convocatorias/favoritas/me")
    @PreAuthorize("hasAuthority('ROLE_ALUMNO')")
    public ResponseEntity<List<UUID>> getMisFavoritas(Authentication authentication) {
        return ResponseEntity.ok(favoritaService.getMisFavoritasIds(authentication));
    }

    @PostMapping("/api/convocatorias/{id}/favorita")
    @PreAuthorize("hasAuthority('ROLE_ALUMNO')")
    public ResponseEntity<Void> marcarFavorita(@PathVariable UUID id, Authentication authentication) {
        favoritaService.marcarComoFavorita(id, authentication);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/api/convocatorias/{id}/favorita")
    @PreAuthorize("hasAuthority('ROLE_ALUMNO')")
    public ResponseEntity<Void> quitarFavorita(@PathVariable UUID id, Authentication authentication) {
        favoritaService.quitarDeFavoritas(id, authentication);
        return ResponseEntity.noContent().build();
    }
}

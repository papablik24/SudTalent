package sudtalent.sudtalentproyecto.service;

import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import sudtalent.sudtalentproyecto.model.Convocatoria;
import sudtalent.sudtalentproyecto.model.ConvocatoriaFavorita;
import sudtalent.sudtalentproyecto.model.User;
import sudtalent.sudtalentproyecto.repository.ConvocatoriaFavoritaRepository;
import sudtalent.sudtalentproyecto.repository.ConvocatoriaRepository;
import sudtalent.sudtalentproyecto.repository.UserRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class ConvocatoriaFavoritaService {

    private final ConvocatoriaFavoritaRepository favoritaRepository;
    private final ConvocatoriaRepository convocatoriaRepository;
    private final UserRepository userRepository;

    public List<UUID> getMisFavoritasIds(Authentication authentication) {
        UUID userId = resolveUserId(authentication);
        return favoritaRepository.findByUsuarioId(userId).stream()
                .map(fav -> fav.getConvocatoria().getId())
                .collect(Collectors.toList());
    }

    public void marcarComoFavorita(UUID convocatoriaId, Authentication authentication) {
        UUID userId = resolveUserId(authentication);

        Convocatoria conv = convocatoriaRepository.findById(convocatoriaId)
                .orElseThrow(() -> new RuntimeException("Convocatoria no encontrada"));

        if (conv.getDeletedAt() != null) {
            throw new RuntimeException("No se puede marcar como favorita una convocatoria eliminada");
        }

        if (!"ACTIVA".equals(conv.getEstado())) {
            throw new RuntimeException("Solo se pueden marcar como favoritas las convocatorias activas");
        }

        // Verificar si ya existe
        boolean yaExiste = favoritaRepository.findByUsuarioIdAndConvocatoriaId(userId, convocatoriaId).isPresent();
        if (yaExiste) {
            return; // Ya es favorita, no duplicar
        }

        User userRef = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));

        ConvocatoriaFavorita fav = ConvocatoriaFavorita.builder()
                .usuario(userRef)
                .convocatoria(conv)
                .fechaCreacion(LocalDateTime.now())
                .build();

        favoritaRepository.save(fav);
    }

    public void quitarDeFavoritas(UUID convocatoriaId, Authentication authentication) {
        UUID userId = resolveUserId(authentication);
        favoritaRepository.deleteByUsuarioIdAndConvocatoriaId(userId, convocatoriaId);
    }

    private UUID resolveUserId(Authentication authentication) {
        if (authentication == null || authentication.getName() == null) {
            throw new RuntimeException("No se pudo determinar el usuario: sin autenticación");
        }
        String email = authentication.getName();
        return userRepository.findByEmailActive(email)
                .map(User::getId)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado: " + email));
    }
}

package sudtalent.sudtalentproyecto.config;

import lombok.RequiredArgsConstructor;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import sudtalent.sudtalentproyecto.model.User;
import sudtalent.sudtalentproyecto.model.WhitelistNumber;
import sudtalent.sudtalentproyecto.repository.UserRepository;
import sudtalent.sudtalentproyecto.repository.WhitelistNumberRepository;

import java.util.List;
import java.util.Set;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.Collectors;

/**
 * Sincroniza automáticamente usuarios con whitelist_numbers al arrancar la app.
 *
 * Garantiza que todo usuario de rol ALUMNO que exista en la tabla users
 * también tenga una entrada en whitelist_numbers. Cubre el caso de usuarios
 * registrados antes de que se implementara la creación automática.
 */
@Component
@RequiredArgsConstructor
public class DataSyncStartup {

    private final UserRepository userRepository;
    private final WhitelistNumberRepository whitelistRepository;

    @EventListener(ApplicationReadyEvent.class)
    public void syncUsersToWhitelist() {
        System.out.println("🔄 [Startup] Sincronizando usuarios con whitelist...");

        // Obtener todos los emails ya presentes en whitelist (para evitar duplicados)
        Set<String> existingEmails = whitelistRepository.findAll().stream()
                .map(WhitelistNumber::getEmail)
                .filter(e -> e != null && !e.isBlank())
                .collect(Collectors.toSet());

        // Obtener todos los IDs de users ya vinculados en whitelist
        Set<Object> linkedUserIds = whitelistRepository.findAll().stream()
                .filter(w -> w.getUser() != null)
                .map(w -> w.getUser().getId())
                .collect(Collectors.toSet());

        // Buscar usuarios ALUMNO sin entrada en whitelist
        List<User> orphanUsers = userRepository.findAllActive().stream()
                .filter(u -> u.getRole() == User.Role.ALUMNO)
                .filter(u -> !linkedUserIds.contains(u.getId()))
                .filter(u -> u.getEmail() == null || !existingEmails.contains(u.getEmail()))
                .collect(java.util.stream.Collectors.toList());

        if (orphanUsers.isEmpty()) {
            System.out.println("✅ [Startup] Todos los usuarios ya están en whitelist.");
            return;
        }

        AtomicInteger count = new AtomicInteger(0);

        orphanUsers.forEach(user -> {
            try {
                // Generar phone placeholder único: últimos 12 dígitos del timestamp + offset
                String placeholderPhone = String.valueOf(
                        System.currentTimeMillis() + count.get()
                ).substring(1, 13);

                WhitelistNumber entry = WhitelistNumber.builder()
                        .phone(placeholderPhone)
                        .name(user.getName() != null ? user.getName() : "")
                        .email(user.getEmail())
                        .status(WhitelistNumber.Status.PENDIENTE)
                        .user(user)
                        .build();

                whitelistRepository.save(entry);
                count.incrementAndGet();

                System.out.println("  ✅ Whitelist creada para: "
                        + user.getName() + " <" + user.getEmail() + ">");
            } catch (Exception e) {
                System.err.println("  ❌ Error al crear whitelist para "
                        + user.getEmail() + ": " + e.getMessage());
            }
        });

        System.out.println("✅ [Startup] Sincronización completa: "
                + count.get() + " entrada(s) creada(s).");
    }
}

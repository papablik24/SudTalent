package sudtalent.sudtalentproyecto.config;

import lombok.RequiredArgsConstructor;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import sudtalent.sudtalentproyecto.model.User;
import sudtalent.sudtalentproyecto.model.WhitelistNumber;
import sudtalent.sudtalentproyecto.repository.AlumnoRepository;
import sudtalent.sudtalentproyecto.repository.UserRepository;
import sudtalent.sudtalentproyecto.repository.WhitelistNumberRepository;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.transaction.Transactional;
import java.util.List;
import java.util.Set;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.Collectors;

/**
 * Al arrancar la app:
 * 1. Sincroniza usuarios ALUMNO con whitelist_numbers
 * 2. Asegura que todo usuario ALUMNO tenga su fila en la tabla alumnos (herencia JOINED)
 *    — esto marca a los alumnos enrolados y permite que hereden todos los datos de users
 */
@Component
@RequiredArgsConstructor
public class DataSyncStartup {

    private final UserRepository userRepository;
    private final WhitelistNumberRepository whitelistRepository;
    private final AlumnoRepository alumnoRepository;

    @PersistenceContext
    private EntityManager entityManager;

    @EventListener(ApplicationReadyEvent.class)
    @Transactional
    public void syncOnStartup() {
        syncUsersToWhitelist();
        syncAlumnosTable();
    }

    // ── 1. Sincronizar whitelist ────────────────────────────────────────
    private void syncUsersToWhitelist() {
        System.out.println("🔄 [Startup] Sincronizando usuarios con whitelist...");

        Set<String> existingEmails = whitelistRepository.findAll().stream()
                .map(WhitelistNumber::getEmail)
                .filter(e -> e != null && !e.isBlank())
                .collect(Collectors.toSet());

        Set<Object> linkedUserIds = whitelistRepository.findAll().stream()
                .filter(w -> w.getUser() != null)
                .map(w -> w.getUser().getId())
                .collect(Collectors.toSet());

        List<User> orphanUsers = userRepository.findAllActive().stream()
                .filter(u -> u.getRole() == User.Role.ALUMNO)
                .filter(u -> !linkedUserIds.contains(u.getId()))
                .filter(u -> u.getEmail() == null || !existingEmails.contains(u.getEmail()))
                .collect(Collectors.toList());

        if (orphanUsers.isEmpty()) {
            System.out.println("✅ [Startup] Todos los usuarios ya están en whitelist.");
        } else {
            AtomicInteger count = new AtomicInteger(0);
            orphanUsers.forEach(user -> {
                try {
                    String placeholderPhone = String.valueOf(System.currentTimeMillis() + count.get()).substring(1, 13);
                    WhitelistNumber entry = WhitelistNumber.builder()
                            .phone(placeholderPhone)
                            .name(user.getName() != null ? user.getName() : "")
                            .email(user.getEmail())
                            .status(WhitelistNumber.Status.PENDIENTE)
                            .user(user)
                            .build();
                    whitelistRepository.save(entry);
                    count.incrementAndGet();
                    System.out.println("  ✅ Whitelist creada para: " + user.getName() + " <" + user.getEmail() + ">");
                } catch (Exception e) {
                    System.err.println("  ❌ Error whitelist para " + user.getEmail() + ": " + e.getMessage());
                }
            });
            System.out.println("✅ [Startup] Whitelist: " + count.get() + " entrada(s) creada(s).");
        }
    }

    // ── 2. Asegurar filas en tabla alumnos ─────────────────────────────
    private void syncAlumnosTable() {
        System.out.println("🔄 [Startup] Sincronizando tabla alumnos...");

        Set<Object> alumnoIds = alumnoRepository.findAll().stream()
                .map(a -> a.getId())
                .collect(Collectors.toSet());

        List<User> faltanEnAlumnos = userRepository.findAllActive().stream()
                .filter(u -> u.getRole() == User.Role.ALUMNO)
                .filter(u -> !alumnoIds.contains(u.getId()))
                .collect(Collectors.toList());

        if (faltanEnAlumnos.isEmpty()) {
            System.out.println("✅ [Startup] Tabla alumnos ya sincronizada.");
            return;
        }

        int count = 0;
        for (User user : faltanEnAlumnos) {
            try {
                int rows = entityManager.createNativeQuery(
                    "INSERT INTO alumnos (usuario_id, fecha_nacimiento, created_at, updated_at) " +
                    "VALUES (:id, NULL, NOW(), NOW()) ON CONFLICT (usuario_id) DO NOTHING"
                ).setParameter("id", user.getId()).executeUpdate();

                if (rows > 0) {
                    count++;
                    System.out.println("  ✅ Fila alumnos creada para: " + user.getName()
                            + " <" + user.getEmail() + ">");
                }
            } catch (Exception e) {
                System.err.println("  ❌ Error creando fila alumnos para "
                        + user.getEmail() + ": " + e.getMessage());
            }
        }
        System.out.println("✅ [Startup] Alumnos: " + count + " fila(s) creada(s).");
    }
}

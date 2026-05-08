package sudtalent.sudtalentproyecto.config;

import sudtalent.sudtalentproyecto.model.User;
import sudtalent.sudtalentproyecto.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
@RequiredArgsConstructor
public class DataSeeder {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Bean
    public CommandLineRunner seedAdminUser() {
        return args -> {
            String adminEmail = "admin@sudamericanvoices.com";
            var existingAdmin = userRepository.findByEmail(adminEmail);
            
            if (existingAdmin.isPresent()) {
                // Asegurar que el usuario existente tenga el rol ADMIN
                User admin = existingAdmin.get();
                if (admin.getRole() != User.Role.ADMIN) {
                    admin.setRole(User.Role.ADMIN);
                    userRepository.save(admin);
                    System.out.println("✅ Admin user role updated to ADMIN: " + adminEmail);
                } else {
                    System.out.println("ℹ️ Admin user already exists with ADMIN role: " + adminEmail);
                }
            } else {
                User admin = User.builder()
                        .name("Admin SudTalent")
                        .email(adminEmail)
                        .password(passwordEncoder.encode("admin123"))
                        .phone("000000000")
                        .role(User.Role.ADMIN)
                        .onboarded(true)
                        .status(User.ProfileStatus.APPROVED)
                        .build();
                userRepository.save(admin);
                System.out.println("✅ Admin user created: " + adminEmail);
            }
        };
    }
}

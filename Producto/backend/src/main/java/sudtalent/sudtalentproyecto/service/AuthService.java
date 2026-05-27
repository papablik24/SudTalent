package sudtalent.sudtalentproyecto.service;

import sudtalent.sudtalentproyecto.dto.AuthDTOs.*;
import sudtalent.sudtalentproyecto.model.User;
import sudtalent.sudtalentproyecto.model.WhitelistNumber;
import sudtalent.sudtalentproyecto.repository.UserRepository;
import sudtalent.sudtalentproyecto.repository.WhitelistNumberRepository;
import sudtalent.sudtalentproyecto.util.JwtUtils;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final WhitelistNumberRepository whitelistRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtUtils jwtUtils;
    private final UserDetailsService userDetailsService;

    @Value("${app.cookie.name}")
    private String cookieName;

    @Value("${app.cookie.secure}")
    private boolean cookieSecure;

    @Value("${app.cookie.http-only}")
    private boolean cookieHttpOnly;

    @Value("${app.cookie.max-age-seconds}")
    private int cookieMaxAge;

    // ========== EMAIL/PASSWORD AUTH ==========

    public AuthResponse login(LoginRequest request, HttpServletResponse response) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.email(), request.password())
        );

        var userDetails = userDetailsService.loadUserByUsername(request.email());
        String token = jwtUtils.generateToken(userDetails);
        setJwtCookie(response, token);

        var user = userRepository.findByEmailActive(request.email()).orElseThrow();
        autoFixOnboarding(user);
        return toResponse(user, token);
    }

    public AuthResponse register(RegisterRequest request, HttpServletResponse response) {
        if (userRepository.existsByEmail(request.email())) {
            throw new IllegalArgumentException("El email ya está registrado");
        }

        var user = User.builder()
                .name(request.name())
                .email(request.email())
                .password(passwordEncoder.encode(request.password()))
                .build();

        userRepository.save(user);

        // Crear entrada en whitelist con estado PENDIENTE para que aparezca en el panel admin
        createWhitelistEntryForUser(user);

        var userDetails = userDetailsService.loadUserByUsername(request.email());
        String token = jwtUtils.generateToken(userDetails);
        setJwtCookie(response, token);

        return toResponse(user, token);
    }

    // ========== PHONE-BASED AUTH ==========

    /**
     * Login/register by phone number.
     * If the phone exists, logs in. If not, creates a new user.
     * Uses a system-generated password derived from the phone (users don't know it).
     */
    public AuthResponse loginOrRegisterByPhone(PhoneRegisterRequest request, HttpServletResponse response) {
        String phone = normalizePhone(request.phone());
        
        // ✅ Verificar que el teléfono esté en whitelist
        var whitelistEntry = whitelistRepository.findByPhone(phone);
        if (whitelistEntry.isEmpty()) {
            throw new IllegalArgumentException("Número no autorizado por Sudamerican Voices.");
        }
        
        WhitelistNumber wl = whitelistEntry.get();
        if (wl.getStatus() == WhitelistNumber.Status.INACTIVO) {
            throw new IllegalArgumentException("Tu acceso ha sido desactivado. Contacta con soporte.");
        }
        
        var existingUser = userRepository.findByPhoneActive(phone);
        
        if (existingUser.isPresent()) {
            // Login existing user
            User user = existingUser.get();
            
            if (!user.isActive()) {
                throw new IllegalArgumentException("Tu cuenta ha sido desactivada. Contacta con soporte.");
            }
            
            // ✅ Vincular whitelist si no estaba vinculado
            if (wl.getUser() == null) {
                wl.setUser(user);
                whitelistRepository.save(wl);
            }
            
            autoFixOnboarding(user);
            
            var userDetails = userDetailsService.loadUserByUsername(user.getEmail());
            String token = jwtUtils.generateToken(userDetails);
            setJwtCookie(response, token);
            return toResponse(user, token);
        } else {
            // Register new user
            String syntheticEmail = phone + "@sudtalent.app";
            String syntheticPassword = "phone_" + phone + "_sud2026";

            if (userRepository.existsByEmail(syntheticEmail)) {
                throw new IllegalArgumentException("El teléfono ya está registrado");
            }

            var user = User.builder()
                    .name(request.name() != null ? request.name() : (wl.getName() != null ? wl.getName() : ""))
                    .email(syntheticEmail)
                    .password(passwordEncoder.encode(syntheticPassword))
                    .phone(phone)
                    .role(User.Role.ALUMNO)
                    .onboarded(false)
                    .build();

            user = userRepository.save(user);
            
            // Vincular whitelist con el nuevo usuario
            wl.setUser(user);
            if (wl.getStatus() == WhitelistNumber.Status.PENDIENTE) {
                wl.setStatus(WhitelistNumber.Status.ACTIVO);
            }
            whitelistRepository.save(wl);

            var userDetails = userDetailsService.loadUserByUsername(syntheticEmail);
            String token = jwtUtils.generateToken(userDetails);
            setJwtCookie(response, token);

            return toResponse(user, token);
        }
    }

    /**
     * Login admin by email/password (used from frontend admin flow).
     */
    public AuthResponse loginAdmin(LoginRequest request, HttpServletResponse response) {
        return login(request, response);
    }

    /**
     * Complete onboarding for authenticated user.
     */
    public AuthResponse onboard(UUID userId, OnboardRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));

        if (request.name() != null && !request.name().isEmpty()) {
            user.setName(request.name());
        }
        if (request.email() != null && !request.email().isEmpty()
                && !request.email().equals(user.getEmail())) {
            // Verificar unicidad del nuevo email
            if (userRepository.existsByEmail(request.email())) {
                throw new IllegalArgumentException("El email ya está registrado por otro usuario");
            }
            user.setEmail(request.email());
        }
        if (request.profileType() != null) {
            user.setProfileType(User.ProfileType.valueOf(request.profileType()));
        }
        if (request.specialties() != null) {
            user.setSpecialties(request.specialties());
        }
        if (request.bio() != null) {
            user.setBio(request.bio());
        }
        if (request.childName() != null) {
            user.setChildName(request.childName());
        }
        if (request.childAge() != null) {
            user.setChildAge(request.childAge());
        }
        if (request.age() != null) {
            user.setAge(request.age());
        }
        user.setOnboarded(true);
        user.setStatus(User.ProfileStatus.PENDING);
        
        userRepository.save(user);

        // Sincronizar whitelist si tiene entrada vinculada
        if (user.getPhone() != null) {
            var wlOpt = whitelistRepository.findByPhone(user.getPhone());
            if (wlOpt.isPresent()) {
                WhitelistNumber wl = wlOpt.get();
                if (wl.getUser() == null) {
                    wl.setUser(user);
                }
                if (wl.getStatus() == WhitelistNumber.Status.PENDIENTE) {
                    wl.setStatus(WhitelistNumber.Status.ACTIVO);
                }
                whitelistRepository.save(wl);
            } else {
                // Buscar si hay una entrada placeholder vinculada a este usuario (creada al registrarse)
                // y actualizarla con el teléfono real
                whitelistRepository.findAll().stream()
                        .filter(w -> user.equals(w.getUser()))
                        .findFirst()
                        .ifPresent(w -> {
                            w.setPhone(user.getPhone());
                            if (user.getName() != null) w.setName(user.getName());
                            if (user.getEmail() != null) w.setEmail(user.getEmail());
                            whitelistRepository.save(w);
                            System.out.println("✅ Whitelist placeholder actualizado con teléfono real: " + user.getPhone());
                        });
            }
        } else {
            // Sin teléfono: actualizar nombre/email en la entrada placeholder existente
            whitelistRepository.findAll().stream()
                    .filter(w -> user.equals(w.getUser()))
                    .findFirst()
                    .ifPresent(w -> {
                        if (user.getName() != null) w.setName(user.getName());
                        if (user.getEmail() != null) w.setEmail(user.getEmail());
                        whitelistRepository.save(w);
                    });
        }

        // Generate fresh token with updated info
        var userDetails = userDetailsService.loadUserByUsername(user.getEmail());
        String token = jwtUtils.generateToken(userDetails);

        return toResponse(user, token);
    }

    // ========== COMMON ==========

    public void logout(HttpServletResponse response) {
        Cookie cookie = new Cookie(cookieName, "");
        cookie.setHttpOnly(cookieHttpOnly);
        cookie.setSecure(cookieSecure);
        cookie.setPath("/");
        cookie.setMaxAge(0); // Expira inmediatamente
        response.addCookie(cookie);
    }

    private void setJwtCookie(HttpServletResponse response, String token) {
        Cookie cookie = new Cookie(cookieName, token);
        cookie.setHttpOnly(cookieHttpOnly);
        cookie.setSecure(cookieSecure);
        cookie.setPath("/");
        cookie.setMaxAge(cookieMaxAge);
        response.addCookie(cookie);
    }

    private AuthResponse toResponse(User user, String token) {
        UserData userData = new UserData(
                user.getId(),
                user.getName(),
                user.getEmail(),
                user.getPhone(),
                user.getRole().name(),
                user.isActive(),
                user.isOnboarded(),
                user.getProfileType() != null ? user.getProfileType().name() : null,
                user.getStatus() != null ? user.getStatus().name() : "PENDING"
        );
        return new AuthResponse(userData, !user.isOnboarded(), token);
    }

    /**
     * Auto-fix onboarded flag: if user already has basic data (name + phone),
     * mark them as onboarded so they skip the onboarding flow.
     */
    private void autoFixOnboarding(User user) {
        if (!user.isOnboarded()) {
            boolean hasName = user.getName() != null && !user.getName().isBlank();
            boolean hasPhone = user.getPhone() != null && !user.getPhone().isBlank();

            if (hasName && hasPhone && user.isActive()) {
                user.setOnboarded(true);
                if (user.getStatus() == null) {
                    user.setStatus(User.ProfileStatus.PENDING);
                }
                userRepository.save(user);
                System.out.println("✅ Auto-onboarded user: " + user.getEmail() + " (data already complete)");
            }
        }
    }

    private String normalizePhone(String phone) {
        // Remove + and spaces, keep only digits
        return phone.replaceAll("[^0-9]", "");
    }

    /**
     * Crea una entrada en whitelist_numbers para un usuario registrado por email/password.
     * Usa el email como identificador y deja el teléfono vacío (se completa en el onboarding).
     * Estado inicial: PENDIENTE — el admin debe aprobarlo.
     */
    private void createWhitelistEntryForUser(User user) {
        // Solo crear si no existe ya una entrada para este email
        boolean alreadyExists = whitelistRepository.findAll().stream()
                .anyMatch(w -> user.getEmail() != null && user.getEmail().equals(w.getEmail()));
        if (alreadyExists) return;

        // phone en whitelist es NOT NULL UNIQUE y solo acepta dígitos (8-15).
        // Usamos los últimos 12 dígitos del timestamp como placeholder único.
        // Se actualizará cuando el usuario complete su perfil con un teléfono real.
        String placeholderPhone = String.valueOf(System.currentTimeMillis()).substring(1, 13);

        WhitelistNumber entry = WhitelistNumber.builder()
                .phone(placeholderPhone)
                .name(user.getName() != null ? user.getName() : "")
                .email(user.getEmail())
                .status(WhitelistNumber.Status.PENDIENTE)
                .user(user)
                .build();

        whitelistRepository.save(entry);
        System.out.println("✅ Entrada whitelist creada para usuario email: " + user.getEmail());
    }
}

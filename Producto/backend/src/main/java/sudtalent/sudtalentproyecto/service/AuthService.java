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
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final WhitelistNumberRepository whitelistRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtUtils jwtUtils;
    private final UserDetailsService userDetailsService;

    @jakarta.persistence.PersistenceContext
    private jakarta.persistence.EntityManager entityManager;

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
        String email = request.email() != null ? request.email().trim().toLowerCase() : "";
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(email, request.password())
        );

        var userDetails = userDetailsService.loadUserByUsername(email);
        String token = jwtUtils.generateToken(userDetails);
        setJwtCookie(response, token);

        var user = userRepository.findByEmailActive(email).orElseThrow();
        ensureAlumnoRowExists(user);
        autoFixOnboarding(user);
        return toResponse(user, token);
    }

    public AuthResponse register(RegisterRequest request, HttpServletResponse response) {
        // 1. Normalizar teléfono
        String phone = normalizePhone(request.phone());
        if (phone.length() < 8 || phone.length() > 15) {
            throw new IllegalArgumentException("El número de teléfono no es válido.");
        }

        // 2. Verificar que el teléfono esté en whitelist
        var whitelistEntry = whitelistRepository.findByPhone(phone);
        if (whitelistEntry.isEmpty()) {
            throw new IllegalArgumentException(
                "Este número no está autorizado para registrarse en SudTalent. Contacta a la administración de Sudamerican Voices.");
        }

        WhitelistNumber wl = whitelistEntry.get();

        // 3. Verificar que no esté inactivo
        if (wl.getStatus() == WhitelistNumber.Status.INACTIVO) {
            throw new IllegalArgumentException(
                "Este número no está autorizado para registrarse en SudTalent. Contacta a la administración de Sudamerican Voices.");
        }

        // 4. Verificar si ya existe un usuario con este teléfono o email y comprobar si es un placeholder
        User user = null;
        var existingUserByPhone = userRepository.findByPhoneActive(phone);
        if (existingUserByPhone.isPresent()) {
            User u = existingUserByPhone.get();
            if (isPlaceholderUser(u, phone)) {
                user = u;
            } else {
                throw new IllegalArgumentException("Este número ya tiene una cuenta registrada. Inicia sesión.");
            }
        }

        var existingUserByEmail = userRepository.findByEmailActive(request.email());
        if (existingUserByEmail.isPresent()) {
            User u = existingUserByEmail.get();
            if (isPlaceholderUser(u, phone)) {
                if (user == null) {
                    user = u;
                } else if (!user.getId().equals(u.getId())) {
                    throw new IllegalArgumentException("El correo electrónico ya está registrado.");
                }
            } else {
                throw new IllegalArgumentException("El correo electrónico ya está registrado.");
            }
        }

        // 6. Usar el nombre de la whitelist si el del request no es confiable
        String finalName = (request.name() != null && !request.name().isBlank())
            ? request.name().trim()
            : (wl.getName() != null && !wl.getName().isBlank() ? wl.getName() : "");

        // 7. Crear o actualizar usuario
        if (user != null) {
            user.setName(finalName);
            user.setEmail(request.email());
            user.setPassword(passwordEncoder.encode(request.password()));
            user.setPhone(phone);
            user.setOnboarded(false);
            if (wl.getRole() != null) {
                user.setRole(wl.getRole());
            }
            user = userRepository.save(user);
        } else {
            User.Role registeredRole = wl.getRole() != null ? wl.getRole() : User.Role.ALUMNO;
            user = User.builder()
                    .name(finalName)
                    .email(request.email())
                    .password(passwordEncoder.encode(request.password()))
                    .phone(phone)
                    .role(registeredRole)
                    .onboarded(false)
                    .build();
            user = userRepository.save(user);
        }
        ensureAlumnoRowExists(user);

        // 8. Vincular la entrada whitelist con el nuevo usuario
        wl.setUser(user);
        wl.setName(finalName);
        wl.setEmail(request.email());
        if (wl.getStatus() == WhitelistNumber.Status.PENDIENTE) {
            wl.setStatus(WhitelistNumber.Status.ACTIVO);
        }
        whitelistRepository.save(wl);

        System.out.println("✅ Usuario registrado y vinculado a whitelist: " + phone);

        var userDetails = userDetailsService.loadUserByUsername(request.email());
        String token = jwtUtils.generateToken(userDetails);
        setJwtCookie(response, token);

        return toResponse(user, token);
    }

    private boolean isPlaceholderUser(User u, String requestPhone) {
        if (u.isOnboarded()) {
            return false;
        }
        if (u.getPassword() == null) {
            return true;
        }
        
        // Probar formato de teléfono almacenado en BD
        if (u.getPhone() != null) {
            String dbPhone = u.getPhone();
            if (passwordEncoder.matches("whitelist_" + dbPhone + "_sud2026", u.getPassword())) {
                return true;
            }
            String dbNormalized = normalizePhone(dbPhone);
            if (passwordEncoder.matches("whitelist_" + dbNormalized + "_sud2026", u.getPassword())) {
                return true;
            }
        }
        
        // Probar formato del teléfono de la petición
        if (requestPhone != null) {
            if (passwordEncoder.matches("whitelist_" + requestPhone + "_sud2026", u.getPassword())) {
                return true;
            }
            String reqNormalized = normalizePhone(requestPhone);
            if (passwordEncoder.matches("whitelist_" + reqNormalized + "_sud2026", u.getPassword())) {
                return true;
            }
        }
        
        return false;
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
            
            ensureAlumnoRowExists(user);
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
            ensureAlumnoRowExists(user);
            
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
        if (request.phone() != null && !request.phone().isBlank()) {
            String phoneDigits = request.phone().replaceAll("[^0-9]", "");
            if (phoneDigits.length() >= 8 && phoneDigits.length() <= 15) {
                user.setPhone(phoneDigits);
            }
        }
        user.setOnboarded(true);
        user.setStatus(User.ProfileStatus.PENDING);
        
        userRepository.save(user);
        ensureAlumnoRowExists(user);

        // Sincronizar whitelist si tiene entrada vinculada
        if (user.getPhone() != null) {
            var wlOpt = whitelistRepository.findByPhone(user.getPhone());
            if (wlOpt.isPresent()) {
                WhitelistNumber wl = wlOpt.get();
                if (wl.getUser() == null) {
                    wl.setUser(user);
                }
                if (user.getName() != null && !user.getName().isBlank()) {
                    wl.setName(user.getName());
                }
                if (user.getEmail() != null && !user.getEmail().isBlank()) {
                    wl.setEmail(user.getEmail());
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
                user.getStatus() != null ? user.getStatus().name() : "PENDING",
                user.getProfileImageUrl()
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

    /**
     * Asegura la fila en la tabla 'alumnos' para los usuarios que posean el rol de alumno.
     * Esto evita fallos de integridad referencial.
     */
    @Transactional
    public void ensureAlumnoRowExists(User user) {
        if (user == null || user.getRole() != User.Role.ALUMNO) {
            return;
        }
        try {
            entityManager.createNativeQuery(
                "INSERT INTO alumnos (usuario_id, fecha_nacimiento, created_at, updated_at) " +
                "VALUES (:id, NULL, NOW(), NOW()) ON CONFLICT (usuario_id) DO NOTHING"
            ).setParameter("id", user.getId()).executeUpdate();
            entityManager.flush();
            System.out.println("✅ Asegurada fila en alumnos para el usuario: " + user.getId());
        } catch (Exception e) {
            System.err.println("Error asegurando fila en alumnos: " + e.getMessage());
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

package sudtalent.sudtalentproyecto.service;

import sudtalent.sudtalentproyecto.dto.AuthDTOs.*;
import sudtalent.sudtalentproyecto.model.User;
import sudtalent.sudtalentproyecto.repository.UserRepository;
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

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
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

        var user = userRepository.findByEmail(request.email()).orElseThrow();
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
        
        var existingUser = userRepository.findByPhone(phone);
        
        if (existingUser.isPresent()) {
            // Login existing user
            User user = existingUser.get();
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
                    .name(request.name() != null ? request.name() : "")
                    .email(syntheticEmail)
                    .password(passwordEncoder.encode(syntheticPassword))
                    .phone(phone)
                    .role(User.Role.ALUMNO)
                    .onboarded(false)
                    .build();

            userRepository.save(user);

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
    public AuthResponse onboard(Long userId, OnboardRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));

        if (request.name() != null && !request.name().isEmpty()) {
            user.setName(request.name());
        }
        if (request.email() != null && !request.email().isEmpty() 
                && !request.email().equals(user.getEmail())) {
            // Only update email if it's a real email (not synthetic)
            if (!user.getEmail().endsWith("@sudtalent.app")) {
                // Check uniqueness
                if (userRepository.existsByEmail(request.email())) {
                    throw new IllegalArgumentException("El email ya está registrado");
                }
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
        return new AuthResponse(
                user.getId(),
                user.getName(),
                user.getEmail(),
                user.getPhone(),
                user.getRole().name(),
                user.isOnboarded(),
                user.getProfileType() != null ? user.getProfileType().name() : null,
                token
        );
    }

    private String normalizePhone(String phone) {
        // Remove + and spaces, keep only digits
        return phone.replaceAll("[^0-9]", "");
    }
}

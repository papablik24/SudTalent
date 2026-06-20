package sudtalent.sudtalentproyecto.controller;

import sudtalent.sudtalentproyecto.dto.AuthDTOs.*;
import sudtalent.sudtalentproyecto.model.User;
import sudtalent.sudtalentproyecto.repository.UserRepository;
import sudtalent.sudtalentproyecto.service.AuthService;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final UserRepository userRepository;

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest request,
                                               HttpServletResponse response) {
        try {
            return ResponseEntity.ok(authService.login(request, response));
        } catch (BadCredentialsException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(Map.of("message", "Correo o contraseña incorrectos."));
        } catch (DisabledException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(Map.of("message", "Tu cuenta ha sido desactivada. Contacta con soporte."));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("message", "Error al iniciar sesión: " + e.getMessage()));
        }
    }

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request,
                                                  HttpServletResponse response) {
        return ResponseEntity.ok(authService.register(request, response));
    }

    // Phone-based login/register (for the mobile flow)
    @PostMapping("/phone")
    public ResponseEntity<?> phoneAuth(@Valid @RequestBody PhoneRegisterRequest request,
                                                   HttpServletResponse response) {
        try {
            return ResponseEntity.ok(authService.loginOrRegisterByPhone(request, response));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(Map.of("message", e.getMessage()));
        } catch (DisabledException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(Map.of("message", "Tu cuenta ha sido desactivada. Contacta con soporte."));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("message", "Error al iniciar sesión: " + e.getMessage()));
        }
    }

    // Complete onboarding for authenticated user
    @PostMapping("/onboard")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<AuthResponse> onboard(@AuthenticationPrincipal UserDetails userDetails,
                                                 @Valid @RequestBody OnboardRequest request) {
        User user = userRepository.findByEmail(userDetails.getUsername()).orElseThrow();
        return ResponseEntity.ok(authService.onboard(user.getId(), request));
    }

    @PostMapping("/logout")
    public ResponseEntity<MessageResponse> logout(HttpServletResponse response) {
        authService.logout(response);
        return ResponseEntity.ok(new MessageResponse("Sesión cerrada correctamente"));
    }

    // Endpoint to verify token and get current user info
    @GetMapping("/me")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<AuthResponse> me(@AuthenticationPrincipal UserDetails userDetails) {
        User user = userRepository.findByEmail(userDetails.getUsername()).orElseThrow();
        // AGREGAR ESTOS LOGS
        System.out.println("🔍 DEBUG /me endpoint:");
        System.out.println("  Email: " + user.getEmail());
        System.out.println("  Role en BD: " + user.getRole());
        System.out.println("  Authorities en UserDetails: " + userDetails.getAuthorities());
        System.out.println("  Is Admin? " + userDetails.getAuthorities().stream()
            .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN")));
    
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
        return ResponseEntity.ok(new AuthResponse(userData, !user.isOnboarded(), null));
    }
}

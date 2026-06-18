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
import org.springframework.security.core.Authentication;
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
    public ResponseEntity<?> register(@Valid @RequestBody RegisterRequest request,
                                      HttpServletResponse response) {
        try {
            return ResponseEntity.ok(authService.register(request, response));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("message", "Error al crear la cuenta: " + e.getMessage()));
        }
    }

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

    @PostMapping("/onboard")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<AuthResponse> onboard(Authentication authentication,
                                                 @Valid @RequestBody OnboardRequest request) {
        String email = authentication.getName();
        User user = userRepository.findByEmailActive(email).orElseThrow();
        return ResponseEntity.ok(authService.onboard(user.getId(), request));
    }

    @PostMapping("/logout")
    public ResponseEntity<MessageResponse> logout(HttpServletResponse response) {
        authService.logout(response);
        return ResponseEntity.ok(new MessageResponse("Sesión cerrada correctamente"));
    }

    @GetMapping("/me")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<AuthResponse> me(Authentication authentication) {
        User user = userRepository.findByEmailActive(authentication.getName()).orElseThrow();
        
        UserData userData = new UserData(
                user.getId(),  // ← Ahora es UUID
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
        return ResponseEntity.ok(new AuthResponse(userData, !user.isOnboarded(), null));
    }
}
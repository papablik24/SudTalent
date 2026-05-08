package sudtalent.sudtalentproyecto.controller;

import sudtalent.sudtalentproyecto.dto.AuthDTOs.*;
import sudtalent.sudtalentproyecto.model.User;
import sudtalent.sudtalentproyecto.repository.UserRepository;
import sudtalent.sudtalentproyecto.service.AuthService;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final UserRepository userRepository;

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request,
                                               HttpServletResponse response) {
        return ResponseEntity.ok(authService.login(request, response));
    }

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request,
                                                  HttpServletResponse response) {
        return ResponseEntity.ok(authService.register(request, response));
    }

    // Phone-based login/register (for the mobile flow)
    @PostMapping("/phone")
    public ResponseEntity<AuthResponse> phoneAuth(@Valid @RequestBody PhoneRegisterRequest request,
                                                   HttpServletResponse response) {
        return ResponseEntity.ok(authService.loginOrRegisterByPhone(request, response));
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
        System.out.println("🔍 DEBUG /me endpoint:");
        System.out.println("  Email: " + user.getEmail());
        System.out.println("  Role en BD: " + user.getRole());
        System.out.println("  Authorities en UserDetails: " + userDetails.getAuthorities());
        return ResponseEntity.ok(new AuthResponse(
                user.getId(),
                user.getName(),
                user.getEmail(),
                user.getPhone(),
                user.getRole().name(),
                user.isOnboarded(),
                user.getProfileType() != null ? user.getProfileType().name() : null,
                null // No need to return token on /me
        ));
    }
}

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

    @PostMapping("/logout")
    public ResponseEntity<MessageResponse> logout(HttpServletResponse response) {
        authService.logout(response);
        return ResponseEntity.ok(new MessageResponse("Sesión cerrada correctamente"));
    }

    // Endpoint para que el frontend verifique si el token es válido al cargar
    @GetMapping("/me")
    public ResponseEntity<AuthResponse> me(@AuthenticationPrincipal UserDetails userDetails) {
        User user = userRepository.findByEmail(userDetails.getUsername()).orElseThrow();
        return ResponseEntity.ok(new AuthResponse(
                user.getId(),
                user.getName(),
                user.getEmail(),
                user.getRole().name()
        ));
    }
}

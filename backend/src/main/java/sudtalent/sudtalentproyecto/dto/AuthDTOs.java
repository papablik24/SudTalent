package sudtalent.sudtalentproyecto.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public class AuthDTOs {

    public record LoginRequest(
            @Email @NotBlank String email,
            @NotBlank String password
    ) {}

    public record RegisterRequest(
            @NotBlank String name,
            @Email @NotBlank String email,
            @NotBlank String password
    ) {}

    public record AuthResponse(
            Long id,
            String name,
            String email,
            String role
    ) {}

    public record MessageResponse(String message) {}
}

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

    // Phone-based authentication for the mobile flow
    public record PhoneLoginRequest(
            @NotBlank String phone
    ) {}

    public record PhoneRegisterRequest(
            @NotBlank String phone,
            String name,
            String email
    ) {}

    public record OnboardRequest(
            String name,
            String email,
            String profileType,
            String childName,
            Integer childAge,
            Integer age,
            String specialties,
            String bio
    ) {}

    public record AuthResponse(
            Long id,
            String name,
            String email,
            String phone,
            String role,
            boolean onboarded,
            String profileType,
            String token
    ) {}

    public record MessageResponse(String message) {}
}

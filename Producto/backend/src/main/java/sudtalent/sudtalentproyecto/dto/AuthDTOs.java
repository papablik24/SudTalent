package sudtalent.sudtalentproyecto.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.UUID;

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
            String bio,
            String phone
    ) {}

    // ✅ CAMBIO: UUID en lugar de Long
    public record UserData(
            UUID id,  // ← CAMBIO
            String name,
            String email,
            String phone,
            String role,
            boolean active,
            boolean onboarded,
            String profileType,
            String status,
            String profileImageUrl
    ) {}

    public record AuthResponse(
            @JsonProperty("user")
            UserData user,
            @JsonProperty("requiresOnboarding")
            boolean requiresOnboarding,
            @JsonProperty("token")
            String token
    ) {}

    public record MessageResponse(String message) {}
}
package sudtalent.sudtalentproyecto.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public class PasswordResetDTOs {

    public record ForgotPasswordRequest(
        @Email @NotBlank String email
    ) {}

    public record ResetPasswordRequest(
        @Email @NotBlank String email,
        @NotBlank String otp,
        @NotBlank String newPassword
    ) {}
}

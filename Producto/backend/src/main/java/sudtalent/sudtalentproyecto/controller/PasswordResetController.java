package sudtalent.sudtalentproyecto.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import sudtalent.sudtalentproyecto.dto.AuthDTOs.MessageResponse;
import sudtalent.sudtalentproyecto.dto.PasswordResetDTOs.ForgotPasswordRequest;
import sudtalent.sudtalentproyecto.dto.PasswordResetDTOs.ResetPasswordRequest;
import sudtalent.sudtalentproyecto.service.PasswordResetService;

/**
 * Controlador REST para el flujo de recuperación de contraseña mediante OTP.
 * Requirements: 1.1, 1.4, 3.1, 3.2, 5.3
 */
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class PasswordResetController {

    private final PasswordResetService passwordResetService;

    /**
     * POST /api/auth/forgot-password
     *
     * Solicita el envío de un OTP al correo indicado.
     * Siempre responde con HTTP 200 y un mensaje genérico para evitar la enumeración
     * de usuarios registrados (anti-enumeración, Req 1.1, 1.4).
     *
     * @param request cuerpo con el email del solicitante (validado con @Email @NotBlank)
     * @return mensaje genérico independiente de si el email existe o no
     */
    @PostMapping("/forgot-password")
    public ResponseEntity<MessageResponse> forgotPassword(
            @Valid @RequestBody ForgotPasswordRequest request) {
        passwordResetService.requestOtp(request.email());
        return ResponseEntity.ok(
                new MessageResponse("Si tu correo está registrado, recibirás un código en breve."));
    }

    /**
     * POST /api/auth/reset-password
     *
     * Verifica el OTP y actualiza la contraseña del usuario.
     * Las excepciones de dominio son capturadas por GlobalExceptionHandler
     * y mapeadas a sus códigos HTTP correspondientes (Req 3.2).
     *
     * @param request cuerpo con email, otp y la nueva contraseña (validado con @Valid)
     * @return mensaje de confirmación si el reset fue exitoso
     */
    @PostMapping("/reset-password")
    public ResponseEntity<MessageResponse> resetPassword(
            @Valid @RequestBody ResetPasswordRequest request) {
        passwordResetService.verifyOtpAndResetPassword(
                request.email(), request.otp(), request.newPassword());
        return ResponseEntity.ok(new MessageResponse("Contraseña actualizada exitosamente."));
    }
}

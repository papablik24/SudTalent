package sudtalent.sudtalentproyecto.config;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import sudtalent.sudtalentproyecto.exception.EmailSendException;
import sudtalent.sudtalentproyecto.exception.CooldownException;
import sudtalent.sudtalentproyecto.exception.OtpBlockedException;
import sudtalent.sudtalentproyecto.exception.OtpExpiredException;
import sudtalent.sudtalentproyecto.exception.OtpMismatchException;
import sudtalent.sudtalentproyecto.exception.OtpNotFoundException;
import sudtalent.sudtalentproyecto.exception.OtpUsedException;
import sudtalent.sudtalentproyecto.exception.PasswordTooShortException;
import sudtalent.sudtalentproyecto.exception.RateLimitException;

import java.util.Map;
import java.util.stream.Collectors;

@RestControllerAdvice
public class GlobalExceptionHandler {

    /** Errores de validación (@Valid) */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidation(MethodArgumentNotValidException ex) {
        String detail = ex.getBindingResult().getFieldErrors().stream()
                .map(e -> e.getField() + ": " + e.getDefaultMessage())
                .collect(Collectors.joining(", "));
        return ResponseEntity.badRequest()
                .body(Map.of("error", "Datos inválidos", "detail", detail));
    }

    /** Violaciones de constraint en la BD */
    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<Map<String, Object>> handleDataIntegrity(DataIntegrityViolationException ex) {
        String msg = ex.getMostSpecificCause().getMessage();
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(Map.of("error", "Error de integridad en la base de datos", "detail", msg));
    }

    // ─── Password Reset — excepciones de dominio ──────────────────────────────

    /** Rate limit superado → 429 */
    @ExceptionHandler(RateLimitException.class)
    public ResponseEntity<Map<String, String>> handleRateLimit(RateLimitException ex) {
        return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                .body(Map.of("message", ex.getMessage()));
    }

    /** Cooldown activo (3 min entre solicitudes) → 429 con segundos restantes */
    @ExceptionHandler(CooldownException.class)
    public ResponseEntity<Map<String, Object>> handleCooldown(CooldownException ex) {
        return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                .body(Map.of(
                        "message", ex.getMessage(),
                        "secondsRemaining", ex.getSecondsRemaining(),
                        "cooldown", true
                ));
    }

    /** OTP expirado → 400 */
    @ExceptionHandler(OtpExpiredException.class)
    public ResponseEntity<Map<String, String>> handleOtpExpired(OtpExpiredException ex) {
        return ResponseEntity.badRequest()
                .body(Map.of("message", ex.getMessage()));
    }

    /** OTP ya usado → 400 */
    @ExceptionHandler(OtpUsedException.class)
    public ResponseEntity<Map<String, String>> handleOtpUsed(OtpUsedException ex) {
        return ResponseEntity.badRequest()
                .body(Map.of("message", ex.getMessage()));
    }

    /** OTP incorrecto → 400 */
    @ExceptionHandler(OtpMismatchException.class)
    public ResponseEntity<Map<String, String>> handleOtpMismatch(OtpMismatchException ex) {
        return ResponseEntity.badRequest()
                .body(Map.of("message", ex.getMessage()));
    }

    /** OTP bloqueado por demasiados intentos fallidos → 400 */
    @ExceptionHandler(OtpBlockedException.class)
    public ResponseEntity<Map<String, String>> handleOtpBlocked(OtpBlockedException ex) {
        return ResponseEntity.badRequest()
                .body(Map.of("message", ex.getMessage()));
    }

    /** No existe OTP activo para el email → 400 */
    @ExceptionHandler(OtpNotFoundException.class)
    public ResponseEntity<Map<String, String>> handleOtpNotFound(OtpNotFoundException ex) {
        return ResponseEntity.badRequest()
                .body(Map.of("message", ex.getMessage()));
    }

    /** Contraseña demasiado corta → 400 */
    @ExceptionHandler(PasswordTooShortException.class)
    public ResponseEntity<Map<String, String>> handlePasswordTooShort(PasswordTooShortException ex) {
        return ResponseEntity.badRequest()
                .body(Map.of("message", ex.getMessage()));
    }

    /** Error al enviar correo electrónico → 500 */
    @ExceptionHandler(EmailSendException.class)
    public ResponseEntity<Map<String, String>> handleEmailSend(EmailSendException ex) {
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("message", ex.getMessage()));
    }

    // ─────────────────────────────────────────────────────────────────────────

    /** Recursos no encontrados */
    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<Map<String, Object>> handleRuntime(RuntimeException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(Map.of("error", ex.getMessage()));
    }

    /** Acceso denegado — devuelve 403 con mensaje claro */
    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<Map<String, Object>> handleAccessDenied(AccessDeniedException ex) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(Map.of("error", "Acceso denegado: no tienes permisos para esta acción"));
    }
}

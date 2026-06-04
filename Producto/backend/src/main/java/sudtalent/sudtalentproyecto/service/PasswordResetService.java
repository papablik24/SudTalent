package sudtalent.sudtalentproyecto.service;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import sudtalent.sudtalentproyecto.exception.EmailSendException;
import sudtalent.sudtalentproyecto.exception.CooldownException;
import sudtalent.sudtalentproyecto.exception.OtpBlockedException;
import sudtalent.sudtalentproyecto.exception.OtpExpiredException;
import sudtalent.sudtalentproyecto.exception.OtpMismatchException;
import sudtalent.sudtalentproyecto.exception.OtpNotFoundException;
import sudtalent.sudtalentproyecto.exception.PasswordTooShortException;
import sudtalent.sudtalentproyecto.exception.RateLimitException;
import sudtalent.sudtalentproyecto.model.PasswordResetToken;
import sudtalent.sudtalentproyecto.repository.PasswordResetTokenRepository;
import sudtalent.sudtalentproyecto.repository.UserRepository;

@Slf4j
@Service
@RequiredArgsConstructor
public class PasswordResetService {

    private final PasswordResetTokenRepository tokenRepository;
    private final UserRepository userRepository;
    private final EmailService emailService;
    private final PasswordEncoder passwordEncoder;

    private final SecureRandom secureRandom = new SecureRandom();

    /**
     * Solicita un OTP para el email dado.
     * Siempre retorna sin revelar si el email existe o no (anti-enumeración).
     * Aplica cooldown de 3 minutos: si ya existe un token activo enviado hace menos de 3 min,
     * lanza CooldownException con los segundos restantes.
     * Requirements: 1.1, 1.2, 1.4, 1.5, 1.7, 2.1, 2.2, 2.3, 5.2
     */
    @Transactional
    public void requestOtp(String email) {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime windowStart = now.minusMinutes(15);

        // 1. Cooldown de 3 minutos: si hay un token activo creado hace menos de 3 min, rechazar
        tokenRepository.findTopByEmailAndUsedFalseOrderByCreatedAtDesc(email)
                .ifPresent(latest -> {
                    long secondsSinceCreation = ChronoUnit.SECONDS.between(latest.getCreatedAt(), now);
                    long cooldownSeconds = 180; // 3 minutos
                    if (secondsSinceCreation < cooldownSeconds) {
                        long remaining = cooldownSeconds - secondsSinceCreation;
                        throw new CooldownException((int) remaining);
                    }
                });

        // 2. Contar solicitudes recientes para rate limiting (Req 2.1, 2.2, 2.3)
        long recentCount = tokenRepository.countByEmailAndCreatedAtAfter(email, windowStart);

        if (recentCount >= 3) {
            // 3. Calcular minutos restantes hasta que la solicitud más antigua salga de la ventana
            int minutosRestantes = tokenRepository
                    .findTopByEmailAndCreatedAtAfterOrderByCreatedAtAsc(email, windowStart)
                    .map(oldest -> {
                        long minutosTranscurridos = ChronoUnit.MINUTES.between(oldest.getCreatedAt(), now);
                        long restantes = 15 - minutosTranscurridos;
                        long segundosTranscurridos = ChronoUnit.SECONDS.between(oldest.getCreatedAt(), now);
                        boolean haySegundosExtra = (segundosTranscurridos % 60) > 0;
                        return (int) (restantes + (haySegundosExtra ? 1 : 0));
                    })
                    .orElse(1);

            throw new RateLimitException(Math.max(minutosRestantes, 1));
        }

        // 4. Buscar usuario activo; si no existe, retornar silenciosamente (Req 1.4)
        var userOpt = userRepository.findByEmailActive(email);
        if (userOpt.isEmpty()) {
            return;
        }

        // 5. Invalidar todos los tokens activos existentes para ese email (Req 1.5)
        tokenRepository.invalidateAllActiveByEmail(email);

        // 6. Generar OTP con SecureRandom: rango [100000, 999999] (Req 1.2, 5.2)
        int otpValue = 100000 + secureRandom.nextInt(900000);
        String otp = String.valueOf(otpValue);

        // 7. Persistir el nuevo PasswordResetToken con expiresAt = now + 15 min (Req 1.2)
        PasswordResetToken token = PasswordResetToken.builder()
                .email(email)
                .otp(otp)
                .expiresAt(now.plusMinutes(15))
                .build();
        token = tokenRepository.save(token);

        // 8. Enviar el correo; si falla: eliminar el token, log, lanzar excepción (Req 1.7, 6.4)
        try {
            emailService.sendOtpEmail(email, otp);
        } catch (Exception e) {
            tokenRepository.delete(token);
            log.error("Error al enviar correo OTP a {}: {}", email, e.getMessage());
            throw new EmailSendException();
        }
    }

    /**
     * Verifica el OTP y actualiza la contraseña del usuario.
     * Requirements: 3.1, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 5.4
     */
    @Transactional
    public void verifyOtpAndResetPassword(String email, String otp, String newPassword) {
        // 1. Validar longitud mínima de contraseña (Req 3.7, 3.8)
        if (newPassword == null || newPassword.length() < 6) {
            throw new PasswordTooShortException();
        }

        LocalDateTime now = LocalDateTime.now();

        // 2. Buscar el token más reciente no usado para el email
        PasswordResetToken token = tokenRepository
                .findTopByEmailAndUsedFalseOrderByCreatedAtDesc(email)
                .orElseThrow(OtpNotFoundException::new);

        // 3. Verificar expiración (Req 3.5)
        if (token.getExpiresAt().isBefore(now)) {
            throw new OtpExpiredException();
        }

        // 4. Verificar coincidencia del OTP (Req 3.3, 3.4)
        if (!token.getOtp().equals(otp)) {
            token.setFailedAttempts(token.getFailedAttempts() + 1);
            if (token.getFailedAttempts() >= 3) {
                token.setUsed(true);
                tokenRepository.save(token);
                throw new OtpBlockedException();
            }
            tokenRepository.save(token);
            throw new OtpMismatchException();
        }

        // 5. OTP válido: actualizar contraseña del usuario (Req 3.1, 5.4)
        var user = userRepository.findByEmailActive(email)
                .orElseThrow(() -> new OtpNotFoundException());
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        // 6. Marcar token como usado (Req 3.1)
        token.setUsed(true);
        tokenRepository.save(token);
    }

    /**
     * Tarea programada: elimina tokens con expiresAt anterior a 24 horas.
     * Se ejecuta cada hora.
     * Requirements: 5.5
     */
    @Scheduled(fixedRate = 3600000)
    @Transactional
    public void cleanupExpiredTokens() {
        tokenRepository.deleteExpiredBefore(LocalDateTime.now().minusHours(24));
        log.debug("Limpieza de tokens de recuperación completada.");
    }
}

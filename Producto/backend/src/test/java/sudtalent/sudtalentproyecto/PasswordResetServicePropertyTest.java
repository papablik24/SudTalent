package sudtalent.sudtalentproyecto;

import net.jqwik.api.*;
import net.jqwik.api.constraints.StringLength;
import net.jqwik.api.lifecycle.BeforeProperty;

import org.mockito.ArgumentCaptor;
import org.mockito.InOrder;
import org.mockito.Mockito;
import org.springframework.security.crypto.password.PasswordEncoder;

import sudtalent.sudtalentproyecto.exception.OtpBlockedException;
import sudtalent.sudtalentproyecto.exception.OtpMismatchException;
import sudtalent.sudtalentproyecto.exception.PasswordTooShortException;
import sudtalent.sudtalentproyecto.exception.RateLimitException;
import sudtalent.sudtalentproyecto.model.PasswordResetToken;
import sudtalent.sudtalentproyecto.model.User;
import sudtalent.sudtalentproyecto.repository.PasswordResetTokenRepository;
import sudtalent.sudtalentproyecto.repository.UserRepository;
import sudtalent.sudtalentproyecto.service.EmailService;
import sudtalent.sudtalentproyecto.service.PasswordResetService;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Property-based tests for PasswordResetService.requestOtp().
 *
 * Properties covered:
 *   P2 — OTP siempre de exactamente 6 dígitos          (Validates: Requirements 1.2, 5.2)
 *   P3 — Expiración siempre a 15 minutos               (Validates: Requirements 1.2)
 *   P4 — Invalidación del OTP anterior                 (Validates: Requirements 1.5)
 *   P5 — Rate limiting — bloqueo tras 3 solicitudes    (Validates: Requirements 2.1, 2.3)
 *   P6 — Ventana deslizante excluye solicitudes antiguas (Validates: Requirements 2.4)
 */
class PasswordResetServicePropertyTest {

    // Mocks — initialized fresh before each @Property run via @BeforeProperty
    private PasswordResetTokenRepository tokenRepository;
    private UserRepository userRepository;
    private EmailService emailService;
    private PasswordEncoder passwordEncoder;
    private PasswordResetService service;

    @BeforeProperty
    void initMocks() {
        tokenRepository = Mockito.mock(PasswordResetTokenRepository.class);
        userRepository  = Mockito.mock(UserRepository.class);
        emailService    = Mockito.mock(EmailService.class);
        passwordEncoder = Mockito.mock(PasswordEncoder.class);
        service = new PasswordResetService(tokenRepository, userRepository, emailService, passwordEncoder);
    }

    // -------------------------------------------------------------------------
    // Helper: build a minimal active User
    // -------------------------------------------------------------------------
    private User activeUser(String email) {
        return User.builder()
                .email(email)
                .password("encoded-pass")
                .build();
    }

    // =========================================================================
    // Property 2: OTP siempre de exactamente 6 dígitos
    // Validates: Requirements 1.2, 5.2
    // =========================================================================
    /**
     * For any valid email (no rate-limit, active user), the OTP captured in the
     * saved PasswordResetToken must be a 6-digit string in [100000, 999999].
     *
     * **Validates: Requirements 1.2, 5.2**
     */
    @Property(tries = 100)
    @Label("P2 — OTP siempre de exactamente 6 dígitos")
    void p2_otpAlwaysExactlySixDigits(@ForAll("validEmails") String email) {
        // Fresh mocks per try to avoid invocation count accumulation
        PasswordResetTokenRepository repo = Mockito.mock(PasswordResetTokenRepository.class);
        UserRepository users             = Mockito.mock(UserRepository.class);
        EmailService mail                = Mockito.mock(EmailService.class);
        PasswordEncoder encoder          = Mockito.mock(PasswordEncoder.class);
        PasswordResetService svc = new PasswordResetService(repo, users, mail, encoder);

        // Arrange: no rate-limit (0 recent requests), active user exists
        when(repo.countByEmailAndCreatedAtAfter(eq(email), any()))
                .thenReturn(0L);
        when(users.findByEmailActive(email))
                .thenReturn(Optional.of(activeUser(email)));
        // save() returns the token that was passed in
        when(repo.save(any(PasswordResetToken.class)))
                .thenAnswer(inv -> inv.getArgument(0));
        doNothing().when(mail).sendOtpEmail(any(), any());

        // Act
        svc.requestOtp(email);

        // Assert: capture the token passed to save()
        ArgumentCaptor<PasswordResetToken> captor = ArgumentCaptor.forClass(PasswordResetToken.class);
        verify(repo).save(captor.capture());

        String otp = captor.getValue().getOtp();
        assertThat(otp)
                .as("OTP must be a string of exactly 6 characters")
                .hasSize(6);

        int otpInt = Integer.parseInt(otp);
        assertThat(otpInt)
                .as("OTP must be in range [100000, 999999]")
                .isBetween(100000, 999999);
    }

    // =========================================================================
    // Property 3: Expiración siempre a 15 minutos
    // Validates: Requirements 1.2
    // =========================================================================
    /**
     * For any email with an active user and no rate-limit, the saved token's
     * expiresAt must be within 1 second of (now + 15 minutes).
     *
     * **Validates: Requirements 1.2**
     */
    @Property(tries = 100)
    @Label("P3 — Expiración siempre a 15 minutos")
    void p3_expirationAlways15Minutes(@ForAll("validEmails") String email) {
        // Fresh mocks per try to avoid invocation count accumulation
        PasswordResetTokenRepository repo = Mockito.mock(PasswordResetTokenRepository.class);
        UserRepository users             = Mockito.mock(UserRepository.class);
        EmailService mail                = Mockito.mock(EmailService.class);
        PasswordEncoder encoder          = Mockito.mock(PasswordEncoder.class);
        PasswordResetService svc = new PasswordResetService(repo, users, mail, encoder);

        // Arrange
        when(repo.countByEmailAndCreatedAtAfter(eq(email), any()))
                .thenReturn(0L);
        when(users.findByEmailActive(email))
                .thenReturn(Optional.of(activeUser(email)));
        when(repo.save(any(PasswordResetToken.class)))
                .thenAnswer(inv -> inv.getArgument(0));
        doNothing().when(mail).sendOtpEmail(any(), any());

        LocalDateTime before = LocalDateTime.now().plusMinutes(15);

        // Act
        svc.requestOtp(email);

        LocalDateTime after = LocalDateTime.now().plusMinutes(15);

        // Assert
        ArgumentCaptor<PasswordResetToken> captor = ArgumentCaptor.forClass(PasswordResetToken.class);
        verify(repo).save(captor.capture());

        LocalDateTime expiresAt = captor.getValue().getExpiresAt();
        assertThat(expiresAt)
                .as("expiresAt must be between (now+15min - 1s) and (now+15min + 1s)")
                .isAfterOrEqualTo(before.minusSeconds(1))
                .isBeforeOrEqualTo(after.plusSeconds(1));
    }

    // =========================================================================
    // Property 4: Invalidación del OTP anterior
    // Validates: Requirements 1.5
    // =========================================================================
    /**
     * For any email, invalidateAllActiveByEmail() must be called BEFORE save()
     * (i.e., before persisting the new token).
     *
     * **Validates: Requirements 1.5**
     */
    @Property(tries = 100)
    @Label("P4 — Invalidación del OTP anterior antes de persistir el nuevo")
    void p4_invalidatePreviousOtpBeforeSavingNew(@ForAll("validEmails") String email) {
        // Arrange
        when(tokenRepository.countByEmailAndCreatedAtAfter(eq(email), any()))
                .thenReturn(0L);
        when(userRepository.findByEmailActive(email))
                .thenReturn(Optional.of(activeUser(email)));
        when(tokenRepository.save(any(PasswordResetToken.class)))
                .thenAnswer(inv -> inv.getArgument(0));
        doNothing().when(emailService).sendOtpEmail(any(), any());

        // Act
        service.requestOtp(email);

        // Assert: invalidate must happen strictly before save
        InOrder inOrder = inOrder(tokenRepository);
        inOrder.verify(tokenRepository).invalidateAllActiveByEmail(email);
        inOrder.verify(tokenRepository).save(any(PasswordResetToken.class));
    }

    // =========================================================================
    // Property 5: Rate limiting — bloqueo tras 3 solicitudes
    // Validates: Requirements 2.1, 2.3
    // =========================================================================
    /**
     * For any email, if there are already 3 recent requests within the last
     * 15 minutes, the next call to requestOtp() must throw RateLimitException.
     *
     * **Validates: Requirements 2.1, 2.3**
     */
    @Property(tries = 100)
    @Label("P5 — Rate limiting — bloqueo tras 3 solicitudes en 15 minutos")
    void p5_rateLimitingBlocksAfterThreeRequests(@ForAll("validEmails") String email) {
        // Arrange: 3 recent requests already registered
        when(tokenRepository.countByEmailAndCreatedAtAfter(eq(email), any()))
                .thenReturn(3L);

        // The oldest token is 5 minutes old → 10 minutes remaining
        PasswordResetToken oldestToken = PasswordResetToken.builder()
                .email(email)
                .otp("111111")
                .expiresAt(LocalDateTime.now().plusMinutes(15))
                .createdAt(LocalDateTime.now().minusMinutes(5))
                .build();
        when(tokenRepository.findTopByEmailAndCreatedAtAfterOrderByCreatedAtAsc(eq(email), any()))
                .thenReturn(Optional.of(oldestToken));

        // Act + Assert
        assertThatThrownBy(() -> service.requestOtp(email))
                .as("4th request within 15-minute window must throw RateLimitException")
                .isInstanceOf(RateLimitException.class);

        // Ensure we never reach the user lookup or token save
        verify(userRepository, never()).findByEmailActive(any());
        verify(tokenRepository, never()).save(any());
    }

    // =========================================================================
    // Property 6: Ventana deslizante excluye solicitudes antiguas
    // Validates: Requirements 2.4
    // =========================================================================
    /**
     * For any email, if there are fewer than 3 recent requests within the
     * 15-minute window (e.g., 2), the request must be accepted without throwing.
     *
     * **Validates: Requirements 2.4**
     */
    @Property(tries = 100)
    @Label("P6 — Ventana deslizante excluye solicitudes con más de 15 minutos")
    void p6_slidingWindowExcludesOldRequests(@ForAll("validEmails") String email) {
        // Arrange: only 2 recent requests (under the 3-request limit)
        when(tokenRepository.countByEmailAndCreatedAtAfter(eq(email), any()))
                .thenReturn(2L);
        when(userRepository.findByEmailActive(email))
                .thenReturn(Optional.of(activeUser(email)));
        when(tokenRepository.save(any(PasswordResetToken.class)))
                .thenAnswer(inv -> inv.getArgument(0));
        doNothing().when(emailService).sendOtpEmail(any(), any());

        // Act + Assert: no exception thrown
        assertThatCode(() -> service.requestOtp(email))
                .as("Request must be accepted when fewer than 3 recent requests exist")
                .doesNotThrowAnyException();
    }

    // =========================================================================
    // Property 7: Reset exitoso actualiza contraseña con BCrypt y consume el OTP
    // Validates: Requirements 3.1, 5.4
    // =========================================================================
    /**
     * For any password of length >= 6, a successful OTP verification SHALL:
     * (a) call userRepository.save with a user whose password equals "encoded-" + password
     * (b) mark the token as used == true.
     *
     * **Validates: Requirements 3.1, 5.4**
     */
    @Property(tries = 100)
    @Label("P7 — Reset exitoso actualiza contraseña y consume el OTP")
    void p7_successfulResetUpdatesPasswordAndConsumesToken(
            @ForAll @StringLength(min = 6) String password) {

        // Fresh mocks per try
        PasswordResetTokenRepository repo = Mockito.mock(PasswordResetTokenRepository.class);
        UserRepository users             = Mockito.mock(UserRepository.class);
        EmailService mail                = Mockito.mock(EmailService.class);
        PasswordEncoder encoder          = Mockito.mock(PasswordEncoder.class);
        PasswordResetService svc = new PasswordResetService(repo, users, mail, encoder);

        String email = "user@example.com";
        String correctOtp = "123456";

        // Build a valid, non-expired token
        PasswordResetToken token = PasswordResetToken.builder()
                .email(email)
                .otp(correctOtp)
                .expiresAt(LocalDateTime.now().plusMinutes(14))
                .failedAttempts(0)
                .used(false)
                .build();

        User user = activeUser(email);

        when(repo.findTopByEmailAndUsedFalseOrderByCreatedAtDesc(email))
                .thenReturn(Optional.of(token));
        when(users.findByEmailActive(email))
                .thenReturn(Optional.of(user));
        when(encoder.encode(password))
                .thenReturn("encoded-" + password);
        when(repo.save(any(PasswordResetToken.class)))
                .thenAnswer(inv -> inv.getArgument(0));
        when(users.save(any(User.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        // Act
        svc.verifyOtpAndResetPassword(email, correctOtp, password);

        // Assert (a): user saved with encoded password
        ArgumentCaptor<User> userCaptor = ArgumentCaptor.forClass(User.class);
        verify(users).save(userCaptor.capture());
        assertThat(userCaptor.getValue().getPassword())
                .as("Password must be encoded")
                .isEqualTo("encoded-" + password);

        // Assert (b): token marked as used
        assertThat(token.isUsed())
                .as("Token must be marked as used after successful reset")
                .isTrue();
    }

    // =========================================================================
    // Property 8: Incremento de intentos fallidos por OTP incorrecto
    // Validates: Requirements 3.3
    // =========================================================================
    /**
     * For any wrong OTP (not equal to "123456"), each failed attempt SHALL
     * increment failedAttempts by exactly 1.
     *
     * **Validates: Requirements 3.3**
     */
    @Property(tries = 100)
    @Label("P8 — Incremento de intentos fallidos por OTP incorrecto")
    void p8_failedAttemptIncrementsByOne(@ForAll String wrongOtp) {
        // Ensure wrongOtp is never the correct OTP and has at most 6 chars to keep simple
        // We simply use a token with otp = "123456" and only proceed if wrongOtp != "123456"
        org.junit.jupiter.api.Assumptions.assumeTrue(!wrongOtp.equals("123456"));

        // Fresh mocks per try
        PasswordResetTokenRepository repo = Mockito.mock(PasswordResetTokenRepository.class);
        UserRepository users             = Mockito.mock(UserRepository.class);
        EmailService mail                = Mockito.mock(EmailService.class);
        PasswordEncoder encoder          = Mockito.mock(PasswordEncoder.class);
        PasswordResetService svc = new PasswordResetService(repo, users, mail, encoder);

        String email = "user@example.com";

        PasswordResetToken token = PasswordResetToken.builder()
                .email(email)
                .otp("123456")
                .expiresAt(LocalDateTime.now().plusMinutes(14))
                .failedAttempts(0)
                .used(false)
                .build();

        when(repo.findTopByEmailAndUsedFalseOrderByCreatedAtDesc(email))
                .thenReturn(Optional.of(token));
        when(repo.save(any(PasswordResetToken.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        // Act — expect OtpMismatchException (or OtpBlockedException if attempts >= 3, but we start at 0)
        try {
            svc.verifyOtpAndResetPassword(email, wrongOtp, "validPass");
        } catch (OtpMismatchException | OtpBlockedException ignored) {
            // expected
        }

        // Assert: failedAttempts incremented by exactly 1
        assertThat(token.getFailedAttempts())
                .as("failedAttempts must increment by exactly 1 per failed attempt")
                .isEqualTo(1);
    }

    // =========================================================================
    // Property 9: Bloqueo permanente tras 3 intentos fallidos
    // Validates: Requirements 3.4
    // =========================================================================
    /**
     * After exactly 3 consecutive failed attempts, the token SHALL be marked as
     * used == true, and a subsequent attempt SHALL be rejected with OtpBlockedException.
     *
     * **Validates: Requirements 3.4**
     */
    @Property(tries = 1)
    @Label("P9 — Bloqueo permanente tras 3 intentos fallidos")
    void p9_permanentLockAfterThreeFailedAttempts() {
        String email = "user@example.com";
        String wrongOtp = "000000";
        String correctOtp = "123456";

        PasswordResetToken token = PasswordResetToken.builder()
                .email(email)
                .otp(correctOtp)
                .expiresAt(LocalDateTime.now().plusMinutes(14))
                .failedAttempts(0)
                .used(false)
                .build();

        when(tokenRepository.findTopByEmailAndUsedFalseOrderByCreatedAtDesc(email))
                .thenReturn(Optional.of(token));
        when(tokenRepository.save(any(PasswordResetToken.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        // Attempt 1 — expect OtpMismatchException
        assertThatThrownBy(() -> service.verifyOtpAndResetPassword(email, wrongOtp, "validPass"))
                .isInstanceOf(OtpMismatchException.class);
        assertThat(token.getFailedAttempts()).isEqualTo(1);
        assertThat(token.isUsed()).isFalse();

        // Attempt 2 — expect OtpMismatchException
        assertThatThrownBy(() -> service.verifyOtpAndResetPassword(email, wrongOtp, "validPass"))
                .isInstanceOf(OtpMismatchException.class);
        assertThat(token.getFailedAttempts()).isEqualTo(2);
        assertThat(token.isUsed()).isFalse();

        // Attempt 3 — expect OtpBlockedException and token marked used
        assertThatThrownBy(() -> service.verifyOtpAndResetPassword(email, wrongOtp, "validPass"))
                .isInstanceOf(OtpBlockedException.class);
        assertThat(token.getFailedAttempts()).isEqualTo(3);
        assertThat(token.isUsed())
                .as("Token must be marked as used after 3rd failed attempt")
                .isTrue();
    }

    // =========================================================================
    // Property 10: Rechazo de contraseñas cortas sin modificar estado
    // Validates: Requirements 3.7, 3.8
    // =========================================================================
    /**
     * For any password of length < 6, the service SHALL throw PasswordTooShortException
     * without touching the token or user state (tokenRepository.findTopBy... never called).
     *
     * **Validates: Requirements 3.7, 3.8**
     */
    @Property(tries = 100)
    @Label("P10 — Rechazo de contraseñas cortas sin modificar estado")
    void p10_shortPasswordRejectedWithoutStateChange(
            @ForAll @StringLength(min = 1, max = 5) String shortPassword) {

        // Fresh mocks per try
        PasswordResetTokenRepository repo = Mockito.mock(PasswordResetTokenRepository.class);
        UserRepository users             = Mockito.mock(UserRepository.class);
        EmailService mail                = Mockito.mock(EmailService.class);
        PasswordEncoder encoder          = Mockito.mock(PasswordEncoder.class);
        PasswordResetService svc = new PasswordResetService(repo, users, mail, encoder);

        String email = "user@example.com";

        // Act + Assert: PasswordTooShortException thrown
        assertThatThrownBy(() -> svc.verifyOtpAndResetPassword(email, "123456", shortPassword))
                .as("Password shorter than 6 chars must throw PasswordTooShortException")
                .isInstanceOf(PasswordTooShortException.class);

        // Assert: no DB access happened (service bailed out before touching the token)
        verify(repo, never()).findTopByEmailAndUsedFalseOrderByCreatedAtDesc(any());
        verify(users, never()).findByEmailActive(any());
        verify(repo, never()).save(any());
        verify(users, never()).save(any());
    }

    // =========================================================================
    // Arbitrary providers
    // =========================================================================

    /**
     * Generates non-blank email-like strings to drive the properties.
     * We use a simple format: localPart@domain.tld
     * Avoids blank/null values that would cause NPEs before reaching service logic.
     */
    @Provide
    Arbitrary<String> validEmails() {
        Arbitrary<String> local = Arbitraries.strings()
                .alpha()
                .ofMinLength(1)
                .ofMaxLength(10);
        Arbitrary<String> domain = Arbitraries.strings()
                .alpha()
                .ofMinLength(2)
                .ofMaxLength(8);
        Arbitrary<String> tld = Arbitraries.of("com", "net", "org", "cl", "io");

        return Combinators.combine(local, domain, tld)
                .as((l, d, t) -> l + "@" + d + "." + t);
    }

    // =========================================================================
    // Property 13: Limpieza elimina exactamente los tokens con más de 24 horas
    // Validates: Requirements 5.5
    // =========================================================================
    /**
     * Each invocation of cleanupExpiredTokens() must call
     * tokenRepository.deleteExpiredBefore() with a cutoff time within ±2 seconds
     * of (now - 24h). This verifies the cleanup always uses the correct 24-hour
     * threshold regardless of when it is called.
     *
     * **Validates: Requirements 5.5**
     */
    @Property(tries = 100)
    @Label("P13 — Limpieza elimina exactamente los tokens con más de 24 horas")
    void p13_cleanupUsesCorrect24HourCutoff() {
        // Fresh mocks per try to avoid invocation count accumulation
        PasswordResetTokenRepository repo = Mockito.mock(PasswordResetTokenRepository.class);
        UserRepository users             = Mockito.mock(UserRepository.class);
        EmailService mail                = Mockito.mock(EmailService.class);
        PasswordEncoder encoder          = Mockito.mock(PasswordEncoder.class);
        PasswordResetService svc = new PasswordResetService(repo, users, mail, encoder);

        // Capture the cutoff argument passed to deleteExpiredBefore
        ArgumentCaptor<LocalDateTime> cutoffCaptor = ArgumentCaptor.forClass(LocalDateTime.class);

        LocalDateTime beforeCall = LocalDateTime.now().minusHours(24);

        // Act
        svc.cleanupExpiredTokens();

        LocalDateTime afterCall = LocalDateTime.now().minusHours(24);

        // Assert: deleteExpiredBefore was called exactly once
        verify(repo).deleteExpiredBefore(cutoffCaptor.capture());
        LocalDateTime cutoff = cutoffCaptor.getValue();

        // The cutoff must be within ±2 seconds of (now - 24h)
        assertThat(cutoff)
                .as("cleanupExpiredTokens cutoff must be >= (now - 24h - 2s)")
                .isAfterOrEqualTo(beforeCall.minusSeconds(2));
        assertThat(cutoff)
                .as("cleanupExpiredTokens cutoff must be <= (now - 24h + 2s)")
                .isBeforeOrEqualTo(afterCall.plusSeconds(2));
    }
}

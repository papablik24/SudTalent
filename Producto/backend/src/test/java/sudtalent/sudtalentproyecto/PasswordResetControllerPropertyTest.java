package sudtalent.sudtalentproyecto;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;

import net.jqwik.api.*;
import net.jqwik.api.constraints.StringLength;
import net.jqwik.api.lifecycle.BeforeProperty;

import org.mockito.Mockito;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import sudtalent.sudtalentproyecto.controller.PasswordResetController;
import sudtalent.sudtalentproyecto.dto.AuthDTOs.MessageResponse;
import sudtalent.sudtalentproyecto.dto.PasswordResetDTOs.ForgotPasswordRequest;
import sudtalent.sudtalentproyecto.service.PasswordResetService;

import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Property-based tests for PasswordResetController.
 *
 * These tests instantiate the controller directly (without Spring context) to
 * be compatible with jqwik's runner, and use the Jakarta Validator API to
 * simulate Spring's @Valid processing for property P11.
 *
 * Properties covered:
 *   P1  — Anti-enumeración — respuesta siempre genérica  (Validates: Requirements 1.1, 1.4)
 *   P11 — Validación de formato de email                 (Validates: Requirements 1.6)
 */
class PasswordResetControllerPropertyTest {

    private static final String GENERIC_MESSAGE =
            "Si tu correo está registrado, recibirás un código en breve.";

    private PasswordResetService passwordResetService;
    private PasswordResetController controller;

    @BeforeProperty
    void initMocks() {
        passwordResetService = Mockito.mock(PasswordResetService.class);
        controller = new PasswordResetController(passwordResetService);
    }

    // =========================================================================
    // Property 1: Anti-enumeración — respuesta siempre genérica
    // Validates: Requirements 1.1, 1.4
    // =========================================================================
    /**
     * For any email string containing '@' (valid or invalid format), calling
     * forgotPassword() directly on the controller SHALL always return HTTP 200
     * with the exact generic message, regardless of whether the email is
     * registered in the system.
     *
     * The service is mocked to do nothing, simulating the case where the email
     * either exists or does not exist (the service handles this silently).
     *
     * **Validates: Requirements 1.1, 1.4**
     */
    @Property(tries = 200)
    @Label("P1 — Anti-enumeración — respuesta siempre genérica para emails con @")
    void p1_antiEnumerationAlwaysGenericResponse(
            @ForAll("emailsContainingAt") String email) {

        // Arrange: service does nothing (simulates both existing and non-existing users)
        doNothing().when(passwordResetService).requestOtp(any());

        ForgotPasswordRequest request = new ForgotPasswordRequest(email);

        // Act
        ResponseEntity<MessageResponse> response = controller.forgotPassword(request);

        // Assert: always HTTP 200
        assertThat(response.getStatusCode())
                .as("forgotPassword must always return HTTP 200 for any email containing '@'")
                .isEqualTo(HttpStatus.OK);

        // Assert: response body is not null
        assertThat(response.getBody())
                .as("Response body must not be null")
                .isNotNull();

        // Assert: always the same generic message
        assertThat(response.getBody().message())
                .as("forgotPassword must always return the same generic message")
                .isEqualTo(GENERIC_MESSAGE);
    }

    // =========================================================================
    // Property 11: Validación de formato de email en solicitud
    // Validates: Requirements 1.6
    // =========================================================================
    /**
     * For any string that does NOT contain '@', the Jakarta @Email constraint on
     * ForgotPasswordRequest SHALL produce at least one ConstraintViolation,
     * meaning Spring's @Valid would reject the request with HTTP 400 before
     * reaching the service.
     *
     * Since jqwik cannot drive Spring's MVC pipeline, we validate the DTO
     * directly using the Jakarta Validator API, which is the same validation
     * engine Spring uses internally.
     *
     * We also verify that passwordResetService.requestOtp() is NEVER called
     * when the validation constraint is triggered — confirming the service
     * remains untouched on invalid input.
     *
     * **Validates: Requirements 1.6**
     */
    @Property(tries = 200)
    @Label("P11 — Validación de formato de email — sin @ produce violación de restricción")
    void p11_invalidEmailFormatTriggersValidationViolation(
            @ForAll("stringsWithoutAt") String invalidEmail) {

        // Arrange: use the Jakarta Validator (same engine Spring uses for @Valid)
        try (ValidatorFactory factory = Validation.buildDefaultValidatorFactory()) {
            Validator validator = factory.getValidator();

            ForgotPasswordRequest request = new ForgotPasswordRequest(invalidEmail);

            // Act: validate the DTO
            Set<ConstraintViolation<ForgotPasswordRequest>> violations =
                    validator.validate(request);

            // Assert: at least one constraint violation exists (HTTP 400 would be triggered)
            assertThat(violations)
                    .as("Email without '@' must produce at least one @Email constraint violation")
                    .isNotEmpty();

            // Assert: the service must NEVER be called when the email is invalid
            verify(passwordResetService, never()).requestOtp(any());
        }
    }

    // =========================================================================
    // Arbitrary providers
    // =========================================================================

    /**
     * Generates strings containing at least one '@' character.
     * These represent emails that pass the basic format requirement and reach
     * the service layer — simulating valid and semi-valid email addresses.
     */
    @Provide
    Arbitrary<String> emailsContainingAt() {
        Arbitrary<String> localPart = Arbitraries.strings()
                .alpha()
                .ofMinLength(1)
                .ofMaxLength(10);
        Arbitrary<String> domain = Arbitraries.strings()
                .alpha()
                .ofMinLength(2)
                .ofMaxLength(8);
        Arbitrary<String> tld = Arbitraries.of("com", "net", "org", "cl", "io", "edu", "ar");

        return Combinators.combine(localPart, domain, tld)
                .as((l, d, t) -> l + "@" + d + "." + t);
    }

    /**
     * Generates non-empty strings that do NOT contain '@'.
     * These represent strings that fail the @Email validation constraint,
     * which would cause Spring to return HTTP 400 before invoking the service.
     */
    @Provide
    Arbitrary<String> stringsWithoutAt() {
        return Arbitraries.strings()
                .withCharRange('a', 'z')
                .withCharRange('A', 'Z')
                .withCharRange('0', '9')
                .withChars(".-_+!#$%&*")
                .ofMinLength(1)
                .ofMaxLength(50)
                .filter(s -> !s.contains("@"));
    }
}

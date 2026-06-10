package sudtalent.sudtalentproyecto;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;

import net.jqwik.api.*;
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

    @Property(tries = 200)
    @Label("P1 — Anti-enumeración — respuesta siempre genérica para emails con @")
    void p1_antiEnumerationAlwaysGenericResponse(
            @ForAll("emailsContainingAt") String email) {

        doNothing().when(passwordResetService).requestOtp(any());

        ForgotPasswordRequest request = new ForgotPasswordRequest(email);

        ResponseEntity<MessageResponse> response = controller.forgotPassword(request);

        assertThat(response.getStatusCode())
                .as("forgotPassword must always return HTTP 200 for any email containing '@'")
                .isEqualTo(HttpStatus.OK);

        assertThat(response.getBody())
                .as("Response body must not be null")
                .isNotNull();

        assertThat(response.getBody().message())
                .as("forgotPassword must always return the same generic message")
                .isEqualTo(GENERIC_MESSAGE);
    }

    @Property(tries = 200)
    @Label("P11 — Validación de formato de email — sin @ produce violación de restricción")
    void p11_invalidEmailFormatTriggersValidationViolation(
            @ForAll("stringsWithoutAt") String invalidEmail) {


        try (ValidatorFactory factory = Validation.buildDefaultValidatorFactory()) {
            Validator validator = factory.getValidator();

            ForgotPasswordRequest request = new ForgotPasswordRequest(invalidEmail);

            Set<ConstraintViolation<ForgotPasswordRequest>> violations =
                    validator.validate(request);
            assertThat(violations)
                    .as("Email without '@' must produce at least one @Email constraint violation")
                    .isNotEmpty();
            verify(passwordResetService, never()).requestOtp(any());
        }
    }

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

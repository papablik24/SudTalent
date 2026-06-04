package sudtalent.sudtalentproyecto;

import net.jqwik.api.ForAll;
import net.jqwik.api.Property;
import net.jqwik.api.constraints.IntRange;
import org.springframework.mail.javamail.JavaMailSender;
import sudtalent.sudtalentproyecto.service.EmailService;

import java.lang.reflect.Method;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

/**
 * Property-Based Tests for EmailService.
 *
 * Validates: Requirements 6.1
 */
class EmailServicePropertyTest {

    private final EmailService emailService = new EmailService(mock(JavaMailSender.class));

    /**
     * Invokes the package-private {@code buildHtmlBody} method via reflection,
     * since the test class lives in a different package from the service.
     */
    private String buildHtmlBody(String otp) {
        try {
            Method method = EmailService.class.getDeclaredMethod("buildHtmlBody", String.class);
            method.setAccessible(true);
            return (String) method.invoke(emailService, otp);
        } catch (Exception e) {
            throw new RuntimeException("Failed to invoke buildHtmlBody via reflection", e);
        }
    }

    /**
     * Property 12: Contenido del correo HTML contiene todos los elementos requeridos.
     *
     * Para cualquier OTP de 6 dígitos, el cuerpo HTML generado por
     * EmailService.buildHtmlBody(otp) SHALL contener: el valor del OTP como cadena,
     * la cadena "SudTalent", la cadena "15 minutos" y la cadena
     * "Si no solicitaste este código".
     *
     * Validates: Requirements 6.1
     */
    @Property
    void htmlBodyContainsAllRequiredElements(@ForAll @IntRange(min = 100000, max = 999999) int otp) {
        String otpString = String.valueOf(otp);
        String html = buildHtmlBody(otpString);

        assertThat(html)
                .as("El cuerpo HTML debe contener el OTP como cadena de texto")
                .contains(otpString);

        assertThat(html)
                .as("El cuerpo HTML debe contener 'SudTalent'")
                .contains("SudTalent");

        assertThat(html)
                .as("El cuerpo HTML debe contener '15 minutos'")
                .contains("15 minutos");

        assertThat(html)
                .as("El cuerpo HTML debe contener 'Si no solicitaste este código'")
                .contains("Si no solicitaste este código");
    }
}

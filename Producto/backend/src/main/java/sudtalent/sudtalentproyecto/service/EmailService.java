package sudtalent.sudtalentproyecto.service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import sudtalent.sudtalentproyecto.exception.EmailSendException;

@Slf4j
@Service
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username}")
    private String fromAddress;

    @Value("${spring.mail.password}")
    private String mailPassword;

    /**
     * Envía el correo HTML con el OTP al destinatario.
     * Lanza EmailSendException si el envío falla.
     */
    public void sendOtpEmail(String toEmail, String otp) {
        log.debug("SMTP config — username: [{}], password length: [{}], password bytes: {}",
                fromAddress,
                mailPassword != null ? mailPassword.length() : 0,
                mailPassword != null ? java.util.Arrays.toString(mailPassword.getBytes()) : "null");
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromAddress);
            helper.setTo(toEmail);
            helper.setSubject("Código de recuperación de contraseña - SudTalent");
            helper.setText(buildHtmlBody(otp), true);

            mailSender.send(message);
            log.info("Correo de recuperación enviado a: {}", toEmail);

        } catch (MailException | MessagingException e) {
            log.error("Error al enviar correo de recuperación a {}: {} - Causa: {}", toEmail, e.getMessage(), e.getCause() != null ? e.getCause().getMessage() : "sin causa");
            throw new EmailSendException();
        }
    }

    /**
     * Construye el cuerpo HTML del correo con el OTP resaltado.
     */
    String buildHtmlBody(String otp) {
        return """
                <!DOCTYPE html>
                <html lang="es">
                <head>
                    <meta charset="UTF-8" />
                    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                    <title>Recuperación de contraseña - SudTalent</title>
                </head>
                <body style="margin:0; padding:0; background-color:#f4f4f7; font-family:Arial, Helvetica, sans-serif;">
                    <table width="100%%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f7; padding:40px 0;">
                        <tr>
                            <td align="center">
                                <table width="600" cellpadding="0" cellspacing="0"
                                       style="background-color:#ffffff; border-radius:8px;
                                              box-shadow:0 2px 8px rgba(0,0,0,0.08); overflow:hidden;">

                                    <!-- Encabezado -->
                                    <tr>
                                        <td style="background-color:#1a1a2e; padding:32px 40px; text-align:center;">
                                            <h1 style="margin:0; color:#ffffff; font-size:24px; font-weight:700;
                                                        letter-spacing:1px;">SudTalent</h1>
                                        </td>
                                    </tr>

                                    <!-- Cuerpo -->
                                    <tr>
                                        <td style="padding:40px 40px 32px;">
                                            <h2 style="margin:0 0 16px; color:#1a1a2e; font-size:20px;">
                                                Recuperación de contraseña
                                            </h2>
                                            <p style="margin:0 0 24px; color:#555555; font-size:15px; line-height:1.6;">
                                                Recibimos una solicitud para restablecer la contraseña de tu cuenta en
                                                <strong>SudTalent</strong>. Usa el siguiente código para continuar:
                                            </p>

                                            <!-- OTP resaltado -->
                                            <table width="100%%" cellpadding="0" cellspacing="0"
                                                   style="margin:0 0 24px;">
                                                <tr>
                                                    <td align="center">
                                                        <div style="display:inline-block; background-color:#f0f4ff;
                                                                    border:2px solid #1a1a2e; border-radius:8px;
                                                                    padding:16px 40px;">
                                                            <span style="font-size:36px; font-weight:700;
                                                                         color:#1a1a2e; letter-spacing:8px;
                                                                         font-family:'Courier New', Courier, monospace;">
                                                                %s
                                                            </span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            </table>

                                            <p style="margin:0 0 12px; color:#555555; font-size:14px; line-height:1.6;">
                                                ⏱ Este código es válido por <strong>15 minutos</strong> a partir del momento
                                                en que fue generado.
                                            </p>
                                            <p style="margin:0 0 32px; color:#888888; font-size:13px; line-height:1.6;">
                                                Si no solicitaste este código, ignora este correo. Tu contraseña actual
                                                no será modificada.
                                            </p>

                                            <hr style="border:none; border-top:1px solid #eeeeee; margin:0 0 24px;" />

                                            <p style="margin:0; color:#aaaaaa; font-size:12px; line-height:1.5; text-align:center;">
                                                Este es un correo automático de <strong>SudTalent</strong>.
                                                Por favor, no respondas a este mensaje.
                                            </p>
                                        </td>
                                    </tr>

                                    <!-- Pie de página -->
                                    <tr>
                                        <td style="background-color:#f4f4f7; padding:20px 40px; text-align:center;">
                                            <p style="margin:0; color:#aaaaaa; font-size:12px;">
                                                © 2025 SudTalent. Todos los derechos reservados.
                                            </p>
                                        </td>
                                    </tr>

                                </table>
                            </td>
                        </tr>
                    </table>
                </body>
                </html>
                """.formatted(otp);
    }
}

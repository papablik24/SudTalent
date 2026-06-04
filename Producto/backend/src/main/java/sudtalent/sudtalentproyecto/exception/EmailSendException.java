package sudtalent.sudtalentproyecto.exception;

public class EmailSendException extends RuntimeException {

    public EmailSendException() {
        super("No fue posible enviar el correo electrónico. Intenta nuevamente.");
    }
}

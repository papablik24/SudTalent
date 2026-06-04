package sudtalent.sudtalentproyecto.exception;

public class OtpBlockedException extends RuntimeException {

    public OtpBlockedException() {
        super("Código bloqueado por demasiados intentos. Solicita uno nuevo.");
    }
}

package sudtalent.sudtalentproyecto.exception;

public class OtpMismatchException extends RuntimeException {

    public OtpMismatchException() {
        super("Código incorrecto.");
    }
}

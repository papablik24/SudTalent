package sudtalent.sudtalentproyecto.exception;

public class OtpExpiredException extends RuntimeException {

    public OtpExpiredException() {
        super("El código ha expirado. Solicita uno nuevo.");
    }
}

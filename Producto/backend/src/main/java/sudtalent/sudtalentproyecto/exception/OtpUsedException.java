package sudtalent.sudtalentproyecto.exception;

public class OtpUsedException extends RuntimeException {

    public OtpUsedException() {
        super("El código ya fue usado. Solicita uno nuevo.");
    }
}

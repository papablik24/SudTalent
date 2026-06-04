package sudtalent.sudtalentproyecto.exception;

public class OtpNotFoundException extends RuntimeException {

    public OtpNotFoundException() {
        super("No hay un código activo para este correo.");
    }
}

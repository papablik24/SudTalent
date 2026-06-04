package sudtalent.sudtalentproyecto.exception;

public class PasswordTooShortException extends RuntimeException {

    public PasswordTooShortException() {
        super("La contraseña debe tener al menos 6 caracteres.");
    }
}

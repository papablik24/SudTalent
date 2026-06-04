package sudtalent.sudtalentproyecto.exception;

public class RateLimitException extends RuntimeException {

    public RateLimitException(int minutosRestantes) {
        super("Demasiadas solicitudes. Intenta en " + minutosRestantes + " minutos.");
    }
}

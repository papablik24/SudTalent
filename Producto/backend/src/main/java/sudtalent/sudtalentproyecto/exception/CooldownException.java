package sudtalent.sudtalentproyecto.exception;

public class CooldownException extends RuntimeException {

    private final int secondsRemaining;

    public CooldownException(int secondsRemaining) {
        super("Debes esperar antes de solicitar un nuevo código.");
        this.secondsRemaining = secondsRemaining;
    }

    public int getSecondsRemaining() {
        return secondsRemaining;
    }
}

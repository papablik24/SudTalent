package sudtalent.sudtalentproyecto.dto;

import java.time.LocalDateTime;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;



@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WhitelistNumberDTO {
    private UUID id;
    private String phone;
    private String name;
    private String email;
    private String status;
    private String category;
    private String role;
    private UUID userId;       // ← FK al usuario registrado
    private String userStatus; // ← status del usuario en la tabla users
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}

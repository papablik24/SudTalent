package sudtalent.sudtalentproyecto.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StudentWhitelistDTO {
    private UUID userId;
    private String name;
    private String email;
    private String phone;
    private String role;
    private Boolean onboarded;
    private String profileType;
    private String userStatus;
    
    // Whitelist info
    private UUID whitelistId;
    private String whitelistStatus;
    private String category;
    private LocalDateTime whitelistCreatedAt;
    private LocalDateTime whitelistUpdatedAt;
    
    // Combined status
    private String combinedStatus; // AUTHORIZED, PENDING, REJECTED, NOT_WHITELISTED
}

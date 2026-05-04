package sudtalent.sudtalentproyecto.dto;

import java.time.LocalDateTime;
import lombok.Builder;
import lombok.Data;



@Data
@Builder
public class WhitelistNumberDTO {
    private Long id;
    private String phone;
    private String status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}


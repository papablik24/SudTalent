package sudtalent.sudtalentproyecto.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WhitelistCandidateDTO {
    private String name;
    private String rawPhone;
    private String normalizedPhone;
    private String status; // "VALID" | "INVALID" | "DUPLICATE" | "ALREADY_EXISTS"
    private String validationMessage;
}

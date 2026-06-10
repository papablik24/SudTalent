package sudtalent.sudtalentproyecto.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WhitelistReportDTO {
    private Long totalStudents;
    private Long totalWhitelisted;
    private Long totalAuthorized;
    private Long totalPending;
    private Long totalRejected;
    private Long totalNotWhitelisted;
    private Double authorizationPercentage;
    private Double whitelistCoverage;
}

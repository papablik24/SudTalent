package sudtalent.sudtalentproyecto.dto;

import java.time.LocalDateTime;
import java.util.UUID;
import lombok.*;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class VoiceAudioDTO {
    private UUID id;
    private UUID userId;
    private String title;
    private String fileUrl;
    private String storagePath;
    private Integer durationSeconds;
    private Double fileSizeMb;
    private String mediaType;
    private String fileFormat;  // Calculado desde mediaType o storagePath
    private String category;
    private String visualGenre;
    private boolean isPublic;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    /**
     * Calcular fileFormat desde mediaType o storagePath
     */
    public String getFileFormat() {
        if (fileFormat != null && !fileFormat.isEmpty()) {
            return fileFormat;
        }
        
        // Intentar extraer del storagePath (última extensión)
        if (storagePath != null && storagePath.contains(".")) {
            String ext = storagePath.substring(storagePath.lastIndexOf(".") + 1).toUpperCase();
            if (ext.matches("[A-Z0-9]+")) {
                return ext;
            }
        }
        
        // Extraer del mediaType
        if (mediaType != null) {
            if (mediaType.contains("mpeg")) return "MP3";
            if (mediaType.contains("wav")) return "WAV";
            if (mediaType.contains("mp4")) return "MP4";
            if (mediaType.contains("quicktime")) return "MOV";
        }
        
        return "UNKNOWN";
    }
}
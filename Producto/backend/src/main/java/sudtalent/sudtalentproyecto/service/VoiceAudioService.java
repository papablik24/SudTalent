package sudtalent.sudtalentproyecto.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import sudtalent.sudtalentproyecto.model.User;
import sudtalent.sudtalentproyecto.model.VoiceAudio;
import sudtalent.sudtalentproyecto.dto.VoiceAudioDTO;
import sudtalent.sudtalentproyecto.repository.VoiceAudioRepository;
import sudtalent.sudtalentproyecto.repository.UserRepository;

import java.io.IOException;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class VoiceAudioService {

    @Autowired
    private VoiceAudioRepository voiceAudioRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private SupabaseStorageService supabaseStorageService;

    @Value("${app.supabase.project-id:}")
    private String supabaseProjectId;

    /**
     * 📤 Subir audio: Supabase Storage → BD
     */
    public VoiceAudioDTO uploadAudio(
            User user,
            MultipartFile file,
            String title,
            String category) throws IOException {

        // 1️⃣ Subir archivo a Supabase Storage
        String storagePath = supabaseStorageService.uploadFile(
                "user-audios",
                user.getId(),
                file
        );

        // 2️⃣ Construir URL pública
        String fileUrl = buildPublicUrl(storagePath);

        // 3️⃣ Crear registro en BD (solo URL + metadatos)
        VoiceAudio audio = VoiceAudio.builder()
                .user(user)
                .title(title)
                .fileUrl(fileUrl)
                .storagePath(storagePath)
                .fileSizeMb((double) file.getSize() / (1024 * 1024))
                .mediaType(file.getContentType() != null ? file.getContentType() : "audio/mpeg")
                .category(category)
                .isPublic(true)
                .build();

        VoiceAudio saved = voiceAudioRepository.save(audio);

        // 4️⃣ Si es audio de perfil, actualizar user
        if ("profile".equals(category)) {
            user.setProfileAudioUrl(fileUrl);
            userRepository.save(user);
        }

        return toDTO(saved);
    }

    /**
     * Construir URL pública de Supabase Storage
     */
    private String buildPublicUrl(String storagePath) {
        return String.format(
                "https://%s.supabase.co/storage/v1/object/public/user-audios/%s",
                supabaseProjectId,
                storagePath
        );
    }

    /**
     * 📋 Obtener audios del usuario
     */
    public List<VoiceAudioDTO> getUserAudios(UUID userId, String category) {
        List<VoiceAudio> audios;

        if (category != null && !category.isEmpty()) {
            audios = voiceAudioRepository.findByUserIdAndCategoryNotDeleted(userId, category);
        } else {
            audios = voiceAudioRepository.findByUserIdNotDeleted(userId);
        }

        return audios.stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    /**
     * 📥 Obtener audio específico por ID
     */
    public VoiceAudioDTO getAudioById(UUID audioId) {
        VoiceAudio audio = voiceAudioRepository.findById(audioId)
                .orElseThrow(() -> new RuntimeException("Audio no encontrado"));

        if (audio.isDeleted()) {
            throw new RuntimeException("El audio ha sido eliminado");
        }

        return toDTO(audio);
    }

    /**
     * 🗑️ Eliminar audio (soft delete)
     */
    public void deleteAudio(UUID userId, UUID audioId) {
        VoiceAudio audio = voiceAudioRepository.findById(audioId)
                .orElseThrow(() -> new RuntimeException("Audio no encontrado"));

        if (!audio.getUser().getId().equals(userId)) {
            throw new RuntimeException("No tienes permiso para eliminar este audio");
        }

        audio.softDelete();
        voiceAudioRepository.save(audio);
    }

    /**
     * 🔄 Convertir VoiceAudio Entity a DTO
     */
    private VoiceAudioDTO toDTO(VoiceAudio audio) {
        return VoiceAudioDTO.builder()
                .id(audio.getId())
                .title(audio.getTitle())
                .fileUrl(audio.getFileUrl())
                .storagePath(audio.getStoragePath())
                .durationSeconds(audio.getDurationSeconds())
                .fileSizeMb(audio.getFileSizeMb())
                .mediaType(audio.getMediaType())
                .category(audio.getCategory())
                .isPublic(audio.isPublic())
                .createdAt(audio.getCreatedAt())
                .updatedAt(audio.getUpdatedAt())
                .build();
    }
}
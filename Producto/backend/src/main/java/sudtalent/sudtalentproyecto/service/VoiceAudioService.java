package sudtalent.sudtalentproyecto.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import sudtalent.sudtalentproyecto.model.User;
import sudtalent.sudtalentproyecto.model.VoiceAudio;
import sudtalent.sudtalentproyecto.dto.VoiceAudioDTO;
import sudtalent.sudtalentproyecto.repository.VoiceAudioRepository;
import sudtalent.sudtalentproyecto.repository.UserRepository;
import lombok.RequiredArgsConstructor;

import java.io.IOException;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class VoiceAudioService {

    private final VoiceAudioRepository voiceAudioRepository;
    private final UserRepository userRepository;
    private final SupabaseStorageService supabaseStorageService;

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
        return uploadAudio(user, file, title, category, null, null, null);
    }

    public VoiceAudioDTO uploadAudio(
            User user,
            MultipartFile file,
            String title,
            String category,
            String visualGenre) throws IOException {
        return uploadAudio(user, file, title, category, visualGenre, null, null);
    }

    public VoiceAudioDTO uploadAudio(
            User user,
            MultipartFile file,
            String title,
            String category,
            String visualGenre,
            String demoCategory,
            String description) throws IOException {

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
                .visualGenre(visualGenre)
                .demoCategory(demoCategory)
                .description(description)
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
     * 🔄 Actualizar el género visual de una demo
     */
    public VoiceAudioDTO updateVisualGenre(UUID audioId, String visualGenre) {
        VoiceAudio audio = voiceAudioRepository.findById(audioId)
                .orElseThrow(() -> new RuntimeException("Audio no encontrado"));

        if (audio.isDeleted()) {
            throw new RuntimeException("El audio ha sido eliminado");
        }

        audio.setVisualGenre(visualGenre);
        audio.setUpdatedAt(java.time.LocalDateTime.now());
        VoiceAudio saved = voiceAudioRepository.save(audio);
        return toDTO(saved);
    }

    /**
     * Obtener todas las demos de todos los usuarios (no eliminadas y categoría 'demo')
     */
    public List<VoiceAudioDTO> getAllDemos() {
        return voiceAudioRepository.findByCategoryNotDeleted("demo").stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    /**
     * 📝 Actualizar metadatos de un audio
     */
    @org.springframework.transaction.annotation.Transactional
    public VoiceAudioDTO updateAudioMetadata(
            UUID userId,
            UUID audioId,
            String title,
            String demoCategory,
            String visualGenre,
            String description) {
        
        VoiceAudio audio = voiceAudioRepository.findById(audioId)
                .orElseThrow(() -> new RuntimeException("Audio no encontrado"));
        
        if (!audio.getUser().getId().equals(userId)) {
            throw new RuntimeException("No tienes permiso para editar este audio");
        }
        
        if (audio.isDeleted()) {
            throw new RuntimeException("El audio ha sido eliminado");
        }
        
        if (title != null && !title.trim().isEmpty()) {
            audio.setTitle(title.trim());
        }
        
        if (demoCategory != null) {
            audio.setDemoCategory(demoCategory.trim());
        }
        
        audio.setVisualGenre(visualGenre);
        audio.setDescription(description);
        audio.setUpdatedAt(java.time.LocalDateTime.now());
        
        VoiceAudio saved = voiceAudioRepository.save(audio);
        return toDTO(saved);
    }

    /**
     * 🔄 Convertir VoiceAudio Entity a DTO
     */
    private VoiceAudioDTO toDTO(VoiceAudio audio) {
        return VoiceAudioDTO.builder()
                .id(audio.getId())
                .userId(audio.getUser() != null ? audio.getUser().getId() : null)
                .title(audio.getTitle())
                .fileUrl(audio.getFileUrl())
                .storagePath(audio.getStoragePath())
                .durationSeconds(audio.getDurationSeconds())
                .fileSizeMb(audio.getFileSizeMb())
                .mediaType(audio.getMediaType())
                .category(audio.getCategory())
                .visualGenre(audio.getVisualGenre())
                .demoCategory(audio.getDemoCategory())
                .description(audio.getDescription())
                .isPublic(audio.isPublic())
                .createdAt(audio.getCreatedAt())
                .updatedAt(audio.getUpdatedAt())
                .build();
    }
}
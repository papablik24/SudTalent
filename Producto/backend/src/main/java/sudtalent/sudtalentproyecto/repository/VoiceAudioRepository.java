package sudtalent.sudtalentproyecto.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import sudtalent.sudtalentproyecto.model.VoiceAudio;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface VoiceAudioRepository extends JpaRepository<VoiceAudio, UUID> {

    @Query("SELECT v FROM VoiceAudio v WHERE v.user.id = ?1 AND v.deletedAt IS NULL ORDER BY v.createdAt DESC")
    List<VoiceAudio> findByUserIdNotDeleted(UUID userId);

    @Query("SELECT v FROM VoiceAudio v WHERE v.user.id = ?1 AND v.category = 'profile' AND v.deletedAt IS NULL ORDER BY v.createdAt DESC LIMIT 1")
    Optional<VoiceAudio> findLatestProfileAudio(UUID userId);

    @Query("SELECT v FROM VoiceAudio v WHERE v.user.id = ?1 AND v.category = ?2 AND v.deletedAt IS NULL ORDER BY v.createdAt DESC")
    List<VoiceAudio> findByUserIdAndCategoryNotDeleted(UUID userId, String category);
}
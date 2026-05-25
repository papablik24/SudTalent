package sudtalent.sudtalentproyecto.service;

import sudtalent.sudtalentproyecto.model.Profile;
import sudtalent.sudtalentproyecto.repository.ProfileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class ProfileService {
    private final ProfileRepository profileRepository;
    
    public Profile createProfile(Profile profile) {
        return profileRepository.save(profile);
    }
    
    public List<Profile> getAllProfiles() {
        return profileRepository.findAll();
    }
    
    public Profile getProfileById(UUID id) {
        return profileRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Perfil no encontrado"));
    }
    
    public Profile updateProfile(UUID id, Profile profileUpdate) {
        Profile profile = getProfileById(id);
        if(profileUpdate.getDescripcion() != null) {
            profile.setDescripcion(profileUpdate.getDescripcion());
        }
        return profileRepository.save(profile);
    }
    
    public void deleteProfile(UUID id) {
        profileRepository.deleteById(id);
    }
}
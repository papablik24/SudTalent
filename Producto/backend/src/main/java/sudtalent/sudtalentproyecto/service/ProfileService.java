package sudtalent.sudtalentproyecto.service;

import sudtalent.sudtalentproyecto.model.Profile;
import sudtalent.sudtalentproyecto.repository.ProfileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

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
    
    public Profile getProfileById(Long id) {
        return profileRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Perfil no encontrado"));
    }
    
    public Profile updateProfile(Long id, Profile profileUpdate) {
        Profile profile = getProfileById(id);
        if(profileUpdate.getDescripcion() != null) {
            profile.setDescripcion(profileUpdate.getDescripcion());
        }
        return profileRepository.save(profile);
    }
    
    public void deleteProfile(Long id) {
        profileRepository.deleteById(id);
    }
}
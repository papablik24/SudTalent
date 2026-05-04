package sudtalent.sudtalentproyecto.service;

import sudtalent.sudtalentproyecto.model.User;
import sudtalent.sudtalentproyecto.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class UserService {
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    
    public User createUser(User user) {
        if(userRepository.existsByEmail(user.getEmail())) {
            throw new IllegalArgumentException("El email ya está registrado");
        }
        user.setPassword(passwordEncoder.encode(user.getPassword()));
        user.setActive(true);
        return userRepository.save(user);
    }
    
    public List<User> getAllUsers() {
        return userRepository.findAll();
    }
    
    public User getUserById(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
    }
    
    public User updateUser(Long id, User userUpdate) {
        User user = getUserById(id);
        if(userUpdate.getName() != null) user.setName(userUpdate.getName());
        if(userUpdate.getEmail() != null && !userUpdate.getEmail().equals(user.getEmail())) {
            if(userRepository.existsByEmail(userUpdate.getEmail())) {
                throw new IllegalArgumentException("El email ya está registrado");
            }
            user.setEmail(userUpdate.getEmail());
        }
        if(userUpdate.getPassword() != null && !userUpdate.getPassword().isEmpty()) {
            user.setPassword(passwordEncoder.encode(userUpdate.getPassword()));
        }
        if(userUpdate.getRole() != null) user.setRole(userUpdate.getRole());
        user.setActive(userUpdate.isActive());
        return userRepository.save(user);
    }
    
    public void deleteUser(Long id) {
        if(!userRepository.existsById(id)) {
            throw new RuntimeException("Usuario no encontrado");
        }
        userRepository.deleteById(id);
    }
    
    public User deactivateUser(Long id) {
        User user = getUserById(id);
        user.setActive(false);
        return userRepository.save(user);
    }
}
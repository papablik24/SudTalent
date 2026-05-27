package sudtalent.sudtalentproyecto.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import sudtalent.sudtalentproyecto.model.User;
import sudtalent.sudtalentproyecto.service.SoftDeleteService;
import sudtalent.sudtalentproyecto.repository.UserRepository;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/users")
public class UserController {
    
    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private SoftDeleteService softDeleteService;
    
    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<User> getUser(@PathVariable UUID id) {
        return userRepository.findByIdActive(id)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }
    
    @GetMapping
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public ResponseEntity<?> getAllUsers() {
        return ResponseEntity.ok(userRepository.findAllActive());
    }

    /** Actualizar estado/campos de un usuario (usado por el admin) */
    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public ResponseEntity<?> updateUser(@PathVariable UUID id, @RequestBody Map<String, Object> updates) {
        return userRepository.findByIdActive(id).map(user -> {
            if (updates.containsKey("status")) {
                try {
                    user.setStatus(User.ProfileStatus.valueOf((String) updates.get("status")));
                } catch (IllegalArgumentException ignored) {}
            }
            if (updates.containsKey("name")) {
                user.setName((String) updates.get("name"));
            }
            if (updates.containsKey("active")) {
                user.setActive((Boolean) updates.get("active"));
            }
            return ResponseEntity.ok(userRepository.save(user));
        }).orElse(ResponseEntity.notFound().build());
    }
    
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public ResponseEntity<?> deleteUser(@PathVariable UUID id) {
        try {
            User deletedUser = softDeleteService.softDeleteUser(id);
            return ResponseEntity.ok(deletedUser);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }
    
    @PutMapping("/{id}/restore")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public ResponseEntity<?> restoreUser(@PathVariable UUID id) {
        try {
            User restoredUser = softDeleteService.restoreUser(id);
            return ResponseEntity.ok(restoredUser);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }
}
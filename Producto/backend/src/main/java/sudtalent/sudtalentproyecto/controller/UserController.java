package sudtalent.sudtalentproyecto.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import sudtalent.sudtalentproyecto.model.User;
import sudtalent.sudtalentproyecto.service.SoftDeleteService;
import sudtalent.sudtalentproyecto.repository.UserRepository;
import java.util.UUID;

@RestController
@RequestMapping("/api/users")
public class UserController {
    
    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private SoftDeleteService softDeleteService;
    
    @GetMapping("/{id}")
    public ResponseEntity<User> getUser(@PathVariable UUID id) {
        // Solo retorna si no está eliminado
        return userRepository.findByIdActive(id)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }
    
    @GetMapping
    public ResponseEntity<?> getAllUsers() {
        // Solo retorna usuarios no eliminados
        return ResponseEntity.ok(userRepository.findAllActive());
    }
    
    // ✅ Cambiar DELETE por SOFT DELETE
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteUser(@PathVariable UUID id) {
        try {
            User deletedUser = softDeleteService.softDeleteUser(id);
            return ResponseEntity.ok(deletedUser);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }
    
    // ✅ Nuevo endpoint: Restaurar usuario
    @PutMapping("/{id}/restore")
    public ResponseEntity<?> restoreUser(@PathVariable UUID id) {
        try {
            User restoredUser = softDeleteService.restoreUser(id);
            return ResponseEntity.ok(restoredUser);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }
}
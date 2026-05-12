package sudtalent.sudtalentproyecto.controller;

import sudtalent.sudtalentproyecto.model.User;
import sudtalent.sudtalentproyecto.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {
    private final UserService userService;
    
    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<Map<String, Object>>> getAllUsers() {
        List<Map<String, Object>> users = userService.getAllUsers().stream()
            .map(this::toSafeMap)
            .collect(Collectors.toList());
        return ResponseEntity.ok(users);
    }
    
    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()") 
    public ResponseEntity<Map<String, Object>> getUserById(@PathVariable Long id) {
        return ResponseEntity.ok(toSafeMap(userService.getUserById(id)));
    }
    
    @PostMapping
    public ResponseEntity<User> createUser(@Valid @RequestBody User user) {
        return ResponseEntity.status(HttpStatus.CREATED).body(userService.createUser(user));
    }
    
    @PutMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<User> updateUser(@PathVariable Long id, @Valid @RequestBody User userUpdate) {
        return ResponseEntity.ok(userService.updateUser(id, userUpdate));
    }
    
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteUser(@PathVariable Long id) {
        userService.deleteUser(id);
        return ResponseEntity.noContent().build();
    }
    
    @PostMapping("/{id}/deactivate")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<User> deactivateUser(@PathVariable Long id) {
        return ResponseEntity.ok(userService.deactivateUser(id));
    }

    // Don't expose password in responses
    private Map<String, Object> toSafeMap(User u) {
        return Map.ofEntries(
            Map.entry("id", u.getId()),
            Map.entry("name", u.getName() != null ? u.getName() : ""),
            Map.entry("email", u.getEmail() != null ? u.getEmail() : ""),
            Map.entry("phone", u.getPhone() != null ? u.getPhone() : ""),
            Map.entry("role", u.getRole().name()),
            Map.entry("active", u.isActive()),
            Map.entry("onboarded", u.isOnboarded()),
            Map.entry("profileType", u.getProfileType() != null ? u.getProfileType().name() : ""),
            Map.entry("status", u.getStatus() != null ? u.getStatus().name() : "PENDING"),
            Map.entry("specialties", u.getSpecialties() != null ? u.getSpecialties() : ""),
            Map.entry("bio", u.getBio() != null ? u.getBio() : ""),
            Map.entry("createdAt", u.getCreatedAt().toString())
        );
    }
}
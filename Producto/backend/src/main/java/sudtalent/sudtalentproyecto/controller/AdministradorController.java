package sudtalent.sudtalentproyecto.controller;

import sudtalent.sudtalentproyecto.model.Administrador;
import sudtalent.sudtalentproyecto.service.AdministradorService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/administradores")
@RequiredArgsConstructor
public class AdministradorController {
    private final AdministradorService administradorService;
    
    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<Administrador>> getAllAdministradores() {
        return ResponseEntity.ok(administradorService.getAllAdministradores());
    }
    
    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Administrador> getAdministradorById(@PathVariable UUID id) {
        return ResponseEntity.ok(administradorService.getAdministradorById(id));
    }
    
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Administrador> createAdministrador(@Valid @RequestBody Administrador administrador) {
        return ResponseEntity.status(HttpStatus.CREATED).body(administradorService.createAdministrador(administrador));
    }
    
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Administrador> updateAdministrador(@PathVariable UUID id, @Valid @RequestBody Administrador administradorUpdate) {
        return ResponseEntity.ok(administradorService.updateAdministrador(id, administradorUpdate));
    }
    
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteAdministrador(@PathVariable UUID id) {
        administradorService.deleteAdministrador(id);
        return ResponseEntity.noContent().build();
    }
}
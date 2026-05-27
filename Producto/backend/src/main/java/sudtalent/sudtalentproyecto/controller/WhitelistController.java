package sudtalent.sudtalentproyecto.controller;


import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import lombok.RequiredArgsConstructor;

import java.util.List;
import java.util.UUID;

import sudtalent.sudtalentproyecto.dto.StudentWhitelistDTO;
import sudtalent.sudtalentproyecto.dto.WhitelistNumberDTO;
import sudtalent.sudtalentproyecto.dto.WhitelistReportDTO;
import sudtalent.sudtalentproyecto.dto.WhitelistStatsDTO;
import sudtalent.sudtalentproyecto.service.WhitelistService;

@RestController
@RequestMapping("/api/whitelist")
@RequiredArgsConstructor
public class WhitelistController {
    private final WhitelistService whitelistService;

    @GetMapping("/stats")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public ResponseEntity<WhitelistStatsDTO> getStats() {
        return ResponseEntity.ok(whitelistService.getStats());
    }

    @GetMapping
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public ResponseEntity<List<WhitelistNumberDTO>> getAllNumbers() {
        return ResponseEntity.ok(whitelistService.getAllNumbers());
    }

    // Agregar un número a la whitelist + crear usuario automáticamente
    @PostMapping
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public ResponseEntity<WhitelistNumberDTO> addNumber(
        @RequestBody WhitelistNumberDTO dto) {
        
        String phoneToAdd = dto != null ? dto.getPhone() : null;
        if (phoneToAdd == null || phoneToAdd.isEmpty()) {
            return ResponseEntity.badRequest().build();
        }
        
        // ✅ Logs para debug
        System.out.println("📱 Whitelist POST recibido:");
        System.out.println("   phone: " + dto.getPhone());
        System.out.println("   name: " + dto.getName());
        System.out.println("   email: " + dto.getEmail());
        System.out.println("   category: " + dto.getCategory());
        
        // ✅ Usar createNumberWithUser para crear usuario + whitelist
        String name = dto.getName() != null ? dto.getName() : "";
        String email = dto.getEmail() != null ? dto.getEmail() : "";
        
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(whitelistService.createNumberWithUser(phoneToAdd, name, email));
    }

    // Actualizar estado por ID
    @PutMapping("/{id}/status")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public ResponseEntity<WhitelistNumberDTO> updateStatus(
        @PathVariable UUID id,
        @RequestParam String status) {
        return ResponseEntity.ok(whitelistService.updateStatus(id, status));
    }

    // Actualizar por teléfono (nuevo endpoint para el frontend)
    @PutMapping("/{phone}")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public ResponseEntity<WhitelistNumberDTO> updateByPhone(
        @PathVariable String phone,
        @RequestBody WhitelistNumberDTO updates) {
        return ResponseEntity.ok(whitelistService.updateByPhone(phone, updates));
    }

    // Eliminar por ID
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public ResponseEntity<Void> deleteNumber(@PathVariable UUID id) {
        whitelistService.deleteNumber(id);
        return ResponseEntity.noContent().build();
    }

    // Eliminar por teléfono (nuevo endpoint para el frontend)
    @DeleteMapping("/phone/{phone}")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public ResponseEntity<Void> deleteByPhone(@PathVariable String phone) {
        whitelistService.deleteByPhone(phone);
        return ResponseEntity.noContent().build();
    }

    // ==================== FUNCIONALIDAD 1: Obtener todos los alumnos con estado en whitelist ====================
    @GetMapping("/students/status")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public ResponseEntity<List<StudentWhitelistDTO>> getAllStudentsWithWhitelistStatus() {
        return ResponseEntity.ok(whitelistService.getAllStudentsWithWhitelistStatus());
    }

    // ==================== FUNCIONALIDAD 2: Crear usuario cuando se agrega a whitelist ====================
    @PostMapping("/with-user")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public ResponseEntity<WhitelistNumberDTO> addNumberWithUser(
        @RequestBody WhitelistNumberDTO dto) {
        
        String phoneToAdd = dto != null ? dto.getPhone() : null;
        if (phoneToAdd == null || phoneToAdd.isEmpty()) {
            return ResponseEntity.badRequest().build();
        }
        
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(whitelistService.createNumberWithUser(
                phoneToAdd, 
                dto.getName(), 
                dto.getEmail()
            ));
    }

    // ==================== FUNCIONALIDAD 3: Reportes de alumnos autorizados vs pendientes ====================
    @GetMapping("/report")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public ResponseEntity<WhitelistReportDTO> getWhitelistReport() {
        return ResponseEntity.ok(whitelistService.getWhitelistReport());
    }

    // ==================== FUNCIONALIDAD 4: Sincronizar usuario_id NULL ====================
    @PostMapping("/sync")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public ResponseEntity<java.util.Map<String, Object>> syncWhitelistUsers() {
        int synced = whitelistService.syncWhitelistWithUsers();
        return ResponseEntity.ok(java.util.Map.of(
            "message", "Sincronización completada",
            "registrosSincronizados", synced
        ));
    }

    // ==================== FUNCIONALIDAD 5: Reparar passwords sin BCrypt ====================
    @PostMapping("/fix-passwords")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public ResponseEntity<java.util.Map<String, Object>> fixLegacyPasswords() {
        int fixed = whitelistService.fixLegacyPasswords();
        return ResponseEntity.ok(java.util.Map.of(
            "message", "Reparación de passwords completada",
            "passwordsReparados", fixed
        ));
    }
}

package sudtalent.sudtalentproyecto.controller;


import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import lombok.RequiredArgsConstructor;

import java.util.List;

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
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<WhitelistStatsDTO> getStats() {
        return ResponseEntity.ok(whitelistService.getStats());
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<WhitelistNumberDTO>> getAllNumbers() {
        return ResponseEntity.ok(whitelistService.getAllNumbers());
    }

    // Agregar un número a la whitelist
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<WhitelistNumberDTO> addNumber(
        @RequestBody WhitelistNumberDTO dto) {
        
        String phoneToAdd = dto != null ? dto.getPhone() : null;
        if (phoneToAdd == null || phoneToAdd.isEmpty()) {
            return ResponseEntity.badRequest().build();
        }
        
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(whitelistService.createNumber(phoneToAdd));
    }

    // Actualizar estado por ID
    @PutMapping("/{id}/status")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<WhitelistNumberDTO> updateStatus(
        @PathVariable Long id,
        @RequestParam String status) {
        return ResponseEntity.ok(whitelistService.updateStatus(id, status));
    }

    // Actualizar por teléfono (nuevo endpoint para el frontend)
    @PutMapping("/{phone}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<WhitelistNumberDTO> updateByPhone(
        @PathVariable String phone,
        @RequestBody WhitelistNumberDTO updates) {
        return ResponseEntity.ok(whitelistService.updateByPhone(phone, updates));
    }

    // Eliminar por ID
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteNumber(@PathVariable Long id) {
        whitelistService.deleteNumber(id);
        return ResponseEntity.noContent().build();
    }

    // Eliminar por teléfono (nuevo endpoint para el frontend)
    @DeleteMapping("/phone/{phone}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteByPhone(@PathVariable String phone) {
        whitelistService.deleteByPhone(phone);
        return ResponseEntity.noContent().build();
    }

    // ==================== FUNCIONALIDAD 1: Obtener todos los alumnos con estado en whitelist ====================
    @GetMapping("/students/status")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<StudentWhitelistDTO>> getAllStudentsWithWhitelistStatus() {
        return ResponseEntity.ok(whitelistService.getAllStudentsWithWhitelistStatus());
    }

    // ==================== FUNCIONALIDAD 2: Crear usuario cuando se agrega a whitelist ====================
    @PostMapping("/with-user")
    @PreAuthorize("hasRole('ADMIN')")
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
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<WhitelistReportDTO> getWhitelistReport() {
        return ResponseEntity.ok(whitelistService.getWhitelistReport());
    }
}

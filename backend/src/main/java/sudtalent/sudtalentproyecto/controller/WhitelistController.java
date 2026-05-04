package sudtalent.sudtalentproyecto.controller;


import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import lombok.RequiredArgsConstructor;

import java.util.List;

import sudtalent.sudtalentproyecto.dto.WhitelistNumberDTO;
import sudtalent.sudtalentproyecto.dto.WhitelistStatsDTO;
import sudtalent.sudtalentproyecto.service.WhitelistService;

@RestController
@RequestMapping("/api/whitelist")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class WhitelistController {
    private final WhitelistService whitelistService;

    @GetMapping("/stats")
    public ResponseEntity<WhitelistStatsDTO> getStats() {
        return ResponseEntity.ok(whitelistService.getStats());
    }

    @GetMapping
    public ResponseEntity<List<WhitelistNumberDTO>> getAllNumbers() {
        return ResponseEntity.ok(whitelistService.getAllNumbers());
    }

    @PostMapping
    public ResponseEntity<WhitelistNumberDTO> addNumber(@RequestParam String phone) {
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(whitelistService.createNumber(phone));
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<WhitelistNumberDTO> updateStatus(
        @PathVariable Long id,
        @RequestParam String status) {
        return ResponseEntity.ok(whitelistService.updateStatus(id, status));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteNumber(@PathVariable Long id) {
        whitelistService.deleteNumber(id);
        return ResponseEntity.noContent().build();
    }
}

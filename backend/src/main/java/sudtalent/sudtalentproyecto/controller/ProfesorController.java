package sudtalent.sudtalentproyecto.controller;

import sudtalent.sudtalentproyecto.model.Profesor;
import sudtalent.sudtalentproyecto.service.ProfesorService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;
import java.util.List;

@RestController
@RequestMapping("/api/profesores")
@RequiredArgsConstructor
public class ProfesorController {
    private final ProfesorService profesorService;
    
    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<Profesor>> getAllProfesores() {
        return ResponseEntity.ok(profesorService.getAllProfesores());
    }
    
    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Profesor> getProfesorById(@PathVariable Long id) {
        return ResponseEntity.ok(profesorService.getProfesorById(id));
    }
    
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Profesor> createProfesor(@Valid @RequestBody Profesor profesor) {
        return ResponseEntity.status(HttpStatus.CREATED).body(profesorService.createProfesor(profesor));
    }
    
    @PutMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Profesor> updateProfesor(@PathVariable Long id, @Valid @RequestBody Profesor profesorUpdate) {
        return ResponseEntity.ok(profesorService.updateProfesor(id, profesorUpdate));
    }
    
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteProfesor(@PathVariable Long id) {
        profesorService.deleteProfesor(id);
        return ResponseEntity.noContent().build();
    }
}
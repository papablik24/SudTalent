package sudtalent.sudtalentproyecto.controller;

import sudtalent.sudtalentproyecto.dto.CursoDTO;
import sudtalent.sudtalentproyecto.service.CursoService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/cursos")
@RequiredArgsConstructor
public class CursoController {

    private final CursoService cursoService;

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<CursoDTO>> getAllCursos() {
        return ResponseEntity.ok(cursoService.getAllCursos());
    }

    @GetMapping("/profesor/{profesorId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<CursoDTO>> getCursosByProfesor(@PathVariable UUID profesorId) {
        return ResponseEntity.ok(cursoService.getCursosByProfesor(profesorId));
    }
}

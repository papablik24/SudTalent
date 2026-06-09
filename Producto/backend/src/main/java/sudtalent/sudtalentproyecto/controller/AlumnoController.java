package sudtalent.sudtalentproyecto.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import sudtalent.sudtalentproyecto.repository.AlumnoRepository;

import java.util.List;
import java.util.Map;

/**
 * GET /api/alumnos — lista de alumnos enrolados con datos heredados de users.
 * Solo accesible por administradores.
 */
@RestController
@RequestMapping("/api/alumnos")
public class AlumnoController {

    @Autowired
    private AlumnoRepository alumnoRepository;

    /**
     * Devuelve todos los alumnos enrolados (con fila en tabla alumnos)
     * junto con sus datos relevantes heredados de users.
     */
    @GetMapping
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN')")
    public ResponseEntity<List<Map<String, Object>>> getAlumnosEnrolados() {
        var alumnos = alumnoRepository.findAllActive().stream().map(a -> {
            var map = new java.util.HashMap<String, Object>();
            map.put("usuarioId", a.getId());
            map.put("nombre", a.getName() != null ? a.getName() : "");
            map.put("email", a.getEmail() != null ? a.getEmail() : "");
            map.put("telefono", a.getPhone() != null ? a.getPhone() : "");
            map.put("estado", a.getStatus() != null ? a.getStatus().name() : "PENDING");
            map.put("tipoPerfil", a.getProfileType() != null ? a.getProfileType().name() : "");
            map.put("edad", a.getAge() != null ? a.getAge() : 0);
            map.put("enrolado", a.isOnboarded());
            map.put("activo", a.isActive());
            map.put("fechaNacimiento", a.getFechaNacimiento());
            map.put("profileImageUrl", a.getProfileImageUrl() != null ? a.getProfileImageUrl() : "");
            return (Map<String, Object>) map;
        }).toList();

        return ResponseEntity.ok(alumnos);
    }
}

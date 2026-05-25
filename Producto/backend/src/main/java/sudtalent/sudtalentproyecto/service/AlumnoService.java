package sudtalent.sudtalentproyecto.service;

import sudtalent.sudtalentproyecto.model.Alumno;
import sudtalent.sudtalentproyecto.repository.AlumnoRepository;
import sudtalent.sudtalentproyecto.service.SoftDeleteService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class AlumnoService {
    private final AlumnoRepository alumnoRepository;
    private final SoftDeleteService softDeleteService;
    
    public Alumno createAlumno(Alumno alumno) {
        return alumnoRepository.save(alumno);
    }
    
    public List<Alumno> getAllAlumnos() {
        return alumnoRepository.findAllActive();  // ← Soft delete
    }
    
    // ✅ CAMBIO: UUID
    public Alumno getAlumnoById(UUID id) {
        return alumnoRepository.findByIdActive(id)
                .orElseThrow(() -> new RuntimeException("Alumno no encontrado"));
    }
    
    // ✅ CAMBIO: UUID
    public Alumno updateAlumno(UUID id, Alumno alumnoUpdate) {
        Alumno alumno = getAlumnoById(id);
        if(alumnoUpdate.getFechaNacimiento() != null) {
            alumno.setFechaNacimiento(alumnoUpdate.getFechaNacimiento());
        }
        return alumnoRepository.save(alumno);
    }
    
    // ✅ CAMBIO: Soft delete
    public void deleteAlumno(UUID id) {
        softDeleteService.softDeleteAlumno(id);
    }
}
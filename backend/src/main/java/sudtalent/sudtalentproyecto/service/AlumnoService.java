package sudtalent.sudtalentproyecto.service;

import sudtalent.sudtalentproyecto.model.Alumno;
import sudtalent.sudtalentproyecto.model.User;
import sudtalent.sudtalentproyecto.repository.AlumnoRepository;
import sudtalent.sudtalentproyecto.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class AlumnoService {
    private final AlumnoRepository alumnoRepository;
    private final UserRepository userRepository;
    
    public Alumno createAlumno(Alumno alumno) {
        return alumnoRepository.save(alumno);
    }
    
    public List<Alumno> getAllAlumnos() {
        return alumnoRepository.findAll();
    }
    
    public Alumno getAlumnoById(Long id) {
        return alumnoRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Alumno no encontrado"));
    }
    
    public Alumno getAlumnoByUsuarioId(Long usuarioId) {
    return alumnoRepository.findById(usuarioId)  // ← Cambiar de findByUsuarioId
            .orElseThrow(() -> new RuntimeException("Alumno no encontrado para el usuario especificado"));
}
    
    public Alumno updateAlumno(Long id, Alumno alumnoUpdate) {
        Alumno alumno = getAlumnoById(id);
        if(alumnoUpdate.getFechaNacimiento() != null) {
            alumno.setFechaNacimiento(alumnoUpdate.getFechaNacimiento());
        }
        return alumnoRepository.save(alumno);
    }
    
    public void deleteAlumno(Long id) {
        alumnoRepository.deleteById(id);
    }
}
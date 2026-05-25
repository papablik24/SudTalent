package sudtalent.sudtalentproyecto.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import sudtalent.sudtalentproyecto.model.User;
import sudtalent.sudtalentproyecto.model.Alumno;
import sudtalent.sudtalentproyecto.model.Profesor;
import sudtalent.sudtalentproyecto.model.Convocatoria;
import sudtalent.sudtalentproyecto.model.Postulacion;
import sudtalent.sudtalentproyecto.repository.UserRepository;
import sudtalent.sudtalentproyecto.repository.AlumnoRepository;
import sudtalent.sudtalentproyecto.repository.ProfesorRepository;
import sudtalent.sudtalentproyecto.repository.ConvocatoriaRepository;
import sudtalent.sudtalentproyecto.repository.PostulacionRepository;
import sudtalent.sudtalentproyecto.repository.WhitelistNumberRepository;
import java.time.LocalDateTime;
import java.util.UUID;

@Service
public class SoftDeleteService {
    
    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private AlumnoRepository alumnoRepository;
    
    @Autowired
    private ProfesorRepository profesorRepository;
    
    @Autowired
    private ConvocatoriaRepository convocatoriaRepository;
    
    @Autowired
    private PostulacionRepository postulacionRepository;
    
    @Autowired
    private WhitelistNumberRepository whitelistRepository;
    
    /**
     * Soft delete de usuario - marca como eliminado pero mantiene datos
     */
    public User softDeleteUser(UUID userId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado"));
        
        user.softDelete();
        user.setDeletedAt(LocalDateTime.now());
        user.setActive(false);
        
        return userRepository.save(user);
    }
    
    /**
     * Soft delete de alumno
     */
    public Alumno softDeleteAlumno(UUID alumnoId) {
        Alumno alumno = alumnoRepository.findById(alumnoId)
            .orElseThrow(() -> new IllegalArgumentException("Alumno no encontrado"));
        
        alumno.setDeletedAt(LocalDateTime.now());
        return alumnoRepository.save(alumno);
    }
    
    /**
     * Soft delete de profesor
     */
    public Profesor softDeleteProfesor(UUID profesorId) {
        Profesor profesor = profesorRepository.findById(profesorId)
            .orElseThrow(() -> new IllegalArgumentException("Profesor no encontrado"));
        
        profesor.setDeletedAt(LocalDateTime.now());
        return profesorRepository.save(profesor);
    }
    
    /**
     * Soft delete de convocatoria
     */
    public Convocatoria softDeleteConvocatoria(UUID convocatoriaId) {
        Convocatoria convocatoria = convocatoriaRepository.findById(convocatoriaId)
            .orElseThrow(() -> new IllegalArgumentException("Convocatoria no encontrada"));
        
        convocatoria.setDeletedAt(LocalDateTime.now());
        return convocatoriaRepository.save(convocatoria);
    }
    
    /**
     * Soft delete de postulación
     */
    public Postulacion softDeletePostulacion(UUID postulacionId) {
        Postulacion postulacion = postulacionRepository.findById(postulacionId)
            .orElseThrow(() -> new IllegalArgumentException("Postulación no encontrada"));
        
        postulacion.setDeletedAt(LocalDateTime.now());
        return postulacionRepository.save(postulacion);
    }
    
    /**
     * Restaurar usuario (deshacer soft delete)
     */
    public User restoreUser(UUID userId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado"));
        
        user.setDeletedAt(null);
        if (!user.isActive()) {
            user.setActive(true);
        }
        
        return userRepository.save(user);
    }
}
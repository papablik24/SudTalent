package sudtalent.sudtalentproyecto.service;

import sudtalent.sudtalentproyecto.model.Postulacion;
import sudtalent.sudtalentproyecto.model.Alumno;
import sudtalent.sudtalentproyecto.model.Convocatoria;
import sudtalent.sudtalentproyecto.repository.PostulacionRepository;
import sudtalent.sudtalentproyecto.repository.AlumnoRepository;
import sudtalent.sudtalentproyecto.repository.ConvocatoriaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class PostulacionService {
    private final PostulacionRepository postulacionRepository;
    private final AlumnoRepository alumnoRepository;
    private final ConvocatoriaRepository convocatoriaRepository;
    
    public Postulacion createPostulacion(Postulacion postulacion) {
        return postulacionRepository.save(postulacion);
    }
    
    public List<Postulacion> getAllPostulaciones() {
        return postulacionRepository.findAll();
    }
    
    public Postulacion getPostulacionById(Long id) {
        return postulacionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Postulación no encontrada"));
    }
    
    public List<Postulacion> getPostulacionesByAlumno(Long alumnoId) {
        Alumno alumno = alumnoRepository.findById(alumnoId)
                .orElseThrow(() -> new RuntimeException("Alumno no encontrado"));
        return postulacionRepository.findByAlumno(alumno);
    }
    
    public List<Postulacion> getPostulacionesByConvocatoria(Long convocatoriaId) {
        Convocatoria convocatoria = convocatoriaRepository.findById(convocatoriaId)
                .orElseThrow(() -> new RuntimeException("Convocatoria no encontrada"));
        return postulacionRepository.findByConvocatoria(convocatoria);
    }
    
    public Postulacion updatePostulacion(Long id, Postulacion postulacionUpdate) {
        Postulacion postulacion = getPostulacionById(id);
        if(postulacionUpdate.getFechaPostulacion() != null) {
            postulacion.setFechaPostulacion(postulacionUpdate.getFechaPostulacion());
        }
        return postulacionRepository.save(postulacion);
    }
    
    public void deletePostulacion(Long id) {
        postulacionRepository.deleteById(id);
    }
}
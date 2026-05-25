package sudtalent.sudtalentproyecto.service;

import sudtalent.sudtalentproyecto.model.Postulacion;
import sudtalent.sudtalentproyecto.repository.PostulacionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class PostulacionService {
    private final PostulacionRepository postulacionRepository;
    private final SoftDeleteService softDeleteService;
    
    public Postulacion createPostulacion(Postulacion postulacion) {
        return postulacionRepository.save(postulacion);
    }
    
    public List<Postulacion> getAllPostulaciones() {
        return postulacionRepository.findAllActive();
    }
    
    // ✅ CAMBIO: UUID
    public Postulacion getPostulacionById(UUID id) {
        return postulacionRepository.findByIdActive(id)
                .orElseThrow(() -> new RuntimeException("Postulación no encontrada"));
    }
    
    // ✅ CAMBIO: UUID
    public List<Postulacion> getPostulacionesByAlumno(UUID alumnoId) {
        return postulacionRepository.findByAlumnoId(alumnoId);
    }
    
    // ✅ CAMBIO: UUID
    public List<Postulacion> getPostulacionesByConvocatoria(UUID convocatoriaId) {
        return postulacionRepository.findByConvocatoriaId(convocatoriaId);
    }
    
    // ✅ CAMBIO: UUID
    public Postulacion updatePostulacion(UUID id, Postulacion postulacionUpdate) {
        Postulacion postulacion = getPostulacionById(id);
        if(postulacionUpdate.getFechaPostulacion() != null) {
            postulacion.setFechaPostulacion(postulacionUpdate.getFechaPostulacion());
        }
        return postulacionRepository.save(postulacion);
    }
    
    // ✅ CAMBIO: Soft delete
    public void deletePostulacion(UUID id) {
        softDeleteService.softDeletePostulacion(id);
    }
}
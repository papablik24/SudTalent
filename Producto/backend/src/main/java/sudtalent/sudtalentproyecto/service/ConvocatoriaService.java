package sudtalent.sudtalentproyecto.service;

import sudtalent.sudtalentproyecto.model.Convocatoria;
import sudtalent.sudtalentproyecto.model.Profesor;
import sudtalent.sudtalentproyecto.repository.ConvocatoriaRepository;
import sudtalent.sudtalentproyecto.repository.ProfesorRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class ConvocatoriaService {
    private final ConvocatoriaRepository convocatoriaRepository;
    private final ProfesorRepository profesorRepository;
    
    public Convocatoria createConvocatoria(Convocatoria convocatoria) {
        return convocatoriaRepository.save(convocatoria);
    }
    
    public List<Convocatoria> getAllConvocatorias() {
        return convocatoriaRepository.findAll();
    }
    
    public Convocatoria getConvocatoriaById(UUID id) {
        return convocatoriaRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Convocatoria no encontrada"));
    }
    
    public List<Convocatoria> getConvocatoriasByProfesor(UUID profesorId) {
        return convocatoriaRepository.findByProfesorId(profesorId);
    }
    
    public List<Convocatoria> getConvocatoriasByEstado(String estado) {
        return convocatoriaRepository.findByEstado(estado);
    }
    
    public Convocatoria updateConvocatoria(UUID id, Convocatoria convocatoriaUpdate) {
        Convocatoria convocatoria = getConvocatoriaById(id);
        if(convocatoriaUpdate.getTipo() != null) {
            convocatoria.setTipo(convocatoriaUpdate.getTipo());
        }
        if(convocatoriaUpdate.getEstado() != null) {
            convocatoria.setEstado(convocatoriaUpdate.getEstado());
        }
        if(convocatoriaUpdate.getFecha() != null) {
            convocatoria.setFecha(convocatoriaUpdate.getFecha());
        }
        return convocatoriaRepository.save(convocatoria);
    }
    
    public void deleteConvocatoria(UUID id) {
        convocatoriaRepository.deleteById(id);
    }
}
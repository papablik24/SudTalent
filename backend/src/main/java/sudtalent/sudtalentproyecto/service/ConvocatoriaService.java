package sudtalent.sudtalentproyecto.service;

import sudtalent.sudtalentproyecto.model.Convocatoria;
import sudtalent.sudtalentproyecto.model.Profesor;
import sudtalent.sudtalentproyecto.repository.ConvocatoriaRepository;
import sudtalent.sudtalentproyecto.repository.ProfesorRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

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
    
    public Convocatoria getConvocatoriaById(Long id) {
        return convocatoriaRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Convocatoria no encontrada"));
    }
    
    public List<Convocatoria> getConvocatoriasByProfesor(Long profesorId) {
        Profesor profesor = profesorRepository.findById(profesorId)
                .orElseThrow(() -> new RuntimeException("Profesor no encontrado"));
        return convocatoriaRepository.findByProfesor(profesor);
    }
    
    public List<Convocatoria> getConvocatoriasByEstado(String estado) {
        return convocatoriaRepository.findByEstado(estado);
    }
    
    public Convocatoria updateConvocatoria(Long id, Convocatoria convocatoriaUpdate) {
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
    
    public void deleteConvocatoria(Long id) {
        convocatoriaRepository.deleteById(id);
    }
}
package sudtalent.sudtalentproyecto.service;

import sudtalent.sudtalentproyecto.model.Profesor;
import sudtalent.sudtalentproyecto.repository.ProfesorRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class ProfesorService {
    private final ProfesorRepository profesorRepository;
    
    public Profesor createProfesor(Profesor profesor) {
        return profesorRepository.save(profesor);
    }
    
    public List<Profesor> getAllProfesores() {
        return profesorRepository.findAll();
    }
    
    public Profesor getProfesorById(UUID id) {
        return profesorRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Profesor no encontrado"));
    }
    
    public Profesor getProfesorByUsuarioId(UUID usuarioId) {
        return profesorRepository.findById(usuarioId)
                .orElseThrow(() -> new RuntimeException("Profesor no encontrado para el usuario especificado"));
    }
    
    public Profesor updateProfesor(UUID id, Profesor profesorUpdate) {
        Profesor profesor = getProfesorById(id);
        if(profesorUpdate.getEspecialidad() != null) {
            profesor.setEspecialidad(profesorUpdate.getEspecialidad());
        }
        return profesorRepository.save(profesor);
    }
    
    public void deleteProfesor(UUID id) {
        profesorRepository.deleteById(id);
    }
}
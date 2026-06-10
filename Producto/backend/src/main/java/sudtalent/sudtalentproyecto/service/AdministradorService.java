package sudtalent.sudtalentproyecto.service;

import sudtalent.sudtalentproyecto.model.Administrador;
import sudtalent.sudtalentproyecto.repository.AdministradorRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class AdministradorService {
    private final AdministradorRepository administradorRepository;
    
    public Administrador createAdministrador(Administrador administrador) {
        return administradorRepository.save(administrador);
    }
    
    public List<Administrador> getAllAdministradores() {
        return administradorRepository.findAll();
    }
    
    public Administrador getAdministradorById(UUID id) {
        return administradorRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Administrador no encontrado"));
    }
    

    public Administrador updateAdministrador(UUID id, Administrador administradorUpdate) {
        Administrador administrador = getAdministradorById(id);
        if(administradorUpdate.getName() != null) {
            administrador.setName(administradorUpdate.getName());
        }
        if(administradorUpdate.getEmail() != null) {
            administrador.setEmail(administradorUpdate.getEmail());
        }
        if(administradorUpdate.getPhone() != null) {
            administrador.setPhone(administradorUpdate.getPhone());
        }
        return administradorRepository.save(administrador);
    }
    
    public void deleteAdministrador(UUID id) {
        administradorRepository.deleteById(id);
    }
}
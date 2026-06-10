package sudtalent.sudtalentproyecto.repository;

import sudtalent.sudtalentproyecto.model.Administrador;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;

public interface AdministradorRepository extends JpaRepository<Administrador, UUID>{
    // findById ya está heredado de JpaRepository
}
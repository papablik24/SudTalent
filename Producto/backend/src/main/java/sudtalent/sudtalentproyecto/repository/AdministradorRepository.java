package sudtalent.sudtalentproyecto.repository;

import sudtalent.sudtalentproyecto.model.Administrador;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AdministradorRepository extends JpaRepository<Administrador, Long>{
    // findById ya está heredado de JpaRepository
}
package sudtalent.sudtalentproyecto.repository;

import sudtalent.sudtalentproyecto.model.Profile;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProfileRepository extends JpaRepository<Profile, Long>{
    Profile findByDescripcion(String descripcion);
}
package sudtalent.sudtalentproyecto.repository;

import java.util.Optional;

import sudtalent.sudtalentproyecto.model.User;  // ✅ CORRECTA
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<User, Long>{
    Optional<User> findByEmail(String email);
    boolean existsByEmail(String email);
    
}

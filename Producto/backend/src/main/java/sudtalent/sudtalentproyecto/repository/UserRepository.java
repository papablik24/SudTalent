package sudtalent.sudtalentproyecto.repository;

import java.util.Optional;

import sudtalent.sudtalentproyecto.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<User, Long>{
    Optional<User> findByEmail(String email);
    Optional<User> findByPhone(String phone);
    Optional<User> findByNameAndEmail(String name, String email);
    boolean existsByEmail(String email);
    boolean existsByPhone(String phone);
}

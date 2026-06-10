package sudtalent.sudtalentproyecto.repository;

import java.util.Optional;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import sudtalent.sudtalentproyecto.model.User;

@Repository
public interface UserRepository extends SoftDeleteRepository<User> {
    
    @Query("SELECT u FROM User u WHERE u.email = ?1 AND u.deletedAt IS NULL")
    Optional<User> findByEmailActive(String email);
    
    @Query("SELECT u FROM User u WHERE u.phone = ?1 AND u.deletedAt IS NULL")
    Optional<User> findByPhoneActive(String phone);
    
    boolean existsByEmail(String email);
}
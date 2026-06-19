package sudtalent.sudtalentproyecto.repository;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.Query;
import sudtalent.sudtalentproyecto.model.User;


public interface UserRepository extends SoftDeleteRepository<User> {
    
    @Query("SELECT u FROM User u WHERE u.email = ?1 AND u.deletedAt IS NULL")
    Optional<User> findByEmailActive(String email);

    @Query("SELECT u FROM User u WHERE u.email = ?1")
    Optional<User> findByEmail(String email);
    
    @Query("SELECT u FROM User u WHERE u.phone = ?1 AND u.deletedAt IS NULL")
    Optional<User> findByPhoneActive(String phone);
    
    boolean existsByEmail(String email);

    List<User> findByRoleAndActiveTrueAndDeletedAtIsNullAndStatusNot(User.Role role, User.ProfileStatus status);

    List<User> findByRoleAndDeletedAtIsNull(User.Role role);
}
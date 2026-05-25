package sudtalent.sudtalentproyecto.specification;

import org.springframework.data.jpa.domain.Specification;
import sudtalent.sudtalentproyecto.model.User;


/**
 * Especificaciones JPA para consultas complejas de User.
 * Permitir filtrado dinámico respetando soft delete (deleted_at IS NULL)
 * 
 * Uso en Repository:
 * userRepository.findAll(
 *   Specification.where(UserSpecifications.isNotDeleted())
 *     .and(UserSpecifications.byRole(User.Role.ALUMNO))
 * );
 */
public class UserSpecifications {
    
    /**
     * Usuarios no eliminados (deleted_at IS NULL)
     */
    public static Specification<User> isNotDeleted() {
        return (root, query, criteriaBuilder) -> 
            criteriaBuilder.isNull(root.get("deletedAt"));
    }
    
    /**
     * Usuarios activos (active = true AND deleted_at IS NULL)
     */
    public static Specification<User> isActive() {
        return (root, query, criteriaBuilder) -> 
            criteriaBuilder.and(
                criteriaBuilder.equal(root.get("active"), true),
                criteriaBuilder.isNull(root.get("deletedAt"))
            );
    }
    
    /**
     * Usuarios inactivos (active = false AND deleted_at IS NULL)
     */
    public static Specification<User> isInactive() {
        return (root, query, criteriaBuilder) -> 
            criteriaBuilder.and(
                criteriaBuilder.equal(root.get("active"), false),
                criteriaBuilder.isNull(root.get("deletedAt"))
            );
    }
    
    /**
     * Por email exacto
     */
    public static Specification<User> byEmail(String email) {
        return (root, query, criteriaBuilder) -> 
            criteriaBuilder.equal(root.get("email"), email);
    }
    
    /**
     * Por email (búsqueda contiene)
     */
    public static Specification<User> byEmailContains(String email) {
        return (root, query, criteriaBuilder) -> 
            criteriaBuilder.like(
                criteriaBuilder.lower(root.get("email")), 
                "%" + email.toLowerCase() + "%"
            );
    }
    
    /**
     * Por teléfono exacto
     */
    public static Specification<User> byPhone(String phone) {
        return (root, query, criteriaBuilder) -> 
            criteriaBuilder.equal(root.get("phone"), phone);
    }
    
    /**
     * Por nombre (búsqueda contiene)
     */
    public static Specification<User> byNameContains(String name) {
        return (root, query, criteriaBuilder) -> 
            criteriaBuilder.like(
                criteriaBuilder.lower(root.get("name")), 
                "%" + name.toLowerCase() + "%"
            );
    }
    
    /**
     * Por rol específico
     */
    public static Specification<User> byRole(User.Role role) {
        return (root, query, criteriaBuilder) -> 
            criteriaBuilder.equal(root.get("role"), role);
    }
    
    /**
     * Alumnos activos (role = ALUMNO AND active = true AND deleted_at IS NULL)
     */
    public static Specification<User> activeAlumnos() {
        return Specification.where(isActive())
            .and(byRole(User.Role.ALUMNO));
    }
    
    /**
     * Profesores activos
     */
    public static Specification<User> activeProfesores() {
        return Specification.where(isActive())
            .and(byRole(User.Role.PROFESOR));
    }
    
    /**
     * Administradores activos
     */
    public static Specification<User> activeAdmins() {
        return Specification.where(isActive())
            .and(byRole(User.Role.ADMIN));
    }
    
    /**
     * Usuarios no onboarded (que deben completar perfil)
     */
    public static Specification<User> notOnboarded() {
        return (root, query, criteriaBuilder) -> 
            criteriaBuilder.and(
                criteriaBuilder.equal(root.get("onboarded"), false),
                criteriaBuilder.isNull(root.get("deletedAt"))
            );
    }
    
    /**
     * Por estado (PENDING, APPROVED, INACTIVE)
     */
    public static Specification<User> byStatus(User.ProfileStatus status) {
        return (root, query, criteriaBuilder) -> 
            criteriaBuilder.equal(root.get("status"), status);
    }
    
    /**
     * Pendientes de aprobación (status = PENDING)
     */
    public static Specification<User> pendingApproval() {
        return Specification.where(isNotDeleted())
            .and(byStatus(User.ProfileStatus.PENDING));
    }
    
    /**
     * Ejemplo combinado: Alumnos activos no onboarded
     * userRepository.findAll(
     *   Specification.where(UserSpecifications.activeAlumnos())
     *     .and(UserSpecifications.notOnboarded())
     * );
     */
}

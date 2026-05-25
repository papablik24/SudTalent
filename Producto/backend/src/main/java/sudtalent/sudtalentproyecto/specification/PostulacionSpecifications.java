package sudtalent.sudtalentproyecto.specification;

import org.springframework.data.jpa.domain.Specification;
import sudtalent.sudtalentproyecto.model.Postulacion;
import java.time.LocalDate;
import java.util.UUID;

/**
 * Especificaciones JPA para consultas complejas de Postulacion.
 * Respeta soft delete (deleted_at IS NULL)
 * 
 * Uso:
 * postulacionRepository.findAll(
 *   Specification.where(PostulacionSpecifications.isNotDeleted())
 *     .and(PostulacionSpecifications.byAlumnoId(alumnoId))
 *     .and(PostulacionSpecifications.afterDate(LocalDate.now().minusMonths(1)))
 * );
 */
public class PostulacionSpecifications {
    
    /**
     * Postulaciones no eliminadas
     */
    public static Specification<Postulacion> isNotDeleted() {
        return (root, query, criteriaBuilder) -> 
            criteriaBuilder.isNull(root.get("deletedAt"));
    }
    
    /**
     * Por alumno específico
     */
    public static Specification<Postulacion> byAlumnoId(UUID alumnoId) {
        return (root, query, criteriaBuilder) -> 
            criteriaBuilder.equal(root.get("alumno").get("usuarioId"), alumnoId);
    }
    
    /**
     * Por convocatoria específica
     */
    public static Specification<Postulacion> byConvocatoriaId(UUID convocatoriaId) {
        return (root, query, criteriaBuilder) -> 
            criteriaBuilder.equal(root.get("convocatoria").get("id"), convocatoriaId);
    }
    
    /**
     * Postulaciones después de fecha específica
     */
    public static Specification<Postulacion> afterDate(LocalDate date) {
        return (root, query, criteriaBuilder) -> 
            criteriaBuilder.greaterThanOrEqualTo(root.get("fechaPostulacion"), date);
    }
    
    /**
     * Postulaciones antes de fecha específica
     */
    public static Specification<Postulacion> beforeDate(LocalDate date) {
        return (root, query, criteriaBuilder) -> 
            criteriaBuilder.lessThanOrEqualTo(root.get("fechaPostulacion"), date);
    }
    
    /**
     * Postulaciones en rango de fechas
     */
    public static Specification<Postulacion> betweenDates(LocalDate startDate, LocalDate endDate) {
        return (root, query, criteriaBuilder) -> 
            criteriaBuilder.between(root.get("fechaPostulacion"), startDate, endDate);
    }
    
    /**
     * Postulaciones del mes actual
     */
    public static Specification<Postulacion> thisMonth() {
        LocalDate today = LocalDate.now();
        LocalDate startOfMonth = today.withDayOfMonth(1);
        LocalDate endOfMonth = today.withDayOfMonth(today.lengthOfMonth());
        
        return betweenDates(startOfMonth, endOfMonth);
    }
    
    /**
     * Postulaciones recientes (últimos N días)
     */
    public static Specification<Postulacion> recentDays(int days) {
        return afterDate(LocalDate.now().minusDays(days));
    }
}
